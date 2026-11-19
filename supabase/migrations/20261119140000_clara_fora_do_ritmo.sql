-- Processo tem ritmo. Quando o ritmo passa e ninguém executou, isso é uma pergunta
-- que a Clara faz sozinha — não algo que ela só descobre se perguntarem.
-- Só vale para processo publicado no Manual Vivo: o que ainda está em descoberta
-- não pode ser executado pelo painel, então não há ritmo a cobrar.
create or replace function clara_private.fora_do_ritmo(p_empresa uuid)
returns jsonb language sql security definer set search_path to ''
as $function$
  with proc as (
    select r.id,
           coalesce(r.dados->>'nome', r.dados->>'titulo', r.id) as nome,
           lower(trim(coalesce(r.dados->>'ritmo', ''))) as ritmo,
           nullif(r.dados->>'gatilho', '') as gatilho,
           nullif(r.dados->>'prazo_esperado', '') as prazo_esperado,
           nullif(r.dados->>'falha_comum', '') as falha_comum,
           nullif(r.dados->>'responsavel_pessoa_id', '') as responsavel_pessoa_id
    from public.clara_registros r
    where r.empresa_id = p_empresa and r.colecao = 'processos' and not r.arquivado
      and r.dados->>'status_doc' = 'publicado'
      and coalesce(trim(r.dados->>'ritmo'), '') <> ''
  ),
  ultima as (
    select x.processo_id, max(x.concluida_em) as quando
    from public.clara_execucoes x
    where x.empresa_id = p_empresa and x.status = 'concluida'
    group by x.processo_id
  ),
  atraso as (
    select p.*, u.quando,
           case
             when p.ritmo like 'di%'      then interval '2 days'
             when p.ritmo like 'seman%'   then interval '9 days'
             when p.ritmo like 'quinzen%' then interval '17 days'
             when p.ritmo like 'mens%'    then interval '35 days'
             when p.ritmo like 'trimest%' then interval '100 days'
             else null   -- sob demanda: não há ritmo a cobrar
           end as tolerancia
    from proc p left join ultima u on u.processo_id = p.id
  )
  select coalesce(jsonb_agg(jsonb_build_object(
           'processo', nome, 'processo_id', id, 'ritmo', ritmo,
           'responsavel_pessoa_id', responsavel_pessoa_id,
           'gatilho', gatilho, 'prazo_esperado', prazo_esperado, 'falha_comum', falha_comum,
           'ultima_execucao', quando,
           'dias_sem_executar', case when quando is null then null
                                     else extract(day from now() - quando)::int end,
           'nunca_executado', quando is null
         ) order by quando nulls first), '[]'::jsonb)
  from atraso
  where tolerancia is not null and (quando is null or quando < now() - tolerancia);
$function$;

create or replace function public.clara_contexto(p_empresa uuid default null)
returns jsonb language sql set search_path to ''
as $function$
  with base as (select clara_private.contexto(p_empresa) c)
  select case
    when c ? 'empresa' then c || jsonb_build_object(
      'impedimentos', clara_private.impedimentos((c->'empresa'->>'id')::uuid),
      'execucoes', clara_private.execucoes_resumo((c->'empresa'->>'id')::uuid),
      'fora_do_ritmo', clara_private.fora_do_ritmo((c->'empresa'->>'id')::uuid))
    else c end
  from base;
$function$;
