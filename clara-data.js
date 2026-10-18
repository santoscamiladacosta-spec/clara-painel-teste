/* Shared data contract: no demo records, credentials or browser persistence. */
(function(root){
'use strict';
const areas=['hoje','processos','indicadores','rotinas','diario','crescimento','clara','configuracoes'];
const fields={
 processos:['processChanges','processDrafts','propostasProcessos'],
 indicadores:['indicators','measurements','archivedIndicators'],
 rotinas:['routineDone','routineDates','claraTasks','commitments'],
 diario:['journal','claraHistory'], configuracoes:['company'],
};
const entities={processos:['processos','procedimentos_rascunho','fichas_mapeamento','dependencia_proprietario','risco_continuidade'],indicadores:['indicadores'],rotinas:['rotinas_rascunho'],crescimento:['oportunidades'],configuracoes:['pessoas']};
const clone=x=>JSON.parse(JSON.stringify(x));
function emptyV3(){return {indicators:[],measurements:{},users:[],journal:[],week:0,weekPerson:'',routineDone:{},routineDates:{},company:{},processChanges:[],processDrafts:[],propostasProcessos:[],archivedIndicators:[],claraTasks:[],claraHistory:[],claraImports:[],commitments:[],calendarView:'semana',calendarOffset:0,journalView:'Registros',journalFilter:'Todos'};}
function assemble(company,rows){
 const data={empresa:{id:company.id,nome:company.nome,segmento:'',localizacao_geral:'',tamanho_equipe:0},entidades:{}};
 for(const names of Object.values(entities))for(const name of names)data.entidades[name]=[];
 const v3=emptyV3(),pilot={role:'',done:{},running:{},oppDone:{},suggestions:[],events:[],approvals:[],actionMeta:{}};
 let destaques=null,goals={goals:{},history:[]};
 for(const row of rows){
  for(const key of fields[row.area]||[])if(row.conteudo.v3?.[key]!==undefined)v3[key]=clone(row.conteudo.v3[key]);
  for(const key of entities[row.area]||[])if(row.conteudo.entidades?.[key]!==undefined)data.entidades[key]=clone(row.conteudo.entidades[key]);
  const pilotKeys=row.area==='crescimento'?['running','oppDone','suggestions','approvals','actionMeta']:row.area==='rotinas'?['done']:row.area==='diario'?['events']:[];
  for(const key of pilotKeys)if(row.conteudo.pilot?.[key]!==undefined)pilot[key]=clone(row.conteudo.pilot[key]);
  if(row.area==='configuracoes')Object.assign(data.empresa,row.conteudo.empresa||{}, {id:company.id,nome:company.nome});
  if(row.area==='indicadores'){destaques=row.conteudo.destaques??null;goals=row.conteudo.goals||goals;}
 }
 // Membership identities are not managed by V3.users; profiles come from the team API.
 v3.users=data.entidades.pessoas.map(p=>({id:p.id,name:p.nome_ou_funcao,active:true}));
 return {data,v3,pilot,destaques,goals};
}
function split(snapshot){
 const out=Object.fromEntries(areas.map(a=>[a,{}]));
 for(const [area,keys] of Object.entries(fields))out[area].v3=Object.fromEntries(keys.map(k=>[k,clone(snapshot.v3[k]) ]));
 for(const [area,keys] of Object.entries(entities))out[area].entidades=Object.fromEntries(keys.map(k=>[k,clone(snapshot.data.entidades[k]||[])]));
 out.crescimento.pilot=Object.fromEntries(['running','oppDone','suggestions','approvals','actionMeta'].map(k=>[k,clone(snapshot.pilot[k]||(['suggestions','approvals'].includes(k)?[]:{}))]));
 out.rotinas.pilot={done:clone(snapshot.pilot.done||{})};
 out.diario.pilot={events:clone(snapshot.pilot.events||[])};
 out.indicadores.destaques=snapshot.destaques;
 out.indicadores.goals=clone(snapshot.goals);
 out.configuracoes.empresa=clone(snapshot.data.empresa);
 return out;
}
function can(member,area,action){
 if(!member?.ativo)return false;
 if(member.perfil==='proprietario')return true;
 const p=member.permissoes?.[area];
 return p===true?(action==='ver'||member.perfil==='gestor'):p?.ver===true&&p?.[action]===true;
}
function validateImport(d,company){
 if(!d||d.formato!=='CLARA_ATUALIZACAO'||d.versao!=='1.0'||typeof d.id!=='string'||!d.id.trim()||d.id.length>120||!Array.isArray(d.alteracoes)||d.alteracoes.length<1||d.alteracoes.length>100)throw Error('Documento incompatível.');
 if(d.empresa_nome!==company.nome||(d.empresa_id&&d.empresa_id!==company.id))throw Error('Arquivo destinado a outra empresa.');
 for(const a of d.alteracoes){
  if(!a||!((a.aba==='diario'&&a.acao==='adicionar_registro')||(a.aba==='rotinas'&&a.acao==='criar_tarefa'))||typeof a.titulo!=='string'||!a.titulo.trim()||a.titulo.length>180||typeof a.resumo!=='string'||a.resumo.length>10000)throw Error('Ação inválida.');
  if(a.aba==='rotinas'&&(!/^\d{4}-\d{2}-\d{2}$/.test(a.data||'')||!Number.isFinite(Date.parse(a.data+'T12:00:00Z'))||new Date(a.data+'T12:00:00Z').toISOString().slice(0,10)!==a.data))throw Error('Data inválida.');
 }
 return d;
}
class Store{
 constructor(client,company,member,rows,onStatus){
  this.client=client;this.company=company;this.member=member;this.rows=rows;this.status=onStatus||(()=>{});
  this.state=assemble(company,rows);this.baseline=split(this.state);this.revisions=Object.fromEntries(rows.map(r=>[r.area,r.revisao]));this.queue=Promise.resolve();this.failed=false;this.pending=0;
 }
 enqueue(snapshot){
  if(this.failed)throw Error('Há uma falha de sincronização. Recarregue o painel.');
  const captured=split(clone(snapshot)); this.pending++;this.status('pending');
  this.queue=this.queue.then(async()=>{
   if(this.failed)return;
   const changes=areas.filter(a=>JSON.stringify(captured[a])!==JSON.stringify(this.baseline[a])).map(area=>({area,revisao:this.revisions[area]||0,conteudo:captured[area]}));
   if(!changes.length)return;
   const {data,error}=await this.client.rpc('clara_v9_salvar',{p_empresa:this.company.id,p_mudancas:changes});
   if(error)throw error;
   for(const c of changes){this.baseline[c.area]=c.conteudo;this.revisions[c.area]=data[c.area];}
  }).catch(err=>{this.failed=true;this.status('error',err.message||String(err));}).finally(()=>{this.pending--;if(!this.failed&&!this.pending)this.status('saved');});
  return this.queue;
 }
 async import(d,selection){
  validateImport(d,this.company);await this.queue;
  if(this.failed||this.pending)throw Error('Resolva a sincronização antes de importar.');
  if(!selection.length||selection.some(i=>!Number.isInteger(i)||i<0||i>=d.alteracoes.length))throw Error('Seleção inválida.');
  const {error}=await this.client.rpc('clara_v9_importar',{p_empresa:this.company.id,p_documento:d,p_selecao:[...new Set(selection)]});if(error)throw error;
 }
}
const api={areas,assemble,split,emptyV3,can,validateImport,Store};
if(typeof module!=='undefined')module.exports=api;else root.ClaraData=api;
})(typeof window!=='undefined'?window:globalThis);
