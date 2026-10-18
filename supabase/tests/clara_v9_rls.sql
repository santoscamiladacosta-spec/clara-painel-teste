-- Execute inside a transaction; always rollback test identities and records.
insert into auth.users(id,aud,role) values
 ('10000000-0000-4000-8000-000000000091','authenticated','authenticated'),
 ('10000000-0000-4000-8000-000000000092','authenticated','authenticated'),
 ('10000000-0000-4000-8000-000000000093','authenticated','authenticated');
insert into public.clara_empresas(id,nome) values
 ('20000000-0000-4000-8000-000000000091','TESTE V9 A'),
 ('20000000-0000-4000-8000-000000000092','TESTE V9 B');
insert into public.clara_membros(empresa_id,usuario_id,perfil,ativo,permissoes) values
 ('20000000-0000-4000-8000-000000000091','10000000-0000-4000-8000-000000000091','proprietario',true,'{}'),
 ('20000000-0000-4000-8000-000000000092','10000000-0000-4000-8000-000000000092','proprietario',true,'{}'),
 ('20000000-0000-4000-8000-000000000091','10000000-0000-4000-8000-000000000093','funcionario',true,'{"rotinas":{"ver":true,"criar":true,"editar":false,"excluir":false}}');
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000091',true);
select public.clara_v9_salvar('20000000-0000-4000-8000-000000000091','[{"area":"rotinas","revisao":0,"conteudo":{"v3":{"claraTasks":[{"id":"t1","titulo":"Rotina real","ok":false,"historico":[{"texto":"Criada"}]}]}}}]');
do $$ begin
 if (select conteudo->'v3'->'claraTasks'->0->>'titulo' from public.clara_v9_modulos where empresa_id='20000000-0000-4000-8000-000000000091' and area='rotinas')<>'Rotina real' then raise exception 'Persistência falhou'; end if;
 begin
  perform public.clara_v9_salvar('20000000-0000-4000-8000-000000000091','[{"area":"rotinas","revisao":0,"conteudo":{}}]');
  raise exception 'Conflito ignorado';
 exception when serialization_failure then null; end;
 begin
  perform public.clara_v9_salvar('20000000-0000-4000-8000-000000000091','[{"area":"rotinas","revisao":1,"conteudo":{"entidades":{"processos":[{"id":"fake","nome":"Injeção"}]}}}]');
  raise exception 'Injeção entre módulos aceita';
 exception when invalid_parameter_value then null; end;
 perform set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000092',true);
 if exists(select 1 from public.clara_v9_modulos where empresa_id='20000000-0000-4000-8000-000000000091') then raise exception 'Vazamento entre empresas'; end if;
 begin
  perform public.clara_v9_salvar('20000000-0000-4000-8000-000000000091','[{"area":"rotinas","revisao":1,"conteudo":{}}]');
  raise exception 'Escrita cruzada aceita';
 exception when insufficient_privilege then null; end;
 perform set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000093',true);
 if (select count(*) from public.clara_v9_modulos)<>1 then raise exception 'Colaborador não visualizou rotina'; end if;
 begin
  perform public.clara_v9_salvar('20000000-0000-4000-8000-000000000091','[{"area":"rotinas","revisao":1,"conteudo":{"v3":{"claraTasks":[{"id":"t1","titulo":"Alterada","ok":false,"historico":[{"texto":"Criada"}]}]}}}]');
  raise exception 'Edição sem permissão aceita';
 exception when insufficient_privilege then null; end;
 begin
  perform public.clara_v9_salvar('20000000-0000-4000-8000-000000000091','[{"area":"rotinas","revisao":1,"conteudo":{"v3":{"claraTasks":[]}}}]');
  raise exception 'Exclusão sem permissão aceita';
 exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000091',true);
select public.clara_v9_importar('20000000-0000-4000-8000-000000000091','{"formato":"CLARA_ATUALIZACAO","versao":"1.0","id":"v9-test-1","empresa_nome":"TESTE V9 A","alteracoes":[{"aba":"diario","acao":"adicionar_registro","titulo":"Decisão","resumo":"Orientação aprovada"},{"aba":"rotinas","acao":"criar_tarefa","titulo":"Compromisso","resumo":"Executar rotina","data":"2026-10-19"}]}',array[0,1]);
do $$ begin
 if (select jsonb_array_length(conteudo->'v3'->'claraTasks') from public.clara_v9_modulos where empresa_id='20000000-0000-4000-8000-000000000091' and area='rotinas')<>2 then raise exception 'Importação incompleta'; end if;
 if not exists(select 1 from public.clara_v9_auditoria where empresa_id='20000000-0000-4000-8000-000000000091' and area='rotinas' and revisao=2) then raise exception 'Auditoria ausente'; end if;
 begin
  perform public.clara_v9_importar('20000000-0000-4000-8000-000000000091','{"formato":"CLARA_ATUALIZACAO","versao":"1.0","id":"v9-test-1","empresa_nome":"TESTE V9 A","alteracoes":[{"aba":"diario","acao":"adicionar_registro","titulo":"Decisão","resumo":"Repetição"}]}',array[0]);
  raise exception 'Reimportação aceita';
 exception when unique_violation then null; end;
 begin
  perform public.clara_v9_importar('20000000-0000-4000-8000-000000000091','{"formato":"CLARA_ATUALIZACAO","versao":"1.0","id":"v9-invalid","empresa_nome":"TESTE V9 A","alteracoes":[{"aba":"diario","acao":"adicionar_registro","titulo":"Parcial","resumo":"Não pode salvar"},{"aba":"rotinas","acao":"criar_tarefa","titulo":"Inválida","resumo":"Data inválida","data":"2026-02-30"}]}',array[0,1]);
  raise exception 'Data impossível aceita';
 exception when datetime_field_overflow then null; end;
 if exists(select 1 from public.clara_v9_importacoes where identificador='v9-invalid') then raise exception 'Importação parcial'; end if;
 perform set_config('request.jwt.claim.sub','',true);
 if exists(select 1 from public.clara_v9_modulos) then raise exception 'Sem identidade leu dados'; end if;
end $$;
reset role;
update public.clara_membros set permissoes=permissoes||'{"indicadores":{"ver":true,"editar":true}}'::jsonb where usuario_id='10000000-0000-4000-8000-000000000093';
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000093',true);
select public.clara_v9_salvar('20000000-0000-4000-8000-000000000091','[{"area":"indicadores","revisao":0,"conteudo":{"destaques":["indicador-autorizado"]}}]');
do $$ begin
 if not exists(select 1 from public.clara_v9_modulos where area='indicadores' and conteudo->'destaques'='["indicador-autorizado"]'::jsonb) then raise exception 'Editar exigiu criar indevidamente'; end if;
 begin
  perform public.clara_v9_salvar('20000000-0000-4000-8000-000000000091','[{"area":"indicadores","revisao":1,"conteudo":{"v3":{"indicators":[{"id":"novo","nome":"Não autorizado"}]},"destaques":["indicador-autorizado"]}}]');raise exception 'Edição concedeu criar indevidamente';
 exception when insufficient_privilege then null; end;
end $$;
reset role;
update public.clara_membros set ativo=false where usuario_id='10000000-0000-4000-8000-000000000093';
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000093',true);
do $$ begin if exists(select 1 from public.clara_v9_modulos) then raise exception 'Desativado acessou dados'; end if; end $$;
reset role;
select 'PASSOU: persistência, auditoria, isolamento, permissões por ação, concorrência, importação atômica, duplicidade, datas inválidas, sessão ausente e desativação' as resultado;
