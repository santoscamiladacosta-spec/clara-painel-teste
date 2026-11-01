-- A Clara precisa enxergar o que o painel passou a saber: quem travou e quem já executou o quê.
-- Entra pela porta que ela já usa (clara_contexto), sem republicar o servidor MCP.

create or replace function clara_private.impedimentos(e uuid)
returns jsonb language sql stable security definer set search_path to '' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'tarefa_id', r.id,
           'titulo', r.dados->>'titulo',
           'responsavel_pessoa_id', r.dados->>'responsavel_pessoa_id',
           'responsavel', (select p.dados->>'nome' from public.clara_registros p
                            where p.empresa_id = e and p.colecao = 'pessoas' and p.id = r.dados->>'responsavel_pessoa_id'),
           'impedimento', r.dados->>'impedimento',
           'desde', r.dados->>'impedida_em') order by r.dados->>'impedida_em' desc), '[]'::jsonb)
  from public.clara_registros r
  where r.empresa_id = e and r.colecao = 'tarefas' and not r.arquivado
    and r.dados->>'status' = 'impedida'
    and clara_private.membro(e);
$$;

create or replace function public.clara_contexto(p_empresa uuid default null)
returns jsonb language sql set search_path to '' as $function$
  with base as (select clara_private.contexto(p_empresa) c)
  select case
    when c ? 'empresa' then c || jsonb_build_object(
      'impedimentos', clara_private.impedimentos((c->'empresa'->>'id')::uuid),
      'execucoes', clara_private.execucoes_resumo((c->'empresa'->>'id')::uuid))
    else c end
  from base;
$function$;
