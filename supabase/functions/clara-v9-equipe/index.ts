import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.102.0';

const site = Deno.env.get('CLARA_SITE_URL') || 'https://santoscamiladacosta-spec.github.io/clara-painel-teste/';
const origin = new URL(site).origin;
// Origem local exata da homologação autorizada; não aceita outros hosts ou portas.
const homologationOrigin = 'http://127.0.0.1:8765';
const allowedOrigins = new Set([origin,homologationOrigin]);
const baseCors = {'Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info','Access-Control-Allow-Methods':'POST, OPTIONS','Vary':'Origin'};
Deno.serve(async req=>{
 const requestOrigin=req.headers.get('origin');
 const cors={...baseCors,'Access-Control-Allow-Origin':requestOrigin&&allowedOrigins.has(requestOrigin)?requestOrigin:origin};
 const json=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{...cors,'Content-Type':'application/json','Cache-Control':'no-store'}});
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
 if(req.method!=='POST')return json({sucesso:false,erro:'Método inválido'},405);
 if(requestOrigin&&!allowedOrigins.has(requestOrigin))return json({sucesso:false,erro:'Origem inválida'},403);
 try{
  const auth=req.headers.get('authorization');if(!auth?.startsWith('Bearer '))return json({sucesso:false,erro:'Autenticação necessária'},401);
  const url=Deno.env.get('SUPABASE_URL')!,key=Deno.env.get('SUPABASE_ANON_KEY')!;
  const client=createClient(url,key,{global:{headers:{Authorization:auth}},auth:{persistSession:false,autoRefreshToken:false}});
  const {data:{user},error:authError}=await client.auth.getUser();if(authError||!user)return json({sucesso:false,erro:'Sessão inválida'},401);
  const raw=await req.text();if(raw.length>30000)return json({sucesso:false,erro:'Solicitação muito grande'},413);
  const b=JSON.parse(raw);
  if(typeof b.acao!=='string'||typeof b.empresa_id!=='string')return json({sucesso:false,erro:'Solicitação inválida'},400);
  const {data,error}=await client.rpc('clara_v9_equipe',{p_empresa:b.empresa_id,p_acao:b.acao,p_usuario:b.usuario_id??null,p_email:b.email??null,p_nome:b.nome??null,p_perfil:b.perfil??null,p_permissoes:b.permissoes??null,p_ativo:b.ativo??null});
  if(error)return json({sucesso:false,erro:error.message},error.code==='42501'?403:400);
  if(b.acao==='convidar'&&data.novo){
   const admin=createClient(url,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
   const {error:inviteError}=await admin.auth.admin.inviteUserByEmail(data.email,{redirectTo:site,data:{nome:b.nome}});
   if(inviteError)return json({sucesso:false,erro:'O convite ficou registrado, mas o e-mail não foi enviado. Tente novamente pela gestão de equipe.'},502);
   return json({...data,readmissao_pendente:false,mensagem:'Convite enviado. A pessoa deverá definir a senha e confirmar o vínculo com a empresa.'});
  }
  if(b.acao==='solicitar_reset'){
   const {error:resetError}=await client.auth.resetPasswordForEmail(data.email,{redirectTo:site});
   if(resetError)return json({sucesso:false,erro:'Não foi possível solicitar a recuperação. Tente novamente.'},502);
   return json({sucesso:true,mensagem:'Solicitação enviada ao serviço de autenticação.'});
  }
  // Never return internal new-user lookup flags to the UI.
  const {novo,email,...safe}=data;return json(safe);
 }catch{return json({sucesso:false,erro:'Falha ao processar a solicitação'},400);}
});
