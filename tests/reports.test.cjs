const {test}=require('node:test'),assert=require('node:assert/strict');
const {assemble}=require('../clara-data'),{build}=require('../clara-reports');
function fixture(){const s=assemble({id:'e',nome:'Empresa Real'},[]);s.data.entidades.processos=[{id:'p',nome:'Procedimento completo',passos_conhecidos:['Primeiro passo','Último passo sem corte'],ferramentas:['Ferramenta real'],substituto_pessoa_id:'Pessoa B'}];s.v3.claraHistory=Array.from({length:120},(_,i)=>({id:'h'+i,assunto:'Análise '+i,resumo:'Conteúdo '+i,pendencias:['Pendência '+i],playbook:true,data:'2026-10-18'}));s.v3.claraTasks=[{id:'t',titulo:'Compromisso',historico:[{texto:'Motivo completo de alteração',autor:'Pessoa A'}]}];s.v3.indicators=[{id:'i',nome:'Indicador personalizado',unidade:'%'}];s.v3.measurements.i=[{value:71,date:'2026-10-18',source:'Fonte real'}];return s;}
test('four report types include actual company and complete selected records',()=>{
 const s=fixture();for(const k of ['momento','manual','playbook','historico']){const html=build(k,s);assert(html.includes('Empresa Real'));assert(!html.includes('Brisa'));assert(!html.includes('Marina'));if(k!=='manual')assert(html.includes('Conteúdo 119'));}
 const manual=build('manual',s);assert(manual.includes('Último passo sem corte'));assert(manual.includes('Ferramenta real'));
 const momento=build('momento',s);for(const text of ['Motivo completo de alteração','Indicador personalizado','Fonte real'])assert(momento.includes(text));
});
test('reports escape imported HTML rather than execute it',()=>{const s=fixture();s.v3.claraHistory[0].resumo='<img src=x onerror=alert(1)>';const html=build('historico',s);assert(html.includes('&lt;img'));assert(!html.includes('<img'));});
test('report export obeys selected tabs and rejects unauthorized history',()=>{
 const s=fixture(),member={ativo:true,perfil:'funcionario',permissoes:{rotinas:{ver:true}}};
 assert.throws(()=>build('historico',s,{member}));const html=build('momento',s,{member,tabs:['rotinas']});assert(html.includes('Compromisso'));assert(!html.includes('Conteúdo 119'));assert(!html.includes('Procedimento completo'));
});
test('selected routine export does not disclose counts from other modules',()=>{
 const s=fixture();s.pilot.running={secret:true};s.v3.propostasProcessos=[{status:'pendente'}];
 const html=build('momento',s,{tabs:['rotinas']});
 for(const hidden of ['PROCESSOS OFICIAIS','INDICADORES<strong>','Oportunidades em curso','Propostas pendentes'])assert(!html.includes(hidden));
 assert(html.includes('Calendário e prazos'));
});
test('approved models retain extra fields, object steps and explicitly recorded decisions',()=>{
 const s=fixture();s.data.entidades.processos[0].passos_conhecidos=[{titulo:'Etapa detalhada',descricao:'Texto completo da etapa',criterio:'Critério específico'}];
 s.data.entidades.processos[0].campo_adicional='Controle adicional integral';
 const manual=build('manual',s);for(const text of ['FICHA DE PROCESSO','Texto completo da etapa','Critério específico','Controle adicional integral'])assert(manual.includes(text));
 s.v3.claraHistory[0].decisoes=['Decisão documentada'];s.v3.claraHistory[0].aprendizados=['Aprendizado documentado'];
 const playbook=build('playbook',s);for(const text of ['Linha do tempo','Registro detalhado','Decisão documentada','Aprendizado documentado'])assert(playbook.includes(text));
 s.v3.claraHistory[119].playbook=false;assert(!build('playbook',s).includes('Conteúdo 119'));
 assert(build('historico',s).includes('Situação não informada'));
});
test('activity chart counts recorded events only within selected tabs and capture period',()=>{
 const s=fixture();s.v3.claraTasks[0].data='2026-10-18';s.v3.claraTasks[0].historico=[{em:'2026-10-17T12:00:00Z',texto:'Evento registrado'}];
 const html=build('momento',s,{tabs:['rotinas'],generatedAt:'2026-10-18T12:00:00Z'});
 assert(html.includes('activity-chart'));assert(html.includes('<b>1</b>'));assert(!html.includes('<b>120</b>'));assert(!html.includes('Conteúdo 119'));
 const empty=build('momento',s,{tabs:['rotinas'],generatedAt:'2026-11-18T12:00:00Z'});assert(empty.includes('Nenhuma atividade datada registrada'));
});
