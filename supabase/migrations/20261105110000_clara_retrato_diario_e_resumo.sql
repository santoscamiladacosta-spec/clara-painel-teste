-- Clara · Retrato diário e resumo de período
-- Todo dia às 23h50 (Brasília) a Clara guarda uma foto de cada empresa ativa: nota, processos,
-- indicadores, tarefas e equipe. O resumo compara a primeira e a última foto do período.
-- A foto guarda só números e a faixa da nota; nunca fórmula nem fatores internos.
-- (Já aplicada no projeto clara-central em 05/11/2026; este arquivo registra o que foi aplicado.)

create table if not exists public.clara_retratos (
  empresa_id uuid not null references public.clara_empresas(id),
  dia date not null,
  nota integer, faixa text, status_nota text,
  processos_avaliados integer, processos_inventariados integer, processos_criticos integer,
  processos_total integer, processos_publicados integer, processos_validacao integer, processos_descoberta integer,
  criticos_sem_substituto integer,
  indicadores_total integer, indicadores_com_meta integer, indicadores_com_valor integer,
  tarefas_abertas integer, tarefas_concluidas integer, tarefas_vencidas integer,
  recados_abertos integer, recados_concluidos integer,
  execucoes_concluidas integer,
  equipe jsonb not null default '[]'::jsonb,
  registrado_em timestamptz not null default now(),
  primary key (empresa_id, dia)
);
alter table public.clara_retratos enable row level security;
revoke all on public.clara_retratos from anon, authenticated;

create or replace function clara_private.tirar_retrato(e uuid)
returns void
language plpgsql
security definer
set search_path to ''
as $function$
declare n jsonb; hoje date := (now() at time zone 'America/Sao_Paulo')::date;
begin
  n := clara_private.nota_calcular(e);
  delete from public.clara_retratos where empresa_id = e and dia = hoje;
  insert into public.clara_retratos(
    empresa_id, dia, nota, faixa, status_nota,
    processos_avaliados, processos_inventariados, processos_criticos,
    processos_total, processos_publicados, processos_validacao, processos_descoberta, criticos_sem_substituto,
    indicadores_total, indicadores_com_meta, indicadores_com_valor,
    tarefas_abertas, tarefas_concluidas, tarefas_vencidas,
    recados_abertos, recados_concluidos, execucoes_concluidas, equipe)
  select e, hoje, (n->>'nota')::int, n->>'faixa', n->>'status',
    (n->>'processos_avaliados')::int, (n->>'processos_inventariados')::int, (n->>'processos_criticos')::int,
    p.total, p.publicados, p.validacao, p.descoberta, p.criticos_sem_substituto,
    i.total, i.com_meta, i.com_valor,
    t.abertas, t.concluidas, t.vencidas,
    rc.abertos, rc.concluidos, coalesce(ex.concluidas, 0), eq.equipe
  from (select count(*) total,
      count(*) filter (where dados->>'status_doc' = 'publicado') publicados,
      count(*) filter (where dados->>'status_doc' = 'validacao') validacao,
      count(*) filter (where dados->>'status_doc' = 'descoberta') descoberta,
      count(*) filter (where dados->>'critico' = 'true' and coalesce(dados->>'substituto_pessoa_id', '') = '') criticos_sem_substituto
    from public.clara_registros where empresa_id = e and colecao = 'processos' and not arquivado) p
  cross join (select count(*) total,
      count(*) filter (where coalesce(dados->>'meta', '') <> '') com_meta,
      count(*) filter (where coalesce(dados->>'ultimo_valor', '') <> '') com_valor
    from public.clara_registros where empresa_id = e and colecao = 'indicadores' and not arquivado) i
  cross join (select
      count(*) filter (where coalesce(dados->>'status', '') not in ('concluida', 'cancelada')) abertas,
      count(*) filter (where dados->>'status' = 'concluida') concluidas,
      count(*) filter (where coalesce(dados->>'status', '') not in ('concluida', 'cancelada')
                         and dados->>'prazo' ~ '^\d{4}-\d{2}-\d{2}' and left(dados->>'prazo', 10)::date < hoje) vencidas
    from public.clara_registros where empresa_id = e and colecao = 'tarefas' and not arquivado) t
  cross join (select count(*) filter (where status in ('aberto', 'visto')) abertos,
      count(*) filter (where status = 'concluido') concluidos
    from public.clara_recados where empresa_id = e) rc
  cross join (select count(*) concluidas from public.clara_execucoes where empresa_id = e and status = 'concluida') ex
  cross join (select coalesce(jsonb_agg(jsonb_build_object(
      'pessoa_id', pe.id,
      'nome', pe.dados->>'nome',
      'tarefas_abertas', (select count(*) from public.clara_registros x where x.empresa_id = e and x.colecao = 'tarefas' and not x.arquivado
          and x.dados->>'responsavel_pessoa_id' = pe.id and coalesce(x.dados->>'status', '') not in ('concluida', 'cancelada')),
      'tarefas_concluidas', (select count(*) from public.clara_registros x where x.empresa_id = e and x.colecao = 'tarefas' and not x.arquivado
          and x.dados->>'responsavel_pessoa_id' = pe.id and x.dados->>'status' = 'concluida'),
      'tarefas_vencidas', (select count(*) from public.clara_registros x where x.empresa_id = e and x.colecao = 'tarefas' and not x.arquivado
          and x.dados->>'responsavel_pessoa_id' = pe.id and coalesce(x.dados->>'status', '') not in ('concluida', 'cancelada')
          and x.dados->>'prazo' ~ '^\d{4}-\d{2}-\d{2}' and left(x.dados->>'prazo', 10)::date < hoje),
      'recados_abertos', (select count(*) from public.clara_recados r where r.empresa_id = e and r.para_pessoa_id = pe.id and r.status in ('aberto', 'visto'))
    ) order by pe.dados->>'nome'), '[]'::jsonb) equipe
    from public.clara_registros pe where pe.empresa_id = e and pe.colecao = 'pessoas' and not pe.arquivado) eq;
end $function$;

create or replace function clara_private.tirar_retratos()
returns void
language plpgsql
security definer
set search_path to ''
as $function$
declare r record;
begin
  for r in select id from public.clara_empresas where ativa loop
    begin
      perform clara_private.tirar_retrato(r.id);
    exception when others then
      raise warning 'clara-retrato: empresa % falhou: %', r.id, sqlerrm;
    end;
  end loop;
end $function$;

create or replace function clara_private.resumo_periodo(e uuid, p_ini date, p_fim date)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  ri public.clara_retratos; rf public.clara_retratos;
  nome_emp text; avisos jsonb := '[]'::jsonb; v_equipe jsonb; v_hist jsonb; v_per jsonb; v_var jsonb;
  dias_esperados int; dias_com_foto int;
begin
  if not clara_private.eh_admin() then raise exception 'SOMENTE_CONSULTORIA' using errcode = '42501'; end if;
  if p_ini is null or p_fim is null or p_fim < p_ini then raise exception 'PERIODO_INVALIDO'; end if;
  select nome into nome_emp from public.clara_empresas where id = e;
  if nome_emp is null then raise exception 'EMPRESA_INEXISTENTE'; end if;

  select * into ri from public.clara_retratos where empresa_id = e and dia between p_ini and p_fim order by dia asc limit 1;
  select * into rf from public.clara_retratos where empresa_id = e and dia between p_ini and p_fim order by dia desc limit 1;
  dias_esperados := (p_fim - p_ini) + 1;
  select count(*) into dias_com_foto from public.clara_retratos where empresa_id = e and dia between p_ini and p_fim;

  if ri.empresa_id is null then
    avisos := avisos || to_jsonb('Não há nenhum retrato diário neste período. A comparação de início e fim não é possível; só aparecem os fatos registrados dentro do período e o histórico mensal da nota.'::text);
  else
    if ri.dia > p_ini then avisos := avisos || to_jsonb(('O primeiro retrato do período é de ' || to_char(ri.dia, 'DD/MM/YYYY') || '. Os números iniciais partem dessa data.')::text); end if;
    if rf.dia < p_fim then avisos := avisos || to_jsonb(('O último retrato do período é de ' || to_char(rf.dia, 'DD/MM/YYYY') || '. Os números finais partem dessa data.')::text); end if;
    if ri.dia = rf.dia then avisos := avisos || to_jsonb('Só existe um retrato no período, então não há variação para comparar.'::text); end if;
    if dias_com_foto < dias_esperados and ri.dia <> rf.dia then
      avisos := avisos || to_jsonb(('Há retratos em ' || dias_com_foto || ' de ' || dias_esperados || ' dias do período.')::text);
    end if;
  end if;

  select coalesce(jsonb_agg(jsonb_build_object('mes', to_char(mes, 'YYYY-MM'), 'nota', nota, 'status', status) order by mes), '[]'::jsonb)
    into v_hist from public.clara_dependencia_historico
    where empresa_id = e and mes between date_trunc('month', p_ini)::date and p_fim;

  -- Fatos do período (contados nos registros, não dependem de foto).
  with tc as (
    select r.dados->>'responsavel_pessoa_id' pid,
           case when r.dados->>'concluida_em' ~ '^\d{4}-\d{2}-\d{2}' then left(r.dados->>'concluida_em', 10)::date end conc,
           case when r.dados->>'prazo' ~ '^\d{4}-\d{2}-\d{2}' then left(r.dados->>'prazo', 10)::date end prazo
    from public.clara_registros r
    where r.empresa_id = e and r.colecao = 'tarefas' and not r.arquivado and r.dados->>'status' = 'concluida'),
  tp as (select * from tc where conc between p_ini and p_fim)
  select jsonb_build_object(
    'tarefas_concluidas', (select count(*) from tp),
    'tarefas_concluidas_com_prazo', (select count(*) from tp where prazo is not null),
    'tarefas_concluidas_no_prazo', (select count(*) from tp where prazo is not null and conc <= prazo),
    'recados_concluidos', (select count(*) from public.clara_recados where empresa_id = e and concluido_em >= p_ini::timestamptz and concluido_em < (p_fim + 1)::timestamptz),
    'execucoes_concluidas', (select count(*) from public.clara_execucoes where empresa_id = e and status = 'concluida' and concluida_em >= p_ini::timestamptz and concluida_em < (p_fim + 1)::timestamptz),
    'marcos_no_diario', (select count(*) from public.clara_diario where empresa_id = e and registrado_em >= p_ini::timestamptz and registrado_em < (p_fim + 1)::timestamptz),
    'alteracoes_no_painel', (select count(*) from public.clara_auditoria where empresa_id = e and criado_em >= p_ini::timestamptz and criado_em < (p_fim + 1)::timestamptz)
  ) into v_per;

  -- Equipe: situação no início e no fim + o que cada pessoa concluiu no período.
  select coalesce(jsonb_agg(jsonb_build_object(
      'nome', p.nome,
      'tarefas_abertas_inicio', i.tarefas_abertas,
      'tarefas_abertas_fim', f.tarefas_abertas,
      'tarefas_vencidas_fim', f.tarefas_vencidas,
      'recados_abertos_fim', f.recados_abertos,
      'tarefas_concluidas_periodo', coalesce(c.concluidas, 0),
      'tarefas_concluidas_com_prazo', coalesce(c.com_prazo, 0),
      'tarefas_concluidas_no_prazo', coalesce(c.no_prazo, 0)
    ) order by p.nome), '[]'::jsonb)
    into v_equipe
  from (select pe.id, pe.dados->>'nome' nome from public.clara_registros pe
        where pe.empresa_id = e and pe.colecao = 'pessoas' and not pe.arquivado) p
  left join jsonb_to_recordset(coalesce(ri.equipe, '[]'::jsonb)) as i(pessoa_id text, tarefas_abertas int) on i.pessoa_id = p.id
  left join jsonb_to_recordset(coalesce(rf.equipe, '[]'::jsonb)) as f(pessoa_id text, tarefas_abertas int, tarefas_vencidas int, recados_abertos int) on f.pessoa_id = p.id
  left join (
    select r.dados->>'responsavel_pessoa_id' pid, count(*) concluidas,
           count(*) filter (where pz is not null) com_prazo,
           count(*) filter (where pz is not null and cc <= pz) no_prazo
    from (select r.*,
            case when r.dados->>'concluida_em' ~ '^\d{4}-\d{2}-\d{2}' then left(r.dados->>'concluida_em', 10)::date end cc,
            case when r.dados->>'prazo' ~ '^\d{4}-\d{2}-\d{2}' then left(r.dados->>'prazo', 10)::date end pz
          from public.clara_registros r
          where r.empresa_id = e and r.colecao = 'tarefas' and not r.arquivado and r.dados->>'status' = 'concluida') r
    where cc between p_ini and p_fim
    group by 1) c on c.pid = p.id;

  if ri.empresa_id is not null and rf.empresa_id is not null and ri.dia <> rf.dia then
    v_var := jsonb_build_object(
      'nota', rf.nota - ri.nota,
      'processos_total', rf.processos_total - ri.processos_total,
      'processos_publicados', rf.processos_publicados - ri.processos_publicados,
      'criticos_sem_substituto', rf.criticos_sem_substituto - ri.criticos_sem_substituto,
      'indicadores_total', rf.indicadores_total - ri.indicadores_total,
      'indicadores_com_meta', rf.indicadores_com_meta - ri.indicadores_com_meta,
      'indicadores_com_valor', rf.indicadores_com_valor - ri.indicadores_com_valor,
      'tarefas_abertas', rf.tarefas_abertas - ri.tarefas_abertas,
      'tarefas_vencidas', rf.tarefas_vencidas - ri.tarefas_vencidas);
  end if;

  return jsonb_build_object(
    'empresa', nome_emp,
    'periodo', jsonb_build_object('inicio', p_ini, 'fim', p_fim, 'dias', dias_esperados),
    'retrato_inicial', case when ri.empresa_id is null then null else to_jsonb(ri) - 'equipe' - 'empresa_id' - 'registrado_em' end,
    'retrato_final', case when rf.empresa_id is null then null else to_jsonb(rf) - 'equipe' - 'empresa_id' - 'registrado_em' end,
    'variacao', v_var,
    'no_periodo', v_per,
    'equipe', v_equipe,
    'historico_nota_mensal', v_hist,
    'avisos', avisos
  );
end $function$;

create or replace function public.clara_resumo_periodo(p_empresa uuid, p_inicio date, p_fim date)
returns jsonb
language sql
security definer
set search_path to ''
as $function$ select clara_private.resumo_periodo(p_empresa, p_inicio, p_fim); $function$;

revoke all on function clara_private.tirar_retrato(uuid) from public, anon, authenticated;
revoke all on function clara_private.tirar_retratos() from public, anon, authenticated;
revoke all on function clara_private.resumo_periodo(uuid, date, date) from public, anon, authenticated;
revoke all on function public.clara_resumo_periodo(uuid, date, date) from public, anon;
grant execute on function public.clara_resumo_periodo(uuid, date, date) to authenticated;

select cron.unschedule(jobname) from cron.job where jobname = 'clara-retrato';
-- 02:50 UTC = 23:50 em Brasília: foto do fim do dia.
select cron.schedule('clara-retrato', '50 2 * * *', $$select clara_private.tirar_retratos()$$);

-- Primeira foto agora, para o período começar a contar hoje.
select clara_private.tirar_retratos();
