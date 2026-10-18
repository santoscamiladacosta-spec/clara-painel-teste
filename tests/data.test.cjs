const {test}=require('node:test');
const assert=require('node:assert/strict');
const {assemble,split,can,Store,validateImport}=require('../clara-data');
const company={id:'test-company',nome:'Cliente real'};
const member={ativo:true,perfil:'proprietario'};
test('empty tenant contains no demonstration records',()=>{
 const s=assemble(company,[]);assert.equal(s.data.empresa.nome,company.nome);
 for(const records of Object.values(s.data.entidades))assert.deepEqual(records,[]);
 assert.deepEqual(s.v3.claraHistory,[]);assert.deepEqual(s.pilot.events,[]);
});
test('module hydration refuses cross-module payload injection',()=>{
 const s=assemble(company,[{area:'rotinas',conteudo:{entidades:{processos:[{id:'fake-approved'}]},v3:{claraHistory:[{id:'fake-diary'}]},pilot:{approvals:['fake']}}}]);
 assert.deepEqual(s.data.entidades.processos,[]);assert.deepEqual(s.v3.claraHistory,[]);assert.deepEqual(s.pilot.approvals,[]);
});
test('module round trip preserves tasks histories proposals custom indicators and highlights',()=>{
 const s=assemble(company,[]);s.v3.claraTasks=[{id:'t',historico:[{texto:'Prazo alterado',autor:'u'}]}];s.v3.claraHistory=[{id:'h',resumo:'Decisão'}];s.v3.propostasProcessos=[{id:'p',status:'pendente'}];s.v3.indicators=[{id:'i',nome:'Taxa'}];s.destaques=['i'];s.goals={goals:{i:{meta:10}},history:[{id:'g'}]};
 const rows=Object.entries(split(s)).map(([area,conteudo])=>({area,conteudo}));
 const restored=assemble(company,rows);
 for(const k of ['claraTasks','claraHistory','propostasProcessos','indicators'])assert.deepEqual(restored.v3[k],s.v3[k]);assert.deepEqual(restored.destaques,['i']);assert.deepEqual(restored.goals,s.goals);
});
test('permissions fail closed and honor per-action and legacy formats',()=>{
 assert.equal(can(null,'rotinas','ver'),false);assert.equal(can({...member,ativo:false},'rotinas','ver'),false);
 assert.equal(can({ativo:true,perfil:'funcionario',permissoes:{rotinas:{ver:true,criar:true}}},'rotinas','editar'),false);
 assert.equal(can({ativo:true,perfil:'funcionario',permissoes:{rotinas:true}},'rotinas','criar'),false);
 assert.equal(can({ativo:true,perfil:'gestor',permissoes:{rotinas:true}},'rotinas','criar'),true);
});
const doc=()=>({formato:'CLARA_ATUALIZACAO',versao:'1.0',id:'conversation-1',empresa_nome:company.nome,alteracoes:[{aba:'rotinas',acao:'criar_tarefa',titulo:'Ação',resumo:'Real',data:'2026-10-19'}]});
test('import rejects wrong tenant, mismatched action and impossible dates',()=>{
 assert.equal(validateImport(doc(),company).id,'conversation-1');
 for(const mutate of [d=>d.empresa_nome='Outro',d=>d.empresa_id='outro',d=>d.alteracoes[0].acao='adicionar_registro',d=>d.alteracoes[0].data='2026-02-30']){const d=doc();mutate(d);assert.throws(()=>validateImport(d,company));}
});
test('queued writes use latest confirmed revisions without dropping later edits',async()=>{
 const calls=[];const client={rpc:async(name,args)=>{calls.push(args);await new Promise(r=>setTimeout(r,5));return {data:{rotinas:calls.length}};}};
 const store=new Store(client,company,member,[]);const s=store.state;
 s.v3.claraTasks.push({id:'a'});store.enqueue(s);s.v3.claraTasks.push({id:'b'});store.enqueue(s);await store.queue;
 assert.equal(calls.length,2);assert.equal(calls[0].p_mudancas[0].revisao,0);assert.equal(calls[1].p_mudancas[0].revisao,1);assert.equal(calls[0].p_mudancas[0].conteudo.v3.claraTasks.length,1);assert.equal(calls[1].p_mudancas[0].conteudo.v3.claraTasks.length,2);
});
test('failure blocks subsequent writes and import, does not claim saved',async()=>{
 const events=[];const client={rpc:async()=>({error:{message:'conflito'}})};const store=new Store(client,company,member,[],(...x)=>events.push(x));
 store.state.v3.claraTasks.push({id:'a'});await store.enqueue(store.state);assert.equal(store.failed,true);assert.throws(()=>store.enqueue(store.state));await assert.rejects(()=>store.import(doc(),[0]));assert.equal(events.some(e=>e[0]==='saved'),false);
});
