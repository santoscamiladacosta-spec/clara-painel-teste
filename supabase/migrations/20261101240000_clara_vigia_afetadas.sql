-- Clara · Vigia (quem ficou sem receber)
-- Uma falha de infraestrutura sem nome de empresa não gera ação: a consultora
-- precisa saber quais clientes ficaram sem o boletim.

create or replace function clara_private.boletim_afetadas()
returns jsonb language sql security definer set search_path to ''
as $function$
  select coalesce(jsonb_agg(nome order by nome), '[]'::jsonb)
  from public.clara_empresas
  where ativa and coalesce(email_ativo, true);
$function$;

create or replace function public.clara_vigia_afetadas()
returns jsonb language sql security definer set search_path to ''
as $function$ select clara_private.boletim_afetadas(); $function$;

revoke all on function public.clara_vigia_afetadas() from public, anon, authenticated;
