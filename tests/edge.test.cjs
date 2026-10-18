const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {stripTypeScriptTypes}=require('node:module');
function setup(options={}){
 const calls=[];let handler;
 const client={auth:{getUser:async()=>({data:{user:options.noUser?null:{id:'u'}},error:null}),resetPasswordForEmail:async(email)=>{calls.push(['reset',email]);return {};},admin:{inviteUserByEmail:async(email)=>{calls.push(['invite',email]);return {};}}},rpc:async(name,args)=>{calls.push(['rpc',args]);return options.denied?{error:{code:'42501',message:'Negado'}}:{data:options.data||{sucesso:true,membros:[]}};}};
 const src=stripTypeScriptTypes(fs.readFileSync(__dirname+'/../supabase/functions/clara-v9-equipe/index.ts','utf8').replace(/^import[^\n]+\n/,''));
 vm.runInNewContext(src,{Deno:{env:{get:()=>undefined},serve:f=>handler=f},createClient:()=>client,Response,URL,JSON});
 const request=(body,headers={Authorization:'Bearer session'})=>handler(new Request('https://test.invalid',{method:'POST',headers,body:JSON.stringify(body)}));
 return {request,calls};
}
test('Edge rejects absent or invalid session before authorization RPC',async()=>{for(const opts of [{},{noUser:true}]){const t=setup(opts);const r=await t.request({},opts.noUser?undefined:{});assert.equal(r.status,401);assert.equal(t.calls.length,0);}});
test('Edge rejects unapproved Origin',async()=>{const t=setup();const r=await t.request({}, {Authorization:'Bearer session',Origin:'https://evil.invalid'});assert.equal(r.status,403);assert.equal(t.calls.length,0);});
test('Edge sends no invitation if database authorization fails',async()=>{const t=setup({denied:true});const r=await t.request({acao:'convidar',empresa_id:'e'});assert.equal(r.status,403);assert.deepEqual(t.calls.map(c=>c[0]),['rpc']);});
test('Edge existing-account readmission does not send auth invitation email',async()=>{const t=setup({data:{sucesso:true,novo:false,email:'existing@test.invalid',readmissao_pendente:true}});const r=await t.request({acao:'convidar',empresa_id:'e'});assert.equal(r.status,200);assert.deepEqual(t.calls.map(c=>c[0]),['rpc']);assert.equal((await r.json()).novo,undefined);});
test('Edge new-account invitation follows database authorization',async()=>{const t=setup({data:{sucesso:true,novo:true,email:'new@test.invalid'}});const r=await t.request({acao:'convidar',empresa_id:'e',nome:'Pessoa'});assert.equal(r.status,200);assert.deepEqual(t.calls.map(c=>c[0]),['rpc','invite']);});
test('Edge password reset uses authorized member email from database',async()=>{const t=setup({data:{sucesso:true,email:'authorized@test.invalid'}});const r=await t.request({acao:'solicitar_reset',empresa_id:'e',usuario_id:'u',email:'attacker@test.invalid'});assert.equal(r.status,200);assert.deepEqual(t.calls[1],['reset','authorized@test.invalid']);});
test('Edge homologation accepts only its exact loopback origin and still validates session',async()=>{
 const t=setup();const r=await t.request({acao:'listar',empresa_id:'e'},{Authorization:'Bearer session',Origin:'http://127.0.0.1:8765'});
 assert.equal(r.status,200);assert.equal(r.headers.get('Access-Control-Allow-Origin'),'http://127.0.0.1:8765');assert.equal(t.calls[0][0],'rpc');
 const noSession=setup();assert.equal((await noSession.request({}, {Origin:'http://127.0.0.1:8765'})).status,401);
 for(const origin of ['http://127.0.0.1:8766','http://localhost:8765','https://evil.invalid']){const x=setup();assert.equal((await x.request({}, {Authorization:'Bearer session',Origin:origin})).status,403);assert.equal(x.calls.length,0);}
});
