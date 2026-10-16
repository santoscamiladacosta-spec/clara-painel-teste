create or replace function public.clara_memoria_registrar_v1(p_empresa_id uuid,p_registro_id uuid,p_assunto text,p_registro jsonb,p_itens jsonb default '[]'::jsonb)
returns uuid language plpgsql security invoker set search_path='' as $$
declare v_uid uuid:=auth.uid(); v_existing public.clara_memoria_conversas;
begin
if v_uid is null or not public.clara_memoria_autorizado(p_empresa_id) then raise exception 'Acesso negado' using errcode='42501'; end if;
if p_registro_id is null or p_assunto is null or length(trim(p_assunto)) not between 1 and 200 or p_registro is null or jsonb_typeof(p_registro)<>'object' or octet_length(p_registro::text)>32000 or p_itens is null or jsonb_typeof(p_itens)<>'array' or jsonb_array_length(p_itens)>30 then raise exception 'Registro invalido' using errcode='22023'; end if;
if p_registro->>'painel_status' is null or p_registro->>'painel_status' not in ('nao_solicitado','recusado','json_gerado','importado_confirmado') then raise exception 'painel_status invalido' using errcode='22023'; end if;
perform pg_advisory_xact_lock(hashtextextended(p_registro_id::text,0));
select * into v_existing from public.clara_memoria_conversas where id=p_registro_id;
if found then
 if v_existing.empresa_id=p_empresa_id and v_existing.usuario_id=v_uid and v_existing.assunto=p_assunto and v_existing.resumo=p_registro::text then return p_registro_id; end if;
 raise exception 'Identificador ja utilizado' using errcode='22023';
end if;
if exists(select 1 from jsonb_array_elements(p_itens) x where x->>'tipo' is null or x->>'tipo' not in ('fato_confirmado','decisao_aprovada','acao','pendencia','fonte') or x->>'conteudo' is null or length(x->>'conteudo') not between 1 and 4000) then raise exception 'Item invalido' using errcode='22023'; end if;
insert into public.clara_memoria_conversas(id,empresa_id,usuario_id,assunto,resumo) values(p_registro_id,p_empresa_id,v_uid,p_assunto,p_registro::text);
insert into public.clara_memoria_itens(empresa_id,conversa_id,tipo,conteudo) select p_empresa_id,p_registro_id,x->>'tipo',x->>'conteudo' from jsonb_array_elements(p_itens) x;
return p_registro_id;
end $$;
revoke all on function public.clara_memoria_registrar_v1(uuid,uuid,text,jsonb,jsonb) from public,anon;
grant execute on function public.clara_memoria_registrar_v1(uuid,uuid,text,jsonb,jsonb) to authenticated;