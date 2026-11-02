-- Clara · Vigia (agendamento)
-- 8h de Brasília, 30 min depois do boletim, para poder verificar se o boletim saiu.
-- Os valores de 'vigia_url' e 'cron' ficam só no banco (clara_segredos), nunca no repositório.

create or replace function clara_private.chamar_vigia()
returns bigint
language sql
security definer
set search_path to ''
as $function$
  select net.http_post(
    url := (select valor from public.clara_segredos where chave = 'vigia_url'),
    headers := jsonb_build_object(
      'content-type', 'application/json',
      'x-clara-cron', (select valor from public.clara_segredos where chave = 'cron')),
    body := '{}'::jsonb
  );
$function$;

-- insert into public.clara_segredos (chave, valor)
-- values ('vigia_url', 'https://<projeto>.supabase.co/functions/v1/clara-vigia');

select cron.schedule('clara-vigia', '0 11 * * *', $$select clara_private.chamar_vigia()$$);
