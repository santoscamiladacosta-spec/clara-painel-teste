-- Configuração de e-mail por empresa e o agendador que chama o Correio da Clara.
-- O envio sai do banco, não do servidor MCP, para que o painel também gere e-mail.

alter table public.clara_empresas
  add column if not exists email_ativo boolean not null default true,
  add column if not exists email_hora  time not null default '07:30',
  add column if not exists email_dias  int[] not null default '{1,2,3,4,5}',
  add column if not exists resumo_dias int[] not null default '{1,3,5}';

comment on column public.clara_empresas.email_hora is 'Hora local (America/Sao_Paulo) do boletim e do resumo.';
comment on column public.clara_empresas.email_dias is 'Dias da semana do boletim do colaborador. 1=segunda ... 7=domingo.';
comment on column public.clara_empresas.resumo_dias is 'Dias da semana do resumo do proprietário.';

create or replace function public.clara_dependencia_admin(p_empresa uuid)
returns jsonb language sql security definer set search_path to '' as $$
  select clara_private.nota_calcular(p_empresa);
$$;
revoke all on function public.clara_dependencia_admin(uuid) from public, anon, authenticated;

create table if not exists public.clara_segredos (
  chave text primary key,
  valor text not null,
  atualizado_em timestamptz not null default now()
);
alter table public.clara_segredos enable row level security;
-- Sem política nenhuma: ninguém com login lê. Só o serviço interno.
-- Os valores são inseridos na instalação, não ficam neste arquivo.

create extension if not exists pg_net;
create extension if not exists pg_cron;

create or replace function clara_private.correio(job text)
returns bigint language sql security definer set search_path to '' as $$
  select net.http_post(
    url := (select valor from public.clara_segredos where chave = 'correio_url') || '?job=' || job,
    headers := jsonb_build_object(
      'content-type', 'application/json',
      'x-clara-cron', (select valor from public.clara_segredos where chave = 'cron')),
    body := '{}'::jsonb
  );
$$;

select cron.unschedule(jobname) from cron.job where jobname in ('clara-imediatos','clara-boletins','clara-resumos');

select cron.schedule('clara-imediatos', '*/5 * * * *', $$select clara_private.correio('imediatos')$$);
select cron.schedule('clara-boletins',  '3 * * * *',   $$select clara_private.correio('boletins')$$);
select cron.schedule('clara-resumos',   '5 * * * *',   $$select clara_private.correio('resumos')$$);
