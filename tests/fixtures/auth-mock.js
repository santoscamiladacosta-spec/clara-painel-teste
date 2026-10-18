window.__calls=[];
window.supabase={createClient(){
 let session=null,listener;const user={id:'10000000-0000-4000-8000-000000000081',email:'owner@test.invalid'};
 const members=[{empresa_id:'20000000-0000-4000-8000-000000000081',perfil:'proprietario',ativo:true,permissoes:{},clara_empresas:{nome:'Cliente de Teste'}}];
 const team=[{usuario_id:user.id,email:user.email,nome:'Titular',perfil:'proprietario',ativo:true,permissoes:{}},{usuario_id:'10000000-0000-4000-8000-000000000083',email:'employee@test.invalid',nome:'Pessoa',perfil:'funcionario',ativo:true,permissoes:{rotinas:{ver:true}}}];
 return {auth:{getSession:async()=>({data:{session}}),getUser:async()=>({data:{user:session?.user}}),onAuthStateChange:cb=>{listener=cb;return {data:{subscription:{unsubscribe(){}}}};},signInWithPassword:async()=>{session={user};return {};},signOut:async()=>{session=null;listener?.('SIGNED_OUT');return {};},resetPasswordForEmail:async()=>({}),updateUser:async()=>({})},
 from(table){let q={select(){return q;},eq(){return q;},then(resolve){resolve({data:table==='clara_membros'?members:[],error:null});}};return q;},
 rpc:async()=>({data:{}}),
 functions:{invoke:async(name,{body})=>{window.__calls.push(body);if(body.acao==='minhas_readmissoes')return {data:{sucesso:true,pendentes:[]}};if(body.acao==='listar')return {data:{sucesso:true,membros:team}};return {data:{sucesso:true,mensagem:'Concluído'}};}}
 };
}};
