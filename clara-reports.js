(function(root){
'use strict';
const dataContract=root.ClaraData||(typeof require!=='undefined'?require('./clara-data.js'):null);
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const titles={momento:'Meu Momento',manual:'Manual Vivo',playbook:'Playbook · Conversas e decisões',historico:'Histórico de Análises'};
const labels={nome:'Nome',titulo:'Título',objetivo:'Objetivo',area:'Área',passos_conhecidos:'Passo a passo',responsavel_pessoa_id:'Responsável',substituto_pessoa_id:'Substituto',ferramentas:'Ferramentas',pontos_decisao_dono:'Decisões da liderança',gargalos:'Gargalos',data:'Data',date:'Data',em:'Data e hora',criado_em:'Criado em',atualizado_em:'Atualizado em',texto:'Registro',text:'Registro',autor:'Autor',author:'Autor',tipo:'Tipo',type:'Tipo',resumo:'Resumo',assunto:'Assunto',pendencias:'Pendências',origem:'Origem',playbook:'Selecionado para Playbook',historico:'Histórico',status:'Situação',responsavel:'Responsável',ok:'Concluído',done:'Concluído',name:'Nome',notes:'Observações',person:'Responsável',value:'Valor',source:'Fonte',ultimo_valor:'Último valor',unidade:'Unidade',meta:'Meta',prazo:'Prazo',justificativa:'Justificativa',fonte_dados:'Fonte dos dados',formula:'Fórmula',periodicidade:'Periodicidade',descricao:'Descrição',description:'Descrição',steps:'Etapas',objective:'Objetivo',responsible:'Responsável',version:'Versão'};
function detail(value,people={}){
 if(value===null||value===undefined||value==='')return '<span class="muted">Não informado</span>';
 if(Array.isArray(value))return value.length?'<ol>'+value.map(v=>'<li>'+detail(v,people)+'</li>').join('')+'</ol>':'<span class="muted">Nenhum registro</span>';
 if(typeof value==='object')return '<dl>'+Object.entries(value).filter(([k])=>k!=='id').map(([k,v])=>'<div class="field"><dt>'+escape(labels[k]||k.replaceAll('_',' '))+'</dt><dd>'+detail(/responsavel_pessoa_id|substituto_pessoa_id|responsible|person/.test(k)?people[v]||v:v,people)+'</dd></div>').join('')+'</dl>';
 if(typeof value==='boolean')return value?'Sim':'Não';return escape(value);
}
function records(title,list,people){return `<section><h2>${escape(title)}</h2>${list.length?list.map((r,i)=>`<article><h3>${i+1}. ${escape(r.nome||r.name||r.titulo||r.assunto||'Registro')}</h3>${detail(r,people)}</article>`).join(''):'<p class="muted">Nenhum registro disponível nesta seleção.</p>'}</section>`;}
function build(kind,snapshot,options={}){
 if(!titles[kind])throw Error('Modelo desconhecido.');
 const s=snapshot,e=s.data.entidades,v=s.v3,p=s.pilot,company=s.data.empresa;
 const member=options.member;
 const allowed=area=>!member||dataContract.can(member,area,'ver');
 const people=Object.fromEntries(e.pessoas.map(x=>[x.id,x.nome_ou_funcao]));
 const chosen=(options.tabs||['hoje','processos','indicadores','rotinas','diario','crescimento']).filter(allowed);
 const stamp=options.generatedAt||new Date().toISOString();let body='';
 const indicators=[...e.indicadores,...v.indicators].map(i=>({...i,meta_confirmada:s.goals.goals[i.id]||null,medicoes:v.measurements[i.id]||[],arquivado:v.archivedIndicators.includes(i.id)}));
 if(kind==='manual'){
  if(!allowed('processos'))throw Error('Sem permissão para exportar processos.');
  const list=options.processId?e.processos.filter(x=>x.id===options.processId):e.processos;
  body=`<section><h2>01 / Sumário</h2><ol>${list.map(x=>`<li>${escape(x.nome)}</li>`).join('')}</ol></section>`+records('02 / Procedimentos aprovados',list,people);
 }else if(kind==='historico'||kind==='playbook'){
  if(!allowed('diario'))throw Error('Sem permissão para exportar o Diário de Bordo.');
  const list=(kind==='playbook'?v.claraHistory.filter(x=>x.playbook):v.claraHistory).slice().sort((a,b)=>String(a.data).localeCompare(String(b.data)));
  if(kind==='playbook'&&!list.length)throw Error('Selecione registros no Diário para o Playbook.');
  body=`<section><h2>01 / Visão do período</h2><div class="stats"><div>ANÁLISES<strong>${list.length}</strong>registradas</div><div>PENDÊNCIAS<strong>${list.reduce((n,x)=>n+(x.pendencias||[]).length,0)}</strong>registradas nos relatos</div></div></section>`+records('02 / Histórico cronológico',list,people);
  if(kind==='historico')body+=records('03 / Registros operacionais',v.journal,people);
 }else{
  if(!chosen.length)throw Error('Selecione ao menos uma aba autorizada.');
  const date=stamp.slice(0,10),late=v.claraTasks.filter(t=>!t.ok&&t.data<date);
  body=`<section><h2>01 / Visão geral do painel</h2><div class="stats"><div>EQUIPE<strong>${e.pessoas.length}</strong>pessoas cadastradas</div><div>PROCESSOS OFICIAIS<strong>${e.processos.length}</strong>Manual Vivo</div><div>INDICADORES<strong>${indicators.filter(x=>!x.arquivado).length}</strong>em acompanhamento</div></div><table><thead><tr><th>Sinal do painel</th><th>Quantidade</th></tr></thead><tbody><tr><td>Rotinas em atraso</td><td>${late.length}</td></tr><tr><td>Oportunidades em curso</td><td>${Object.values(p.running).filter(Boolean).length}</td></tr><tr><td>Propostas pendentes</td><td>${(v.propostasProcessos||[]).filter(x=>x.status==='pendente').length}</td></tr></tbody></table></section>`;
  if(chosen.includes('hoje'))body+=records('02 / Alertas e pendências operacionais',late,people);
  if(chosen.includes('processos'))body+=records('Processos aprovados',e.processos,people)+records('Processos em descoberta',v.processDrafts,people)+records('Propostas de processos',v.propostasProcessos,people)+records('Solicitações de alteração',v.processChanges,people);
  if(chosen.includes('indicadores'))body+=records('Indicadores e histórico de medições',indicators,people)+`<section><h2>Histórico de metas</h2>${detail(s.goals.history,people)}</section>`;
  if(chosen.includes('rotinas'))body+=records('Rotinas recorrentes',e.rotinas_rascunho,people)+records('Compromissos e histórico',v.claraTasks,people)+records('Agenda complementar',v.commitments,people)+`<section><h2>Execução das rotinas</h2>${detail(v.routineDone,people)}${detail(v.routineDates,people)}${detail(p.done,people)}</section>`;
  if(chosen.includes('diario'))body+=records('Diário de Bordo',v.claraHistory,people)+records('Registros operacionais',v.journal,people);
  if(chosen.includes('crescimento'))body+=records('Oportunidades', [...e.oportunidades,...p.suggestions],people)+`<section><h2>Planos e execução</h2>${detail({priorizadas:p.running,etapas_concluidas:p.oppDone,plano_de_acao:p.actionMeta,aprovacoes:p.approvals},people)}</section>`;
 }
 const theme=`@page{size:A4;margin:21mm 19mm 20mm;@bottom-left{content:'CLARA / GERENTE DE OPERAÇÕES';font-family:Arial;font-size:7pt;color:#132747}@bottom-right{content:counter(page);font-family:Arial;font-size:8pt;color:#71829c}}*{box-sizing:border-box}body{font:10pt Arial,sans-serif;color:#24344b;margin:0;line-height:1.5}@page :first{margin-top:0}.brandbar{height:10mm;margin:0 -19mm 9mm;background:#132747;border-bottom:2px solid #cba63b;-webkit-print-color-adjust:exact}h1{font-size:30pt;color:#132747;line-height:1.15;margin:7mm 0 3mm}h2{font-size:16pt;color:#132747;margin:9mm 0 3mm;break-after:avoid}h3{font-size:12pt;color:#132747;margin:5mm 0 2mm;break-after:avoid}.eyebrow{font-size:8pt;letter-spacing:1px;color:#b18c2b;font-weight:bold;margin-top:2mm}.muted,.sub{color:#71829c}.sub{margin-bottom:6mm}table{border-collapse:collapse;width:100%;margin:5mm 0}th,td{text-align:left;padding:3mm;border-bottom:1px solid #dce4ef;vertical-align:top}th{background:#f2f4f8;color:#132747;border-bottom:1px solid #cba63b}.stats{display:flex;gap:4mm;margin:4mm 0}.stats>div{flex:1;border:1px solid #dce4ef;padding:4mm;font-size:8pt;color:#71829c}.stats strong{display:block;font-size:26pt;color:#132747}.meta{background:#f2f4f8;padding:3mm;border-bottom:1px solid #cba63b;margin:5mm 0}article{border-top:1px solid #dce4ef;padding-top:2mm}dl{margin:0}.field{margin-bottom:3mm}dt{font-size:9pt;font-weight:bold;color:#132747;break-after:avoid}dd{margin:1mm 0 0;overflow-wrap:anywhere;white-space:pre-wrap}li{padding:1mm 0}ol{padding-left:6mm}p{orphans:3;widows:3}.integrity{margin-top:8mm;padding-top:4mm;border-top:1px solid #dce4ef;font-size:8pt;color:#71829c}button{padding:10px;background:#132747;color:white;border:0;border-radius:8px;cursor:pointer}@media print{.no-print{display:none!important}}`;
 const subtitle={momento:'Uma fotografia completa da operação, no instante da exportação.',manual:'Procedimentos aprovados para consulta e execução da equipe.',playbook:'Conversas, decisões e aprendizados selecionados no Diário de Bordo.',historico:'Registro cronológico das análises realizadas e seus desdobramentos.'}[kind];
 return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${escape(titles[kind])} — ${escape(company.nome)}</title><style>${theme}</style></head><body><button class="no-print" onclick="window.print()">Imprimir / salvar PDF</button><div class="brandbar"></div><div class="eyebrow">CLARA / GERENTE DE OPERAÇÕES</div><h1>${escape(titles[kind])}</h1><p class="sub">${subtitle}</p><div class="meta"><b>EMPRESA</b> ${escape(company.nome)}<br><b>CAPTURA</b> ${escape(stamp)}${kind==='momento'?'<br><b>ABAS SELECIONADAS</b> '+chosen.map(escape).join(' · '):''}</div>${body}<div class="integrity"><b>INTEGRIDADE DO DOCUMENTO</b><p>Dados confirmados e autorizados da empresa no momento da captura. Campos sem registro permanecem identificados como não informados. Todos os registros incluídos na seleção são preservados integralmente.</p></div></body></html>`;
}
root.ClaraReports={build,detail};
if(typeof module!=='undefined')module.exports={build,detail};
})(typeof window!=='undefined'?window:globalThis);


