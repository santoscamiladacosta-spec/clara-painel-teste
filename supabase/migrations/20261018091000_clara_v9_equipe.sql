-- V9 team workflow, kept separate from the existing deployed Edge Function.
begin;
create table public.clara_v9_convites (
 empresa_id uuid not null references public.clara_empresas(id),
 email text not null,
 nome text not null,
 perfil text not null check(perfil in ('gestor','funcionario')),
 permissoes jsonb not null,
 criado_por uuid not null,
 criado_em timestamptz not null default now(),
 aceito_em timestamptz,
 primary key(empresa_id,email)
);
create table public.clara_v9_vinculos_removidos (
 empresa_id uuid not null references public.clara_empresas(id),
 usuario_id uuid not null,
 removido_por uuid not null,
 removido_em timestamptz not null default now(),
 primary key(empresa_id,usuario_id)
);
create table public.clara_v9_equipe_auditoria (
 id bigint generated always as identity primary key,
 empresa_id uuid not null references public.clara_empresas(id),
 autor uuid not null,
 acao text not null,
 alvo text not null,
 antes jsonb,
 depois jsonb,
 criado_em timestamptz not null default now()
);
alter table public.clara_v9_convites enable row level security;
alter table public.clara_v9_vinculos_removidos enable row level security;
alter table public.clara_v9_equipe_auditoria enable row level security;
revoke all on public.clara_v9_convites,public.clara_v9_vinculos_removidos,public.clara_v9_equipe_auditoria from anon,authenticated;

create function public.clara_v9_equipe(p_empresa uuid,p_acao text,p_usuario uuid default null,p_email text default null,p_nome text default null,p_perfil text default null,p_permissoes jsonb default null,p_ativo boolean default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); role text; target public.clara_membros; invitation public.clara_v9_convites;
 actor_email text; result jsonb; normalized jsonb:='{}'; ar text; ac text; entry jsonb;
begin
 if uid is null then raise exception 'Autenticação necessária' using errcode='42501'; end if;
 select lower(u.email) into actor_email from auth.users u where u.id=uid;
 if p_acao='minhas_readmissoes' then
  select coalesce(jsonb_agg(jsonb_build_object('empresa_id',c.empresa_id,'nome',e.nome)),'[]') into result
  from public.clara_v9_convites c join public.clara_empresas e on e.id=c.empresa_id
  where c.email=actor_email and c.aceito_em is null;
  return jsonb_build_object('sucesso',true,'pendentes',result);
 end if;
 perform pg_advisory_xact_lock(hashtextextended(p_empresa::text,10));
 if p_acao='aceitar_readmissao' then
  select * into invitation from public.clara_v9_convites c where c.empresa_id=p_empresa and c.email=actor_email and c.aceito_em is null for update;
  if not found then raise exception 'Convite pendente não encontrado' using errcode='42501'; end if;
  -- Recheck inviter authority at acceptance; revoked administrators cannot grant access.
  if not exists(select 1 from public.clara_membros m where m.empresa_id=p_empresa and m.usuario_id=invitation.criado_por and m.ativo and (m.perfil='proprietario' or (m.perfil='gestor' and m.permissoes->'administrar_usuarios'='true'::jsonb and invitation.perfil='funcionario' and coalesce(invitation.permissoes->'administrar_usuarios','false')<>'true'::jsonb))) then raise exception 'Convite não autorizado. Solicite novo convite.' using errcode='42501'; end if;
  if exists(select 1 from public.clara_membros where empresa_id=p_empresa and usuario_id=uid and perfil='proprietario') then raise exception 'Proprietário protegido' using errcode='42501'; end if;
  insert into public.clara_membros(empresa_id,usuario_id,perfil,ativo,permissoes) values(p_empresa,uid,invitation.perfil,true,invitation.permissoes)
   on conflict(empresa_id,usuario_id) do update set perfil=excluded.perfil,ativo=true,permissoes=excluded.permissoes;
  update public.clara_v9_convites c set aceito_em=now() where c.empresa_id=p_empresa and c.email=actor_email;
  delete from public.clara_v9_vinculos_removidos where empresa_id=p_empresa and usuario_id=uid;
  insert into public.clara_v9_equipe_auditoria(empresa_id,autor,acao,alvo,depois) values(p_empresa,uid,p_acao,uid::text,to_jsonb(invitation));
  return jsonb_build_object('sucesso',true);
 end if;
 role:=public.clara_perfil_na_empresa(p_empresa);
 if not public.clara_pode_administrar_usuarios(p_empresa) then raise exception 'Administração não autorizada' using errcode='42501'; end if;
 if p_acao='listar' then
  select coalesce(jsonb_agg(jsonb_build_object('usuario_id',m.usuario_id,'nome',coalesce(u.raw_user_meta_data->>'nome',u.raw_user_meta_data->>'name',''),'email',u.email,'perfil',m.perfil,'ativo',m.ativo,'permissoes',m.permissoes,'removido',exists(select 1 from public.clara_v9_vinculos_removidos v where v.empresa_id=m.empresa_id and v.usuario_id=m.usuario_id)) order by m.criado_em),'[]') into result
  from public.clara_membros m join auth.users u on u.id=m.usuario_id where m.empresa_id=p_empresa;
  return jsonb_build_object('sucesso',true,'membros',result);
 end if;
 if p_permissoes is not null then
  if jsonb_typeof(p_permissoes)<>'object' then raise exception 'Permissões inválidas' using errcode='22023'; end if;
  foreach ar in array array['hoje','processos','indicadores','rotinas','diario','crescimento','clara','configuracoes'] loop
   entry:='{}';foreach ac in array array['ver','criar','editar','excluir'] loop
    entry:=entry||jsonb_build_object(ac,coalesce(p_permissoes->ar->ac='true'::jsonb,false));
   end loop;
   if entry->'ver' is distinct from 'true'::jsonb then entry:='{"ver":false,"criar":false,"editar":false,"excluir":false}'; end if;
   normalized:=normalized||jsonb_build_object(ar,entry);
  end loop;
  if p_permissoes->'administrar_usuarios'='true'::jsonb and (role<>'proprietario' or p_perfil is distinct from 'gestor') then raise exception 'Delegação restrita ao proprietário' using errcode='42501'; end if;
  normalized:=normalized||jsonb_build_object('administrar_usuarios',coalesce(p_permissoes->'administrar_usuarios'='true'::jsonb,false));
 end if;
 if p_acao='convidar' then
  p_email:=lower(trim(p_email));
  if p_email is null or p_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' or length(p_email)>254 or length(coalesce(trim(p_nome),'')) not between 1 and 160 or p_perfil is null or p_perfil not in ('gestor','funcionario') or p_permissoes is null then raise exception 'Convite inválido' using errcode='22023'; end if;
  if role<>'proprietario' and p_perfil<>'funcionario' then raise exception 'Gestor só convida colaboradores' using errcode='42501'; end if;
  select m.* into target from public.clara_membros m join auth.users u on u.id=m.usuario_id where m.empresa_id=p_empresa and lower(u.email)=p_email;
  if found and (target.perfil='proprietario' or target.usuario_id=uid or (role<>'proprietario' and (target.perfil='gestor' or target.permissoes->'administrar_usuarios'='true'::jsonb))) then raise exception 'Vínculo protegido' using errcode='42501'; end if;
  insert into public.clara_v9_convites(empresa_id,email,nome,perfil,permissoes,criado_por) values(p_empresa,p_email,p_nome,p_perfil,normalized,uid)
   on conflict(empresa_id,email) do update set nome=excluded.nome,perfil=excluded.perfil,permissoes=excluded.permissoes,criado_por=uid,criado_em=now(),aceito_em=null;
  insert into public.clara_v9_equipe_auditoria(empresa_id,autor,acao,alvo,depois) values(p_empresa,uid,p_acao,p_email,jsonb_build_object('perfil',p_perfil,'permissoes',normalized));
  return jsonb_build_object('sucesso',true,'email',p_email,'novo',not exists(select 1 from auth.users u where lower(u.email)=p_email),'readmissao_pendente',true,'mensagem','Convite registrado. A pessoa deverá confirmar o vínculo ao entrar.');
 end if;
 select * into target from public.clara_membros where empresa_id=p_empresa and usuario_id=p_usuario for update;
 if not found then raise exception 'Vínculo não encontrado' using errcode='22023'; end if;
 if target.perfil='proprietario' or p_usuario=uid or (role<>'proprietario' and (target.perfil='gestor' or target.permissoes->'administrar_usuarios'='true'::jsonb)) then raise exception 'Vínculo protegido' using errcode='42501'; end if;
 if p_acao='solicitar_reset' then
  select u.email into actor_email from auth.users u where u.id=p_usuario;
  return jsonb_build_object('sucesso',true,'email',actor_email);
 elsif p_acao='excluir' then
  update public.clara_membros set ativo=false where empresa_id=p_empresa and usuario_id=p_usuario;
  insert into public.clara_v9_vinculos_removidos(empresa_id,usuario_id,removido_por) values(p_empresa,p_usuario,uid) on conflict(empresa_id,usuario_id) do update set removido_por=uid,removido_em=now();
  update public.clara_v9_convites c set aceito_em=now() where c.empresa_id=p_empresa and c.email=(select lower(u.email) from auth.users u where u.id=p_usuario);
 elsif p_acao='atualizar' then
  if p_perfil is not null and (p_perfil not in ('gestor','funcionario') or (role<>'proprietario' and p_perfil<>'funcionario')) then raise exception 'Perfil não autorizado' using errcode='42501'; end if;
  if p_ativo=true and exists(select 1 from public.clara_v9_vinculos_removidos where empresa_id=p_empresa and usuario_id=p_usuario) then raise exception 'Readmissão exige novo convite e consentimento' using errcode='42501'; end if;
  update public.clara_membros set perfil=coalesce(p_perfil,perfil),ativo=coalesce(p_ativo,ativo),permissoes=case when p_permissoes is null then permissoes else normalized end where empresa_id=p_empresa and usuario_id=p_usuario;
 else raise exception 'Ação desconhecida' using errcode='22023'; end if;
 insert into public.clara_v9_equipe_auditoria(empresa_id,autor,acao,alvo,antes,depois) values(p_empresa,uid,p_acao,p_usuario::text,to_jsonb(target),(select to_jsonb(m) from public.clara_membros m where m.empresa_id=p_empresa and m.usuario_id=p_usuario));
 return jsonb_build_object('sucesso',true);
end $$;
revoke all on function public.clara_v9_equipe(uuid,text,uuid,text,text,text,jsonb,boolean) from public,anon,authenticated;
grant execute on function public.clara_v9_equipe(uuid,text,uuid,text,text,text,jsonb,boolean) to authenticated;
commit;

