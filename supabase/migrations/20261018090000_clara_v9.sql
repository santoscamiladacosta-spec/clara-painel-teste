-- Additive V9 storage. Existing tables, functions and policies are unchanged.
begin;
create table public.clara_v9_modulos (
 empresa_id uuid not null references public.clara_empresas(id),
 area text not null check(area in ('hoje','processos','indicadores','rotinas','diario','crescimento','clara','configuracoes')),
 conteudo jsonb not null default '{}'::jsonb check(jsonb_typeof(conteudo)='object'),
 revisao bigint not null default 0,
 atualizado_por uuid not null,
 atualizado_em timestamptz not null default now(),
 primary key(empresa_id,area)
);
create table public.clara_v9_auditoria (
 id bigint generated always as identity primary key,
 empresa_id uuid not null references public.clara_empresas(id),
 area text not null,
 revisao bigint not null,
 antes jsonb not null,
 depois jsonb not null,
 autor uuid not null,
 criado_em timestamptz not null default now()
);
create table public.clara_v9_importacoes (
 empresa_id uuid not null references public.clara_empresas(id),
 identificador text not null,
 documento jsonb not null,
 selecao jsonb not null,
 autor uuid not null,
 criado_em timestamptz not null default now(),
 primary key(empresa_id,identificador)
);
create function public.clara_v9_permitido(p_empresa uuid,p_area text,p_acao text)
returns boolean language sql stable security definer set search_path='' as $$
 select coalesce((select case
 when m.perfil='proprietario' then true
 when p_acao not in ('ver','criar','editar','excluir') then false
 when jsonb_typeof(m.permissoes->p_area)='boolean' then
   (m.permissoes->p_area='true'::jsonb and (p_acao='ver' or m.perfil='gestor'))
 when jsonb_typeof(m.permissoes->p_area)='object' then
   m.permissoes->p_area->'ver'='true'::jsonb and m.permissoes->p_area->p_acao='true'::jsonb
 else false end from public.clara_membros m
 where m.empresa_id=p_empresa and m.usuario_id=auth.uid() and m.ativo),false)
$$;
alter table public.clara_v9_modulos enable row level security;
alter table public.clara_v9_auditoria enable row level security;
alter table public.clara_v9_importacoes enable row level security;
create policy v9_modulos_ler on public.clara_v9_modulos for select to authenticated
 using(public.clara_v9_permitido(empresa_id,area,'ver'));
create policy v9_auditoria_ler on public.clara_v9_auditoria for select to authenticated
 using(public.clara_perfil_na_empresa(empresa_id)='proprietario');
create policy v9_importacoes_ler on public.clara_v9_importacoes for select to authenticated
 using(public.clara_perfil_na_empresa(empresa_id)='proprietario');
revoke all on public.clara_v9_modulos,public.clara_v9_auditoria,public.clara_v9_importacoes from anon,authenticated;
grant select on public.clara_v9_modulos,public.clara_v9_auditoria,public.clara_v9_importacoes to authenticated;

-- Recursive structural diff: changing an existing item requires editar;
-- adding/removing an item requires criar/excluir respectively.
create function public.clara_v9_acoes(p_antes jsonb,p_depois jsonb)
returns text[] language plpgsql immutable set search_path='' as $$
declare k text; a text[]:='{}'; child text[]; x jsonb; y jsonb; identity_key text;
begin
 if p_antes is not distinct from p_depois then return a; end if;
 if p_antes is null then return array['criar']; end if;
 if p_depois is null then return array['excluir']; end if;
 if jsonb_typeof(p_antes)='object' and jsonb_typeof(p_depois)='object' then
  for k in select jsonb_object_keys(p_antes||p_depois) loop
   a:=a||public.clara_v9_acoes(p_antes->k,p_depois->k);
  end loop;
 elsif jsonb_typeof(p_antes)='array' and jsonb_typeof(p_depois)='array' then
  -- Arrays of identifiable records preserve action distinctions.
  if not exists(select 1 from jsonb_array_elements(p_antes||p_depois) v where jsonb_typeof(v)<>'object' or not v ? 'id') then
   for x in select value from jsonb_array_elements(p_antes) loop
    select value into y from jsonb_array_elements(p_depois) where value->'id'=x->'id';
    a:=a||public.clara_v9_acoes(x,y);
   end loop;
   for y in select value from jsonb_array_elements(p_depois) loop
    if not exists(select 1 from jsonb_array_elements(p_antes) where value->'id'=y->'id') then a:=a||array['criar']; end if;
   end loop;
  else a:=a||array['editar']; end if;
 else a:=a||array['editar']; end if;
 return array(select distinct unnest(a));
end $$;

create function public.clara_v9_salvar(p_empresa uuid,p_mudancas jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare m jsonb; old public.clara_v9_modulos; ar text; act text; result jsonb:='{}'; profile text;
begin
 profile:=public.clara_perfil_na_empresa(p_empresa);
 if auth.uid() is null or profile is null then raise exception 'Acesso negado' using errcode='42501'; end if;
 if jsonb_typeof(p_mudancas)<>'array' or jsonb_array_length(p_mudancas) not between 1 and 8 or octet_length(p_mudancas::text)>2000000 then
  raise exception 'Alterações inválidas' using errcode='22023'; end if;
 -- Serialize company writes and enforce optimistic revision checks.
 perform pg_advisory_xact_lock(hashtextextended(p_empresa::text,9));
 for m in select value from jsonb_array_elements(p_mudancas) loop
  ar:=m->>'area';
  if ar is null or ar not in ('hoje','processos','indicadores','rotinas','diario','crescimento','clara','configuracoes')
   or jsonb_typeof(m->'conteudo') is distinct from 'object' then raise exception 'Módulo inválido' using errcode='22023'; end if;
  if not public.clara_v9_permitido(p_empresa,ar,'ver') then raise exception 'Módulo não autorizado' using errcode='42501'; end if;
  select * into old from public.clara_v9_modulos where empresa_id=p_empresa and area=ar for update;
  if coalesce(old.revisao,0) is distinct from (m->>'revisao')::bigint then raise exception 'Dados alterados por outra pessoa. Recarregue antes de salvar.' using errcode='40001'; end if;
  foreach act in array public.clara_v9_acoes(coalesce(old.conteudo,'{}'::jsonb),m->'conteudo') loop
   if not public.clara_v9_permitido(p_empresa,ar,act) then raise exception 'Ação % não autorizada em %',act,ar using errcode='42501'; end if;
  end loop;
  if ar='processos' and profile not in ('proprietario','gestor') and
   (coalesce(old.conteudo->'entidades'->'processos','[]') is distinct from m->'conteudo'->'entidades'->'processos'
    or coalesce(old.conteudo->'v3'->'propostasProcessos','[]') is distinct from coalesce(m->'conteudo'->'v3'->'propostasProcessos','[]')) then
   raise exception 'Aprovação restrita à gestão' using errcode='42501'; end if;
  insert into public.clara_v9_modulos(empresa_id,area,conteudo,revisao,atualizado_por)
   values(p_empresa,ar,m->'conteudo',coalesce(old.revisao,0)+1,auth.uid())
   on conflict(empresa_id,area) do update set conteudo=excluded.conteudo,revisao=excluded.revisao,atualizado_por=excluded.atualizado_por,atualizado_em=now();
  insert into public.clara_v9_auditoria(empresa_id,area,revisao,antes,depois,autor)
   values(p_empresa,ar,coalesce(old.revisao,0)+1,coalesce(old.conteudo,'{}'),m->'conteudo',auth.uid());
  result:=result||jsonb_build_object(ar,coalesce(old.revisao,0)+1);
 end loop;
 return result;
end $$;

-- JSON preview is client-side; selected changes are validated and committed atomically here.
create function public.clara_v9_importar(p_empresa uuid,p_documento jsonb,p_selecao integer[])
returns jsonb language plpgsql security definer set search_path='' as $$
declare a jsonb; idx integer; ar text; state jsonb; v jsonb; changes jsonb:='[]'; r public.clara_v9_modulos;
 docid text; result jsonb; item jsonb; tasks jsonb; diary jsonb;
begin
 if auth.uid() is null or public.clara_perfil_na_empresa(p_empresa) is null then raise exception 'Acesso negado' using errcode='42501'; end if;
 docid:=p_documento->>'id';
 if p_documento->>'formato' is distinct from 'CLARA_ATUALIZACAO' or p_documento->>'versao' is distinct from '1.0'
 or length(coalesce(docid,'')) not between 1 and 120 or octet_length(p_documento::text)>250000
 or jsonb_typeof(p_documento->'alteracoes') is distinct from 'array' then raise exception 'Documento inválido' using errcode='22023'; end if;
 if (p_documento->>'empresa_nome') is distinct from (select nome from public.clara_empresas where id=p_empresa)
 or (p_documento ? 'empresa_id' and p_documento->>'empresa_id'<>p_empresa::text) then raise exception 'Empresa divergente' using errcode='22023'; end if;
 if cardinality(p_selecao) is null or cardinality(p_selecao) not between 1 and 100 or jsonb_array_length(p_documento->'alteracoes') not between 1 and 100 then raise exception 'Seleção inválida' using errcode='22023'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_empresa::text,9));
 if exists(select 1 from public.clara_v9_importacoes where empresa_id=p_empresa and identificador=docid) then raise exception 'Arquivo já importado' using errcode='23505'; end if;
 foreach idx in array p_selecao loop
  if idx is null or idx<0 or idx>=jsonb_array_length(p_documento->'alteracoes') then raise exception 'Índice inválido' using errcode='22023'; end if;
 end loop;
 for a in select value from jsonb_array_elements(p_documento->'alteracoes') loop
  if not ((a->>'aba'='diario' and a->>'acao'='adicionar_registro') or (a->>'aba'='rotinas' and a->>'acao'='criar_tarefa'))
    or jsonb_typeof(a->'titulo') is distinct from 'string' or length(a->>'titulo') not between 1 and 180
    or jsonb_typeof(a->'resumo') is distinct from 'string' or length(a->>'resumo')>10000 then raise exception 'Ação inválida' using errcode='22023'; end if;
  if a->>'aba'='rotinas' then
   if coalesce(a->>'data','') !~ '^\d{4}-\d{2}-\d{2}$' then raise exception 'Prazo inválido' using errcode='22023'; end if;
   perform (a->>'data')::date;
  end if;
 end loop;
 foreach ar in array array['diario','rotinas'] loop
  if not exists(select 1 from unnest(p_selecao) i where p_documento->'alteracoes'->i->>'aba'=ar) then continue; end if;
  if not public.clara_v9_permitido(p_empresa,ar,'criar') then raise exception 'Importação sem permissão' using errcode='42501'; end if;
  select * into r from public.clara_v9_modulos where empresa_id=p_empresa and area=ar;
  state:=coalesce(r.conteudo,'{}'); v:=coalesce(state->'v3','{}');
  tasks:=coalesce(v->'claraTasks','[]'); diary:=coalesce(v->'claraHistory','[]');
  for idx in select distinct unnest(p_selecao) loop
   a:=p_documento->'alteracoes'->idx;
   if a->>'aba'<>ar then continue; end if;
   if ar='rotinas' then
    item:=jsonb_build_object('id',gen_random_uuid()::text,'titulo',a->>'titulo','data',a->>'data','responsavel',coalesce(a->>'responsavel',''),'ok',false,'historico',jsonb_build_array(jsonb_build_object('em',now(),'autor',auth.uid(),'texto',a->>'resumo','tipo','criacao')));
    tasks:=tasks||jsonb_build_array(item);
   else
    item:=jsonb_build_object('id',gen_random_uuid()::text,'data',current_date,'assunto',a->>'titulo','resumo',a->>'resumo','pendencias',case when jsonb_typeof(a->'pendencias')='array' then a->'pendencias' else '[]'::jsonb end,'origem','Clara','playbook',false);
    diary:=jsonb_build_array(item)||diary;
   end if;
  end loop;
  if ar='rotinas' then v:=v||jsonb_build_object('claraTasks',tasks); else v:=v||jsonb_build_object('claraHistory',diary); end if;
  changes:=changes||jsonb_build_array(jsonb_build_object('area',ar,'revisao',coalesce(r.revisao,0),'conteudo',state||jsonb_build_object('v3',v)));
 end loop;
 result:=public.clara_v9_salvar(p_empresa,changes);
 insert into public.clara_v9_importacoes(empresa_id,identificador,documento,selecao,autor) values(p_empresa,docid,p_documento,to_jsonb(p_selecao),auth.uid());
 return result;
end $$;
revoke all on function public.clara_v9_permitido(uuid,text,text),public.clara_v9_salvar(uuid,jsonb),public.clara_v9_importar(uuid,jsonb,integer[]),public.clara_v9_acoes(jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.clara_v9_permitido(uuid,text,text),public.clara_v9_salvar(uuid,jsonb),public.clara_v9_importar(uuid,jsonb,integer[]) to authenticated;
commit;
