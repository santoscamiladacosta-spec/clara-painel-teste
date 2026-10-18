begin;
-- Enforce the module contract in the database, including direct RPC callers.
create function public.clara_v9_validar_modulo() returns trigger
language plpgsql set search_path='' as $$
declare spec jsonb; group_name text; key_name text; expected text; obj jsonb;
begin
 spec:=case new.area
 when 'processos' then '{"v3":{"processChanges":"array","processDrafts":"array","propostasProcessos":"array"},"entidades":{"processos":"array","procedimentos_rascunho":"array","fichas_mapeamento":"array","dependencia_proprietario":"array","risco_continuidade":"array"}}'::jsonb
 when 'indicadores' then '{"v3":{"indicators":"array","measurements":"object","archivedIndicators":"array"},"entidades":{"indicadores":"array"},"destaques":"array|null","goals":"object"}'::jsonb
 when 'rotinas' then '{"v3":{"routineDone":"object","routineDates":"object","claraTasks":"array","commitments":"array"},"entidades":{"rotinas_rascunho":"array"},"pilot":{"done":"object"}}'::jsonb
 when 'diario' then '{"v3":{"journal":"array","claraHistory":"array"},"pilot":{"events":"array"}}'::jsonb
 when 'crescimento' then '{"entidades":{"oportunidades":"array"},"pilot":{"running":"object","oppDone":"object","suggestions":"array","approvals":"array","actionMeta":"object"}}'::jsonb
 when 'configuracoes' then '{"v3":{"company":"object"},"entidades":{"pessoas":"array"},"empresa":"object"}'::jsonb
 else '{}'::jsonb end;
 for group_name,obj in select * from jsonb_each(new.conteudo) loop
  if not spec ? group_name then raise exception 'Campo não autorizado neste módulo: %',group_name using errcode='22023'; end if;
  if jsonb_typeof(spec->group_name)='string' then
   if not jsonb_typeof(obj)=any(string_to_array(spec->>group_name,'|')) then raise exception 'Tipo de campo inválido' using errcode='22023'; end if;
  else
   if jsonb_typeof(obj)<>'object' then raise exception 'Grupo inválido' using errcode='22023'; end if;
   for key_name in select jsonb_object_keys(obj) loop
    expected:=spec->group_name->>key_name;
    if expected is null or jsonb_typeof(obj->key_name)<>expected then raise exception 'Campo ou tipo não autorizado: %',key_name using errcode='22023'; end if;
   end loop;
  end if;
 end loop;
 if new.area='processos' and public.clara_perfil_na_empresa(new.empresa_id) not in ('proprietario','gestor') then
  if exists(select 1 from jsonb_array_elements(coalesce(new.conteudo->'v3'->'processDrafts','[]')) n
   where n->>'status'='Aprovado' and not exists(select 1 from jsonb_array_elements(case when tg_op='UPDATE' then coalesce(old.conteudo->'v3'->'processDrafts','[]') else '[]'::jsonb end) o where o=n)) then
   raise exception 'Aprovação restrita à gestão' using errcode='42501';
  end if;
 end if;
 return new;
end $$;
create trigger clara_v9_validar_modulo before insert or update on public.clara_v9_modulos for each row execute function public.clara_v9_validar_modulo();
revoke all on function public.clara_v9_validar_modulo() from public,anon,authenticated;
commit;
