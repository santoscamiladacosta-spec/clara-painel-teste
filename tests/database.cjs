const fs=require('fs');
const {PGlite}=require('@electric-sql/pglite');
(async()=>{
 const db=new PGlite();
 await db.exec(`create role anon;create role authenticated;create schema auth;
 create table auth.users(id uuid primary key,aud text,role text,email text,raw_user_meta_data jsonb default '{}');
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 grant usage on schema auth to authenticated;grant execute on function auth.uid() to authenticated;
 create table public.clara_empresas(id uuid primary key default gen_random_uuid(),nome text not null,criada_em timestamptz default now());
 create table public.clara_membros(empresa_id uuid not null references clara_empresas(id),usuario_id uuid not null references auth.users(id),perfil text not null check(perfil in ('proprietario','gestor','funcionario','consultora')),ativo boolean not null default true,criado_em timestamptz default now(),permissoes jsonb not null default '{}',primary key(empresa_id,usuario_id));
 create table public.clara_memoria_conversas(id uuid primary key default gen_random_uuid(),empresa_id uuid references clara_empresas(id),usuario_id uuid references auth.users(id),assunto text,resumo text,criado_em timestamptz default now());
 create table public.clara_memoria_itens(id uuid primary key default gen_random_uuid(),empresa_id uuid references clara_empresas(id),conversa_id uuid references clara_memoria_conversas(id),tipo text,conteudo text,status text default 'ativo',criado_em timestamptz default now());
 `);
 await db.exec(fs.readFileSync(__dirname+'/fixtures/security-baseline.sql','utf8'));
 // Reproduce the inspected memory policies locally for the existing regression suite.
 await db.exec(`alter table clara_memoria_conversas enable row level security;alter table clara_memoria_itens enable row level security;
 grant select,insert on clara_memoria_conversas,clara_memoria_itens to authenticated;
 create policy c_read on clara_memoria_conversas for select to authenticated using(clara_memoria_autorizado(empresa_id));
 create policy c_insert on clara_memoria_conversas for insert to authenticated with check(clara_memoria_autorizado(empresa_id) and usuario_id=auth.uid());
 create policy i_read on clara_memoria_itens for select to authenticated using(clara_memoria_autorizado(empresa_id));
 create policy i_insert on clara_memoria_itens for insert to authenticated with check(clara_memoria_autorizado(empresa_id) and exists(select 1 from clara_memoria_conversas c where c.id=conversa_id and c.empresa_id=clara_memoria_itens.empresa_id));`);
 const migration=fs.readFileSync(__dirname+'/../supabase/migrations/20261018090000_clara_v9.sql','utf8');
 await db.exec(migration);
 await db.exec(fs.readFileSync(__dirname+'/../supabase/migrations/20261018091000_clara_v9_equipe.sql','utf8'));
 await db.exec(fs.readFileSync(__dirname+'/../supabase/migrations/20261018092000_clara_v9_validacao.sql','utf8'));
 await db.exec(fs.readFileSync(__dirname+'/../supabase/migrations/20261018093000_clara_v9_permissoes_acao.sql','utf8'));
 console.log('PASS: additive migration compiles in isolated PostgreSQL');
 const tests=fs.readFileSync(__dirname+'/../supabase/tests/clara_v9_rls.sql','utf8');
 const results=await db.exec('begin;\n'+tests+'\nrollback;');
 console.log(JSON.stringify(results.filter(r=>r.rows?.length),null,2));
 const memory=fs.readFileSync(__dirname+'/../supabase/tests/clara_memoria_rls.sql','utf8');
 const regression=await db.exec(memory);console.log(JSON.stringify(regression.filter(r=>r.rows?.some(x=>x.resultado)),null,2));
 const team=await db.exec(fs.readFileSync(__dirname+'/../supabase/tests/clara_v9_equipe.sql','utf8'));console.log(JSON.stringify(team.filter(r=>r.rows?.some(x=>x.resultado)),null,2));
 await db.close();
})().catch(e=>{console.error(e.message,e.detail||'',e.where||'');process.exitCode=1;});

