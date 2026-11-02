-- Clara · Vigia (leitura)
-- Roda todo dia e responde uma pergunta: as Claras dos clientes trabalharam?
-- Separa o que QUEBROU (técnico, resolver hoje) do que PEDE ATENÇÃO (cliente esfriando).

create or replace function clara_private.vigia()
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare r jsonb;
begin
  select jsonb_build_object(

    -- A rotina do banco parou de rodar?
    'rotinas_falhas', coalesce((
      select jsonb_agg(jsonb_build_object('rotina', j.jobname, 'quando', d.start_time, 'erro', left(d.return_message, 200)))
      from cron.job_run_details d join cron.job j on j.jobid = d.jobid
      where j.jobname like 'clara-%' and d.status <> 'succeeded' and d.start_time > now() - interval '24 hours'), '[]'::jsonb),

    -- O correio respondeu com erro?
    'correio_falhas', coalesce((
      select jsonb_agg(jsonb_build_object('quando', created, 'codigo', status_code, 'erro', coalesce(error_msg, left(content, 200))))
      from net._http_response
      where created > now() - interval '24 hours' and (status_code is null or status_code <> 200)), '[]'::jsonb),

    -- O boletim da manhã saiu hoje?
    'boletim_rodou_hoje', exists(
      select 1 from cron.job_run_details d join cron.job j on j.jobid = d.jobid
      where j.jobname = 'clara-boletins' and d.status = 'succeeded'
        and d.start_time > (current_date + time '09:00') at time zone 'UTC'),

    -- Algum e-mail foi recusado pelo serviço de envio?
    'emails_recusados', coalesce((
      select jsonb_agg(jsonb_build_object('empresa', e.nome, 'assunto', rc.assunto, 'erro', rc.email_erro))
      from public.clara_recados rc join public.clara_empresas e on e.id = rc.empresa_id
      where rc.email_erro is not null and rc.criado_em > now() - interval '48 hours'), '[]'::jsonb),

    -- Alguém foi convidado e nunca entrou?
    'convites_parados', coalesce((
      select jsonb_agg(jsonb_build_object('empresa', e.nome, 'email', c.email, 'perfil', c.perfil,
                                          'dias', extract(day from now() - c.criado_em)::int))
      from public.clara_convites c join public.clara_empresas e on e.id = c.empresa_id
      where c.aceito_em is null and c.criado_em < now() - interval '7 days' and e.ativa), '[]'::jsonb),

    -- O contrato de licenças foi ultrapassado?
    'licencas_estouradas', coalesce((
      select jsonb_agg(jsonb_build_object('empresa', e.nome, 'tipo', t.tipo, 'uso', t.uso, 'limite', t.limite))
      from public.clara_empresas e
      cross join lateral (
        select 'Clara' tipo,
               (select count(*) from public.clara_vinculos v where v.empresa_id = e.id and v.ativo and v.acesso_clara) uso,
               e.licencas_clara limite
        union all
        select 'painel',
               (select count(*) from public.clara_vinculos v where v.empresa_id = e.id and v.ativo),
               e.licencas_painel) t
      where e.ativa and t.limite is not null and t.uso > t.limite), '[]'::jsonb),

    -- Alguém começou um processo e largou no meio?
    'execucoes_abandonadas', coalesce((
      select jsonb_agg(jsonb_build_object('empresa', e.nome, 'processo', x.processo_id,
                                          'dias', extract(day from now() - x.iniciada_em)::int))
      from public.clara_execucoes x join public.clara_empresas e on e.id = x.empresa_id
      where x.status = 'em_andamento' and x.iniciada_em < now() - interval '3 days'), '[]'::jsonb),

    -- Empresas ativas que ninguém tocou na semana. Não é falha técnica, é sinal de cliente esfriando.
    'empresas_paradas', coalesce((
      select jsonb_agg(jsonb_build_object('empresa', e.nome,
                                          'dias', extract(day from now() - coalesce(u.ultimo, e.criado_em))::int))
      from public.clara_empresas e
      left join lateral (select max(r.atualizado_em) ultimo from public.clara_registros r where r.empresa_id = e.id) u on true
      where e.ativa and coalesce(u.ultimo, e.criado_em) < now() - interval '7 days'), '[]'::jsonb)

  ) into r;
  return r;
end $function$;

create or replace function public.clara_vigia_admin()
returns jsonb language sql security definer set search_path to ''
as $function$ select clara_private.vigia(); $function$;

create or replace function public.clara_consultoria_emails()
returns jsonb language sql security definer set search_path to ''
as $function$
  select coalesce(jsonb_build_array((select valor from public.clara_segredos where chave = 'email_consultoria')), '[]'::jsonb);
$function$;

revoke all on function public.clara_vigia_admin() from public, anon, authenticated;
revoke all on function public.clara_consultoria_emails() from public, anon, authenticated;

-- Endereço oficial do projeto, para onde vão as notificações da consultoria.
insert into public.clara_segredos (chave, valor)
values ('email_consultoria', 'empreendacomia.online@gmail.com')
on conflict (chave) do update set valor = excluded.valor, atualizado_em = now();
