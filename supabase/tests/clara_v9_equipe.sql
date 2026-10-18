begin;
insert into auth.users(id,email,aud,role) values
 ('10000000-0000-4000-8000-000000000081','owner@test.invalid','authenticated','authenticated'),
 ('10000000-0000-4000-8000-000000000082','manager@test.invalid','authenticated','authenticated'),
 ('10000000-0000-4000-8000-000000000083','employee@test.invalid','authenticated','authenticated'),
 ('10000000-0000-4000-8000-000000000084','other@test.invalid','authenticated','authenticated');
insert into public.clara_empresas(id,nome) values('20000000-0000-4000-8000-000000000081','TESTE EQUIPE A'),('20000000-0000-4000-8000-000000000082','TESTE EQUIPE B');
insert into public.clara_membros(empresa_id,usuario_id,perfil,ativo,permissoes) values
 ('20000000-0000-4000-8000-000000000081','10000000-0000-4000-8000-000000000081','proprietario',true,'{}'),
 ('20000000-0000-4000-8000-000000000081','10000000-0000-4000-8000-000000000082','gestor',true,'{"administrar_usuarios":true}'),
 ('20000000-0000-4000-8000-000000000082','10000000-0000-4000-8000-000000000084','proprietario',true,'{}');
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000081',true);
select public.clara_v9_equipe('20000000-0000-4000-8000-000000000081','convidar',null,'employee@test.invalid','Pessoa','funcionario','{"rotinas":{"ver":true,"criar":true}}');
do $$ begin
 begin
  perform public.clara_v9_equipe('20000000-0000-4000-8000-000000000081','excluir','10000000-0000-4000-8000-000000000081');raise exception 'Excluiu proprietário';
 exception when insufficient_privilege then null;end;
 perform set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000084',true);
 begin
  perform public.clara_v9_equipe('20000000-0000-4000-8000-000000000081','listar');raise exception 'Listou outra empresa';
 exception when insufficient_privilege then null;end;
 perform set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000083',true);
 if jsonb_array_length(public.clara_v9_equipe('20000000-0000-4000-8000-000000000081','minhas_readmissoes')->'pendentes')<>1 then raise exception 'Convite não recuperado'; end if;
 perform public.clara_v9_equipe('20000000-0000-4000-8000-000000000081','aceitar_readmissao');
 if not public.clara_v9_permitido('20000000-0000-4000-8000-000000000081','rotinas','criar') then raise exception 'Consentimento não criou vínculo'; end if;
 begin
  perform public.clara_v9_equipe('20000000-0000-4000-8000-000000000081','listar');raise exception 'Colaborador administrou';
 exception when insufficient_privilege then null;end;
 perform set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000082',true);
 begin
  perform public.clara_v9_equipe('20000000-0000-4000-8000-000000000081','convidar',null,'someone@test.invalid','Pessoa','gestor','{}');raise exception 'Gestor convidou gestor';
 exception when insufficient_privilege then null;end;
 begin
  perform public.clara_v9_equipe('20000000-0000-4000-8000-000000000081','atualizar','10000000-0000-4000-8000-000000000083',null,null,'funcionario','{"administrar_usuarios":true}');raise exception 'Gestor delegou administração';
 exception when insufficient_privilege then null;end;
 perform public.clara_v9_equipe('20000000-0000-4000-8000-000000000081','excluir','10000000-0000-4000-8000-000000000083');
 begin
  perform public.clara_v9_equipe('20000000-0000-4000-8000-000000000081','atualizar','10000000-0000-4000-8000-000000000083',null,null,null,null,true);raise exception 'Readmissão sem consentimento';
 exception when insufficient_privilege then null;end;
 perform public.clara_v9_equipe('20000000-0000-4000-8000-000000000081','convidar',null,'employee@test.invalid','Pessoa','funcionario','{"rotinas":{"ver":true,"editar":true}}');
 perform set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000083',true);
 if public.clara_v9_permitido('20000000-0000-4000-8000-000000000081','rotinas','ver') then raise exception 'Removido com acesso'; end if;
 perform public.clara_v9_equipe('20000000-0000-4000-8000-000000000081','aceitar_readmissao');
 if not public.clara_v9_permitido('20000000-0000-4000-8000-000000000081','rotinas','editar') then raise exception 'Readmissão falhou'; end if;
end $$;
reset role;
do $$ begin
 if not exists(select 1 from auth.users where email='employee@test.invalid') then raise exception 'Conta global apagada'; end if;
 if not exists(select 1 from public.clara_v9_equipe_auditoria where acao='excluir') then raise exception 'Auditoria ausente'; end if;
end $$;
select 'PASSOU: convite, consentimento, remoção lógica, readmissão, proteção do proprietário, separação de empresas, delegação e auditoria' as resultado;
rollback;
