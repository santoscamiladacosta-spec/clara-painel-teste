begin;
create function public.clara_v9_padrao(p_empresa uuid,p_area text) returns jsonb language sql stable security definer set search_path='' as $$
 select case p_area
 when 'processos' then '{"v3":{"processChanges":[],"processDrafts":[],"propostasProcessos":[]},"entidades":{"processos":[],"procedimentos_rascunho":[],"fichas_mapeamento":[],"dependencia_proprietario":[],"risco_continuidade":[]}}'::jsonb
 when 'indicadores' then '{"v3":{"indicators":[],"measurements":{},"archivedIndicators":[]},"entidades":{"indicadores":[]},"destaques":null,"goals":{"goals":{},"history":[]}}'::jsonb
 when 'rotinas' then '{"v3":{"routineDone":{},"routineDates":{},"claraTasks":[],"commitments":[]},"entidades":{"rotinas_rascunho":[]},"pilot":{"done":{}}}'::jsonb
 when 'diario' then '{"v3":{"journal":[],"claraHistory":[]},"pilot":{"events":[]}}'::jsonb
 when 'crescimento' then '{"entidades":{"oportunidades":[]},"pilot":{"running":{},"oppDone":{},"suggestions":[],"approvals":[],"actionMeta":{}}}'::jsonb
 when 'configuracoes' then jsonb_build_object('v3','{"company":{}}'::jsonb,'entidades','{"pessoas":[]}'::jsonb,'empresa',jsonb_build_object('id',p_empresa,'nome',(select nome from public.clara_empresas where id=p_empresa),'segmento','','localizacao_geral','','tamanho_equipe',0))
 else '{}'::jsonb end
$$;
create function public.clara_v9_completar(p_padrao jsonb,p_valor jsonb) returns jsonb language plpgsql immutable set search_path='' as $$
declare k text; result jsonb:=p_padrao||p_valor;
begin
 for k in select jsonb_object_keys(p_padrao) loop
  if jsonb_typeof(p_padrao->k)='object' and jsonb_typeof(p_valor->k)='object' then result:=jsonb_set(result,array[k],p_padrao->k||p_valor->k); end if;
 end loop;return result;
end $$;
create or replace function public.clara_v9_acoes(p_antes jsonb,p_depois jsonb)
returns text[] language plpgsql immutable set search_path='' as $$
declare k text; a text[]:='{}'; x jsonb; y jsonb; prefix jsonb;
begin
 if p_antes is not distinct from p_depois then return a; end if;
 if p_antes is null then return array['criar']; end if;
 if p_depois is null then return array['excluir']; end if;
 if jsonb_typeof(p_antes)='object' and jsonb_typeof(p_depois)='object' then
  if p_antes ? 'id' and p_depois ? 'id' then return array['editar']; end if;
  for k in select jsonb_object_keys(p_antes||p_depois) loop
   if p_antes->k is not distinct from p_depois->k then continue; end if;
   if k='archivedIndicators' then a:=a||array['excluir'];
   elsif k in ('routineDone','routineDates','company','empresa','done','oppDone','running','actionMeta','destaques','goals') then a:=a||array['editar'];
   else a:=a||public.clara_v9_acoes(p_antes->k,p_depois->k); end if;
  end loop;
 elsif jsonb_typeof(p_antes)='array' and jsonb_typeof(p_depois)='array' then
  if not exists(select 1 from jsonb_array_elements(p_antes||p_depois) v where jsonb_typeof(v)<>'object' or not v ? 'id') then
   if exists(select 1 from jsonb_array_elements(p_depois) v group by v->'id' having count(*)>1) then raise exception 'Identificador repetido' using errcode='22023'; end if;
   for x in select value from jsonb_array_elements(p_antes) loop
    select value into y from jsonb_array_elements(p_depois) where value->'id'=x->'id';
    a:=a||public.clara_v9_acoes(x,y);
   end loop;
   for y in select value from jsonb_array_elements(p_depois) loop
    if not exists(select 1 from jsonb_array_elements(p_antes) where value->'id'=y->'id') then a:=a||array['criar']; end if;
   end loop;
  elsif jsonb_array_length(p_depois)>jsonb_array_length(p_antes) then
   select coalesce(jsonb_agg(value order by ordinality),'[]') into prefix from jsonb_array_elements(p_depois) with ordinality where ordinality<=jsonb_array_length(p_antes);
   a:=a||case when prefix=p_antes then array['criar'] else array['editar'] end;
  elsif jsonb_array_length(p_depois)<jsonb_array_length(p_antes) then
   select coalesce(jsonb_agg(value order by ordinality),'[]') into prefix from jsonb_array_elements(p_antes) with ordinality where ordinality<=jsonb_array_length(p_depois);
   a:=a||case when prefix=p_depois then array['excluir'] else array['editar'] end;
  else a:=a||array['editar']; end if;
 else a:=a||array['editar']; end if;
 return array(select distinct unnest(a));
end $$;
create or replace function public.clara_v9_salvar(p_empresa uuid,p_mudancas jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare m jsonb; old public.clara_v9_modulos; ar text; act text; result jsonb:='{}'; profile text; baseline jsonb; normalized jsonb;
begin
 profile:=public.clara_perfil_na_empresa(p_empresa);
 if auth.uid() is null or profile is null then raise exception 'Acesso negado' using errcode='42501'; end if;
 if jsonb_typeof(p_mudancas)<>'array' or jsonb_array_length(p_mudancas) not between 1 and 8 or octet_length(p_mudancas::text)>2000000 then
  raise exception 'Alterações inválidas' using errcode='22023'; end if;
 -- Serialize company writes and enforce optimistic revision checks.
 perform pg_advisory_xact_lock(hashtextextended(p_empresa::text,9));
 for m in select value from jsonb_array_elements(p_mudancas) loop
  ar:=m->>'area';
  if ar is null or ar not in ('hoje','processos','indicadores','rotinas','diario','crescimento','clara','configuracoes')
   or jsonb_typeof(m->'conteudo') is distinct from 'object' then raise exception 'Módulo inválido' using errcode='22023'; end if;
  if not public.clara_v9_permitido(p_empresa,ar,'ver') then raise exception 'Módulo não autorizado' using errcode='42501'; end if;
  select * into old from public.clara_v9_modulos where empresa_id=p_empresa and area=ar for update;
  if coalesce(old.revisao,0) is distinct from (m->>'revisao')::bigint then raise exception 'Dados alterados por outra pessoa. Recarregue antes de salvar.' using errcode='40001'; end if;
  baseline:=public.clara_v9_completar(public.clara_v9_padrao(p_empresa,ar),coalesce(old.conteudo,'{}'));
  normalized:=public.clara_v9_completar(public.clara_v9_padrao(p_empresa,ar),m->'conteudo');
  foreach act in array public.clara_v9_acoes(baseline,normalized) loop
   if not public.clara_v9_permitido(p_empresa,ar,act) then raise exception 'Ação % não autorizada em %',act,ar using errcode='42501'; end if;
  end loop;
  if ar='processos' and profile not in ('proprietario','gestor') and
   (coalesce(old.conteudo->'entidades'->'processos','[]') is distinct from normalized->'entidades'->'processos'
    or coalesce(old.conteudo->'v3'->'propostasProcessos','[]') is distinct from coalesce(normalized->'v3'->'propostasProcessos','[]')) then
   raise exception 'Aprovação restrita à gestão' using errcode='42501'; end if;
  insert into public.clara_v9_modulos(empresa_id,area,conteudo,revisao,atualizado_por)
   values(p_empresa,ar,normalized,coalesce(old.revisao,0)+1,auth.uid())
   on conflict(empresa_id,area) do update set conteudo=excluded.conteudo,revisao=excluded.revisao,atualizado_por=excluded.atualizado_por,atualizado_em=now();
  insert into public.clara_v9_auditoria(empresa_id,area,revisao,antes,depois,autor)
   values(p_empresa,ar,coalesce(old.revisao,0)+1,coalesce(old.conteudo,'{}'),normalized,auth.uid());
  result:=result||jsonb_build_object(ar,coalesce(old.revisao,0)+1);
 end loop;
 return result;
end $$;

revoke all on function public.clara_v9_padrao(uuid,text),public.clara_v9_completar(jsonb,jsonb) from public,anon,authenticated;
commit;
