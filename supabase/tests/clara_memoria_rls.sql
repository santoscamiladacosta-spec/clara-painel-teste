begin;
insert into auth.users(id,aud,role) values ('10000000-0000-4000-8000-000000000001','authenticated','authenticated'),('10000000-0000-4000-8000-000000000002','authenticated','authenticated'),('10000000-0000-4000-8000-000000000003','authenticated','authenticated');
insert into public.clara_empresas(id,nome) values('20000000-0000-4000-8000-000000000001','TESTE TRANSACIONAL A'),('20000000-0000-4000-8000-000000000002','TESTE TRANSACIONAL B');
insert into public.clara_membros(empresa_id,usuario_id,perfil,ativo) values ('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','proprietario',true),('20000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000002','proprietario',true),('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000003','funcionario',true);
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
select public.clara_memoria_registrar_v1('20000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001','Teste continuidade','{"painel_status":"recusado","resumo":"Revisar checklist de abertura"}','[{"tipo":"pendencia","conteudo":"Revisar checklist de abertura"}]');
do $$ begin
if (select count(*) from public.clara_memoria_itens where conversa_id='30000000-0000-4000-8000-000000000001')<>1 then raise exception 'Falha gravacao'; end if;
perform public.clara_memoria_registrar_v1('20000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001','Teste continuidade','{"painel_status":"recusado","resumo":"Revisar checklist de abertura"}','[{"tipo":"pendencia","conteudo":"Revisar checklist de abertura"}]');
if (select count(*) from public.clara_memoria_itens where conversa_id='30000000-0000-4000-8000-000000000001')<>1 then raise exception 'Falha idempotencia'; end if;
perform set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000002',true);
if exists(select 1 from public.clara_memoria_conversas where id='30000000-0000-4000-8000-000000000001') or exists(select 1 from public.clara_memoria_itens where conversa_id='30000000-0000-4000-8000-000000000001') then raise exception 'Vazamento entre empresas'; end if;
begin
perform public.clara_memoria_registrar_v1('20000000-0000-4000-8000-000000000001',gen_random_uuid(),'Negado','{"painel_status":"recusado"}','[]');
raise exception 'Falha bloqueio escrita';
exception when insufficient_privilege then null; end;
perform set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000003',true);
if exists(select 1 from public.clara_memoria_conversas where id='30000000-0000-4000-8000-000000000001') then raise exception 'Colaborador leu memoria'; end if;
perform set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
if not exists(select 1 from public.clara_memoria_itens where conversa_id='30000000-0000-4000-8000-000000000001' and conteudo='Revisar checklist de abertura') then raise exception 'Falha recuperacao'; end if;
end $$;

do $$ begin
begin
insert into public.clara_memoria_conversas(empresa_id,usuario_id,assunto) values('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002','Spoof');
raise exception 'Usuario falsificado aceito';
exception when insufficient_privilege then null; end;
begin
insert into public.clara_memoria_itens(empresa_id,conversa_id,tipo,conteudo) values('20000000-0000-4000-8000-000000000002','30000000-0000-4000-8000-000000000001','pendencia','Cruzar empresas');
raise exception 'Item cruzado aceito';
exception when insufficient_privilege then null; end;
begin
perform public.clara_memoria_registrar_v1('20000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000002','Invalido','{"painel_status":"recusado"}','[{"tipo":"invalido","conteudo":"X"}]');
raise exception 'Item invalido aceito';
exception when invalid_parameter_value then null; end;
if exists(select 1 from public.clara_memoria_conversas where id='30000000-0000-4000-8000-000000000002') then raise exception 'Registro parcial'; end if;
perform set_config('request.jwt.claim.sub','',true);
if exists(select 1 from public.clara_memoria_conversas where id='30000000-0000-4000-8000-000000000001') then raise exception 'Sem identidade leu memoria'; end if;
end $$;

select 'PASSOU: gravacao atomica, recuperacao no banco, idempotencia, leitura e escrita cruzadas bloqueadas, colaborador bloqueado' as resultado;
rollback;