const http=require('http'),fs=require('fs'),path=require('path'),assert=require('assert/strict');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..');fs.mkdirSync(path.resolve(root,'test-results'),{recursive:true});
const harness=`<!doctype html><script src="/clara-data.js"></script><script>
const rows=[];const client={rpc:async(name,args)=>{if(name==='clara_v9_salvar'){const revisions={};for(const c of args.p_mudancas){let r=rows.find(r=>r.area===c.area);if(!r){r={area:c.area,revisao:0};rows.push(r);}r.conteudo=c.conteudo;r.revisao++;revisions[r.area]=r.revisao;}return {data:revisions};}throw Error(name);}};
const company={id:'20000000-0000-4000-8000-000000000091',nome:'Cliente de Teste'};
const member={ativo:true,perfil:'proprietario',permissoes:{}};
window.CLARA_RUNTIME={member,canManage:true,store:new ClaraData.Store(client,company,member,rows),reload:async()=>{CLARA_RUNTIME.store=new ClaraData.Store(client,company,member,rows);document.getElementById('panel').src='/painel-demonstracao.html?reload='+Date.now();}};
</script><iframe id="panel" src="/painel-demonstracao.html" style="width:100%;height:100vh;border:0"></iframe>`;
const server=http.createServer((req,res)=>{const pathname=new URL(req.url,'http://localhost').pathname;if(pathname==='/__test'){res.setHeader('Content-Type','text/html');return res.end(harness);}const file=path.resolve(root,'.'+pathname);if(!file.startsWith(root+path.sep)){res.statusCode=403;return res.end();}try{res.setHeader('Content-Type',file.endsWith('.js')?'application/javascript':'text/html');res.end(fs.readFileSync(file));}catch{res.statusCode=404;res.end();}});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const url='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({executablePath:process.env.CLARA_BROWSER_EXECUTABLE,headless:true,args:['--no-sandbox']});
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(url+'/__test');const frame=page.frames().find(f=>f.url().includes('painel-demonstracao'));await frame.waitForSelector('#nav button');
 console.log('Navigation tabs:',await frame.locator('#nav button').count());
 for(const tab of ['HOJE','PROCESSOS','INDICADORES','ROTINAS','DIÁRIO DE BORDO','CRESCIMENTO','MINHA CLARA','CONFIGURAÇÕES']){
  await frame.evaluate(tab=>go(tab),tab);console.log('Tab',tab,'content',await frame.locator('#content').innerText().then(t=>t.slice(0,100)));
 }
 await frame.evaluate(()=>{go('ROTINAS');claraAddTask();});
 await frame.locator('[name=titulo]').fill('Compromisso persistente');await frame.locator('[name=data]').fill('2026-10-21');await frame.locator('#v3-modal form').evaluate(f=>f.requestSubmit());
 await frame.waitForFunction(()=>document.getElementById('clara-sync').textContent.includes('confirmadas'));
 await page.evaluate(()=>CLARA_RUNTIME.reload());await page.waitForTimeout(500);
 const reloaded=page.frames().find(f=>f.url().includes('painel-demonstracao'));
 assert.equal(await reloaded.evaluate(()=>V3.claraTasks[0].titulo),'Compromisso persistente');console.log('PASS: task recovered from confirmed backend mock after iframe reload');
 await reloaded.evaluate(()=>go('HOJE'));await page.screenshot({path:path.resolve(__dirname,'../test-results/ui-home.png'),fullPage:true});
 assert.deepEqual(errors,[]);console.log('PASS: eight tabs rendered without JavaScript errors');
 const auth=await browser.newPage();const authErrors=[];auth.on('pageerror',e=>authErrors.push(e.message));auth.on('dialog',d=>d.accept(d.type()==='prompt'?'EXCLUIR':undefined));
 await auth.route('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js',route=>route.fulfill({contentType:'application/javascript',body:fs.readFileSync(path.resolve(__dirname,'fixtures/auth-mock.js'),'utf8')}));
 await auth.goto(url+'/index.html');await auth.locator('#email').fill('owner@test.invalid');await auth.locator('#password').fill('test-password');await auth.locator('#login-btn').click();
 await auth.waitForFunction(()=>window.CLARA_RUNTIME?.store&&document.getElementById('demo-frame').contentDocument?.querySelector('#nav button'));
 let panel=auth.frames().find(f=>f.url().includes('painel-demonstracao'));await panel.waitForSelector('#nav button');
 await panel.evaluate(()=>go('CONFIGURAÇÕES'));await panel.waitForSelector('#clara-equipe-tbody button');
 assert.equal(await panel.locator('#clara-equipe-tbody tr').count(),2);
 await panel.getByRole('button',{name:'Redefinir senha',exact:true}).click();await panel.waitForFunction(()=>document.getElementById('clara-equipe-msg').textContent.includes('Solicitação'));
 assert((await auth.evaluate(()=>window.__calls)).some(x=>x.acao==='solicitar_reset'));console.log('PASS: authenticated team management and password reset route');
 await Promise.all([auth.waitForEvent('framenavigated',{predicate:f=>f.url().includes('painel-demonstracao')}),auth.evaluate(()=>CLARA_RUNTIME.reload())]);panel=auth.frames().find(f=>f.url().includes('painel-demonstracao'));await panel.waitForFunction(()=>typeof go==='function'&&document.querySelector('#nav button'));await panel.evaluate(()=>go('CONFIGURAÇÕES'));await panel.waitForSelector('#clara-equipe-tbody button');
 assert.deepEqual(authErrors,[]);console.log('PASS: team controls remount after refresh without detached DOM failures');
 await panel.locator('#clara-sair-sidebar').click();await auth.waitForFunction(()=>!window.CLARA_RUNTIME);assert.equal(await auth.locator('#demo-frame').getAttribute('src'),null);console.log('PASS: logout unloads company data');
 await browser.close();server.close();
})().catch(e=>{console.error(e);server.close();process.exit(1);});




