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
