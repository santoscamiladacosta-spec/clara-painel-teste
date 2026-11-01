-- Clara · Execuções de processo e Diário automático
-- Uma execução é um evento do dia a dia, não um registro editável: por isso tem tabela
-- própria e não passa pelo ciclo propor/confirmar. Quem executa marca os passos e pronto.
-- Ao concluir, o Diário se escreve sozinho e a concentração de conhecimento cai com evidência.

-- ───────────────────────── tabela ─────────────────────────

create table if not exists public.clara_execucoes (
  id           uuid primary key default gen_random_uuid(),
  empresa_id   uuid not null references public.clara_empresas(id) on delete cascade,
  processo_id  text not null,
  pessoa_id    text,
  usuario_id   uuid not null references auth.users(id),
  passos       jsonb not null default '{}'::jsonb,   -- {"0":true,"1":false,...}
  total        smallint not null default 0,
  concluidos   smallint not null default 0,
  status       text not null default 'em_andamento',
  observacao   text,
  iniciada_em  timestamptz not null default now(),
  concluida_em timestamptz
);

do $$ begin
  alter table public.clara_execucoes
    add constraint clara_execucoes_status_check
    check (status in ('em_andamento','concluida','abandonada'));
exception when duplicate_object then null; end $$;

create index if not exists clara_execucoes_emp_proc
  on public.clara_execucoes (empresa_id, processo_id, status);

create unique index if not exists clara_execucoes_uma_aberta
  on public.clara_execucoes (empresa_id, usuario_id, processo_id)
  where status = 'em_andamento';

alter table public.clara_execucoes enable row level security;

-- Gestão enxerga a operação inteira; quem executa enxerga o que é seu.
drop policy if exists clara_execucoes_ver on public.clara_execucoes;
create policy clara_execucoes_ver on public.clara_execucoes for select to authenticated
  using (clara_private.membro(empresa_id)
         and (clara_private.gestao(empresa_id) or usuario_id = auth.uid()));

drop policy if exists clara_execucoes_criar on public.clara_execucoes;
create policy clara_execucoes_criar on public.clara_execucoes for insert to authenticated
  with check (clara_private.membro(empresa_id) and usuario_id = auth.uid());

-- Só a própria pessoa mexe, e só enquanto a execução está aberta: o histórico não se reescreve.
drop policy if exists clara_execucoes_editar on public.clara_execucoes;
create policy clara_execucoes_editar on public.clara_execucoes for update to authenticated
  using (clara_private.membro(empresa_id) and usuario_id = auth.uid() and status = 'em_andamento')
  with check (usuario_id = auth.uid());

grant select, insert, update on public.clara_execucoes to authenticated;

-- ───────────────────────── apoio ─────────────────────────

create or replace function clara_private.nome_processo(e uuid, proc text)
returns text language sql stable security definer set search_path to '' as $$
  select coalesce(r.dados->>'nome', proc)
  from public.clara_registros r
  where r.empresa_id = e and r.colecao = 'processos' and r.id = proc;
$$;

create or replace function clara_private.nome_pessoa(e uuid, p text)
returns text language sql stable security definer set search_path to '' as $$
  select coalesce(r.dados->>'nome', 'Alguém da equipe')
  from public.clara_registros r
  where r.empresa_id = e and r.colecao = 'pessoas' and r.id = p;
$$;

-- Escreve no Diário sem duplicar: a chave de origem é o que garante uma linha por fato.
create or replace function clara_private.diario_automatico(
  e uuid, chave text, topicos text[], assunto text, resumo text, autor uuid, fonte jsonb
) returns void language sql security definer set search_path to '' as $$
  insert into public.clara_diario
    (empresa_id, chave_origem, topicos, assunto, resumo, fonte, autor, area_vinculada, ocorrido_em)
  values (e, chave, topicos, assunto, resumo, fonte, autor, 'processos', now())
  on conflict do nothing;
$$;

-- ───────────────────────── ciclo da execução ─────────────────────────

create or replace function clara_private.execucao_abrir(e uuid, proc text, tot int)
returns jsonb language plpgsql security definer set search_path to '' as $$
declare r public.clara_execucoes;
begin
  if not clara_private.membro(e) then raise exception 'ACESSO_NEGADO'; end if;

  select * into r from public.clara_execucoes
   where empresa_id = e and usuario_id = auth.uid() and processo_id = proc and status = 'em_andamento'
   limit 1;

  if found then
    if tot is not null and tot <> r.total then
      update public.clara_execucoes set total = tot where id = r.id returning * into r;
    end if;
    return to_jsonb(r);
  end if;

  insert into public.clara_execucoes (empresa_id, processo_id, pessoa_id, usuario_id, total)
  values (e, proc, clara_private.pessoa_do_usuario(e, auth.uid()), auth.uid(), coalesce(tot, 0))
  returning * into r;

  return to_jsonb(r);
end $$;

create or replace function clara_private.execucao_passo(e uuid, ex uuid, idx int, feito boolean)
returns jsonb language plpgsql security definer set search_path to '' as $$
declare r public.clara_execucoes;
begin
  if not clara_private.membro(e) then raise exception 'ACESSO_NEGADO'; end if;

  select * into r from public.clara_execucoes where id = ex and empresa_id = e;
  if not found then raise exception 'EXECUCAO_NAO_ENCONTRADA'; end if;
  if r.usuario_id <> auth.uid() then raise exception 'EXECUCAO_DE_OUTRA_PESSOA'; end if;
  if r.status <> 'em_andamento' then raise exception 'EXECUCAO_JA_FECHADA'; end if;

  update public.clara_execucoes
     set passos = jsonb_set(passos, array[idx::text], to_jsonb(coalesce(feito, false)), true)
   where id = ex
  returning * into r;

  update public.clara_execucoes
     set concluidos = (select count(*) from jsonb_each(r.passos) kv where kv.value = 'true'::jsonb)
   where id = ex
  returning * into r;

  return to_jsonb(r);
end $$;

create or replace function clara_private.execucao_concluir(e uuid, ex uuid, obs text)
returns jsonb language plpgsql security definer set search_path to '' as $$
declare r public.clara_execucoes;
begin
  if not clara_private.membro(e) then raise exception 'ACESSO_NEGADO'; end if;

  select * into r from public.clara_execucoes where id = ex and empresa_id = e;
  if not found then raise exception 'EXECUCAO_NAO_ENCONTRADA'; end if;
  if r.usuario_id <> auth.uid() then raise exception 'EXECUCAO_DE_OUTRA_PESSOA'; end if;
  if r.status <> 'em_andamento' then return to_jsonb(r); end if;

  update public.clara_execucoes
     set status = 'concluida', concluida_em = now(), observacao = nullif(btrim(coalesce(obs, '')), '')
   where id = ex
  returning * into r;

  return to_jsonb(r);
end $$;

-- ───────────────────────── o que se escreve sozinho ─────────────────────────

create or replace function clara_private.trg_execucao_concluida()
returns trigger language plpgsql security definer set search_path to '' as $$
declare
  n_pessoas int;
  primeira  boolean;
  proc_nome text;
  quem      text;
  f         public.clara_dependencia_fatores;
  novo_k    smallint;
begin
  if new.status <> 'concluida' or coalesce(old.status, '') = 'concluida' then return new; end if;

  proc_nome := clara_private.nome_processo(new.empresa_id, new.processo_id);
  quem := case when new.pessoa_id is null then 'Alguém da equipe'
               else clara_private.nome_pessoa(new.empresa_id, new.pessoa_id) end;

  select count(*) = 0 into primeira
    from public.clara_execucoes x
   where x.empresa_id = new.empresa_id and x.processo_id = new.processo_id
     and x.status = 'concluida' and x.usuario_id = new.usuario_id and x.id <> new.id;

  select count(distinct x.usuario_id) into n_pessoas
    from public.clara_execucoes x
   where x.empresa_id = new.empresa_id and x.processo_id = new.processo_id and x.status = 'concluida';

  if primeira then
    perform clara_private.diario_automatico(
      new.empresa_id,
      'exec-primeira-' || new.processo_id || '-' || new.usuario_id::text,
      array['Avanços e conquistas'],
      quem || ' executou o processo ' || proc_nome || ' pela primeira vez',
      'Registrado pelo passo a passo do Manual Vivo. Agora ' || n_pessoas::text ||
        case when n_pessoas = 1 then ' pessoa sabe' else ' pessoas sabem' end ||
        ' executar este processo.',
      new.usuario_id,
      jsonb_build_object('origem', 'execucao', 'execucao_id', new.id, 'processo_id', new.processo_id)
    );
  end if;

  -- A concentração de conhecimento só cai, e só com execução concluída como prova.
  if n_pessoas >= 2 then
    select * into f from public.clara_dependencia_fatores
     where empresa_id = new.empresa_id and processo_id = new.processo_id;

    if found and f.k is not null then
      novo_k := case when n_pessoas >= 3 then 0 else least(f.k, 1) end;
      if novo_k < f.k then
        update public.clara_dependencia_fatores
           set k = novo_k,
               justificativa = coalesce(justificativa, '') ||
                 ' · Automático: ' || n_pessoas::text || ' pessoas já concluíram este processo pelo Manual Vivo.',
               atualizado_em = now()
         where empresa_id = new.empresa_id and processo_id = new.processo_id;

        perform clara_private.diario_automatico(
          new.empresa_id,
          'dep-k-' || new.processo_id || '-' || n_pessoas::text,
          array['Mudanças operacionais'],
          'A dependência do processo ' || proc_nome || ' diminuiu',
          n_pessoas::text || ' pessoas já executaram este processo, então ele deixou de depender de uma só.',
          new.usuario_id,
          jsonb_build_object('origem', 'execucao', 'processo_id', new.processo_id, 'pessoas', n_pessoas)
        );
      end if;
    end if;
  end if;

  return new;
end $$;

drop trigger if exists clara_execucao_concluida on public.clara_execucoes;
create trigger clara_execucao_concluida
  after update on public.clara_execucoes
  for each row execute function clara_private.trg_execucao_concluida();

-- Publicação no Manual Vivo também entra no Diário sem ninguém escrever.
create or replace function clara_private.trg_processo_publicado()
returns trigger language plpgsql security definer set search_path to '' as $$
begin
  if new.colecao <> 'processos' then return new; end if;
  if coalesce(new.dados->>'status_doc', '') <> 'publicado' then return new; end if;
  if tg_op = 'UPDATE' and coalesce(old.dados->>'status_doc', '') = 'publicado' then return new; end if;

  perform clara_private.diario_automatico(
    new.empresa_id,
    'proc-publicado-' || new.id,
    array['Mudanças operacionais'],
    'Processo publicado no Manual Vivo: ' || coalesce(new.dados->>'nome', new.id),
    'A equipe passa a seguir o passo a passo pelo painel, e a documentação deste processo deixa de ser uma lacuna.',
    new.atualizado_por,
    jsonb_build_object('origem', 'publicacao', 'processo_id', new.id)
  );
  return new;
end $$;

drop trigger if exists clara_processo_publicado on public.clara_registros;
create trigger clara_processo_publicado
  after insert or update on public.clara_registros
  for each row execute function clara_private.trg_processo_publicado();

-- ───────────────────────── leitura ─────────────────────────

-- Um resumo por processo: quantas pessoas já executaram (o que sustenta a queda da nota),
-- quando foi a última vez e se a pessoa tem uma execução aberta agora.
create or replace function clara_private.execucoes_resumo(e uuid)
returns jsonb language sql stable security definer set search_path to '' as $$
  select coalesce(jsonb_object_agg(t.processo_id, t.info), '{}'::jsonb)
  from (
    select x.processo_id,
           jsonb_build_object(
             'pessoas', count(distinct x.usuario_id) filter (where x.status = 'concluida'),
             'concluidas', count(*) filter (where x.status = 'concluida'),
             'ultima', max(x.concluida_em),
             'minha_aberta', (
               select to_jsonb(y) from public.clara_execucoes y
                where y.empresa_id = e and y.processo_id = x.processo_id
                  and y.usuario_id = auth.uid() and y.status = 'em_andamento'
                limit 1)
           ) info
      from public.clara_execucoes x
     where x.empresa_id = e
     group by x.processo_id
  ) t
  where clara_private.membro(e);
$$;

-- ───────────────────────── portas públicas ─────────────────────────

create or replace function public.clara_execucao_abrir(p_empresa uuid, p_processo text, p_total int default 0)
returns jsonb language sql security invoker set search_path to '' as $$
  select clara_private.execucao_abrir(p_empresa, p_processo, p_total);
$$;

create or replace function public.clara_execucao_passo(p_empresa uuid, p_execucao uuid, p_indice int, p_feito boolean)
returns jsonb language sql security invoker set search_path to '' as $$
  select clara_private.execucao_passo(p_empresa, p_execucao, p_indice, p_feito);
$$;

create or replace function public.clara_execucao_concluir(p_empresa uuid, p_execucao uuid, p_observacao text default null)
returns jsonb language sql security invoker set search_path to '' as $$
  select clara_private.execucao_concluir(p_empresa, p_execucao, p_observacao);
$$;

create or replace function public.clara_execucoes(p_empresa uuid)
returns jsonb language sql stable security invoker set search_path to '' as $$
  select clara_private.execucoes_resumo(p_empresa);
$$;

grant execute on function
  public.clara_execucao_abrir(uuid, text, int),
  public.clara_execucao_passo(uuid, uuid, int, boolean),
  public.clara_execucao_concluir(uuid, uuid, text),
  public.clara_execucoes(uuid)
to authenticated;
