'use strict';
CLARA_ACCESS={perfil:claraRuntime.member.perfil,permissoes:claraRuntime.member.permissoes,convitesHabilitados:claraRuntime.canManage};
pilot.role=CLARA_ACCESS.perfil;
function claraDirectory(list){V3.users=[...new Map([...claraRuntime.store.state.v3.users,...list].map(u=>[u.id,u])).values()].filter(u=>u.active!==false);}
claraDirectory(claraRuntime.directory||[]);
window.addEventListener('message',event=>{if(event.origin===location.origin&&event.source===window.parent&&event.data?.tipo==='CLARA_DIRECTORY'){claraDirectory(event.data.directory||[]);if(page!=='CONFIGURAÇÕES')render();}});
const persistedPilotEvents=structuredClone(pilot.events);
// Server audit records automatic pilot history with author and before/after data.
// Do not require unrelated Diary permissions just to complete a routine.
savePilot=()=>{pilot.events=structuredClone(persistedPilotEvents);claraStore.setItem('clara_brisa_piloto_v3',JSON.stringify(pilot));};
claraRuntime.store.status=claraSyncStatus;
const sync=document.createElement('div');sync.id='clara-sync';sync.role='status';sync.style.cssText='position:sticky;top:0;z-index:100;background:#eef3f8;color:#102447;padding:8px 16px;font:12px Segoe UI';sync.textContent='Dados carregados do Supabase.';document.querySelector('main').prepend(sync);
claraCanView=p=>ClaraData.can(claraRuntime.member,CLARA_PAGE_KEYS[p],'ver');
v3CanApprove=()=>['proprietario','gestor'].includes(CLARA_ACCESS.perfil)&&ClaraData.can(claraRuntime.member,'processos','editar');
processSteps=p=>Array.isArray(p.passos_conhecidos)?p.passos_conhecidos:[];
resetPilot=()=>toast('O histórico operacional é preservado.');
saveUser=savePermissions=()=>toast('Use a gestão de equipe na aba Configurações.');
const processFormWithDiagnosis=processNewForm;
processNewForm=id=>{processFormWithDiagnosis(id);const select=document.querySelector('#v3-modal [name=responsible]');if(select)for(const person of V3.users)if(![...select.options].some(o=>o.value===person.id))select.add(new Option(person.name,person.id));};
saveProcessChange=(e,id)=>{e.preventDefault();V3.processChanges.unshift({id:crypto.randomUUID(),processo_id:id,description:String(new FormData(e.target).get('text')||''),date:new Date().toISOString(),status:'Aguardando aprovação'});persistV3();closeModal();};
claraPreviewImport=d=>{
 try{ClaraData.validateImport(d,D.empresa);}catch(e){toast(e.message);return;}
 if(d.alteracoes.some(a=>!ClaraData.can(claraRuntime.member,a.aba,'criar'))){toast('Sem permissão para importar uma das abas.');return;}
 window.claraPendingImport=structuredClone(d);
 showModal(`<h2>Prévia de importação</h2><p>${esc(d.assunto||'Atualização da Clara')} · ${d.alteracoes.length} alterações</p><form onsubmit="claraApplyImport(event)">${d.alteracoes.map((a,i)=>`<label style="display:block;padding:13px;border:1px solid #dce6ef;border-radius:12px;margin:9px 0"><input type="checkbox" name="change" value="${i}" checked> <b>${esc(a.aba)} · ${esc(a.titulo)}</b><p>${esc(a.resumo)}</p><small>${esc(a.data||'')} · ${esc(a.responsavel||'')}</small></label>`).join('')}<button class="v3-btn">Aprovar e salvar alterações selecionadas</button></form>`);
};
claraApplyImport=async e=>{
 e.preventDefault();const d=window.claraPendingImport;if(!d)return;
 const selected=new FormData(e.target).getAll('change').map(Number),button=e.target.querySelector('button');button.disabled=true;
 try{await claraRuntime.store.import(d,selected);window.claraPendingImport=null;await claraRuntime.reload();}
 catch(error){toast(error.message);button.disabled=false;}
};
saveCompany=e=>{e.preventDefault();const f=new FormData(e.target);if(String(f.get('name')).trim()!==D.empresa.nome){toast('A alteração da razão/nome da empresa exige atualização do cadastro central. Os demais campos podem ser editados.');return;}V3.company={name:D.empresa.nome,segment:String(f.get('segment')),city:String(f.get('city'))};D.empresa.segmento=V3.company.segment;D.empresa.localizacao_geral=V3.company.city;persistV3();};
journalToTask=id=>{const j=V3.journal.find(x=>String(x.id)===String(id));if(!j)return;claraAddTask();const input=document.querySelector('#v3-modal [name=titulo]');if(input)input.value=String(j.text||j.assunto||'').slice(0,180);};
addOpp=addSuggestion;
claraDownloadMoment=e=>{e.preventDefault();const f=new FormData(e.target),tabs=f.getAll('abas').map(p=>CLARA_PAGE_KEYS[p]).filter(a=>ClaraData.can(claraRuntime.member,a,'ver'));if(!tabs.length){toast('Selecione ao menos uma aba autorizada.');return;}if(claraRuntime.store.pending||claraRuntime.store.failed){toast('Aguarde a confirmação das alterações antes de exportar.');return;}const modules=ClaraData.split(claraSnapshot());claraDownload('CLARA_MEU_MOMENTO.json',{formato:'CLARA_MOMENTO',versao:'1.0',empresa_id:D.empresa.id,empresa_nome:D.empresa.nome,gerado_em:new Date().toISOString(),destinatario:f.get('destino'),abas_selecionadas:tabs,dados:Object.fromEntries(tabs.map(a=>[a,modules[a]]))});closeModal();};
async function claraOpenReport(kind,options={}){
 if(claraRuntime.store.pending||claraRuntime.store.failed){toast('Aguarde a confirmação das alterações antes de exportar.');return;}
 try{const html=ClaraReports.build(kind,claraSnapshot(),{...options,directory:V3.users.map(u=>({id:u.id,nome_ou_funcao:u.name})),member:claraRuntime.member});const popup=window.open('','_blank');if(!popup){toast('Permita a abertura do relatório no navegador.');return;}popup.opener=null;popup.document.open();popup.document.write(html);popup.document.close();}
 catch(error){toast(error.message);}
}
claraPrintDocument=kind=>{
 if(kind!=='momento'){claraOpenReport(kind==='manual'?'manual':'historico');return;}
 const options=pages.filter(p=>!['CONFIGURAÇÕES','MINHA CLARA'].includes(p)&&claraCanView(p));
 showModal(`<h2>Meu Momento · PDF</h2><p>Selecione as abas autorizadas que deseja incluir.</p><form onsubmit="claraPrintMoment(event)">${options.map(p=>`<label style="display:block;padding:8px"><input type="checkbox" name="tab" value="${CLARA_PAGE_KEYS[p]}" checked> ${esc(p)}</label>`).join('')}<button class="v3-btn">Abrir relatório para salvar em PDF</button></form>`);
};
function claraPrintMoment(e){e.preventDefault();const tabs=new FormData(e.target).getAll('tab');claraOpenReport('momento',{tabs});closeModal();}
exportManual=id=>claraOpenReport('manual',{processId:id});
claraExportPlaybook=()=>claraOpenReport('playbook');
chart=()=>{const values=allIndicators().filter(i=>i.ultimo_valor!==null&&i.ultimo_valor!==undefined);return values.length?`<ul>${values.map(i=>`<li>${esc(i.nome)}: ${esc(fmtMetric(i,i.ultimo_valor))}</li>`).join('')}</ul>`:'<p class="hint">Sem medições registradas.</p>';};
dependencyCard=()=>''; // No inferred score until a real measurement exists.
const claraApprovedRender=render;
render=()=>{
 if(!claraCanView(page)){page=pages.find(claraCanView);if(!page){document.getElementById('content').textContent='Nenhuma aba autorizada. Contate a administração.';document.getElementById('nav').replaceChildren();return;}}
 claraApprovedRender();
 const content=document.getElementById('content');
 // All dynamic text is escaped; retain the approved component structure.
 if(page==='HOJE'){
  const late=content.querySelector('.clara-late-card')?.outerHTML||'';
  const indicators=allIndicators(),selected=claraDestaquesAtuais(indicators);
  const opportunities=[...E.oportunidades,...pilot.suggestions];
  const focus=opportunities.filter(o=>pilot.running[o.id]);
  content.innerHTML=title('Sua operação hoje','Sua operação em um só lugar: o que aconteceu, o que está em andamento e onde agir.')+late+
  `<div class="grid four">${stat('Equipe',V3.users.length+' pessoas','Pessoas disponíveis para sua operação')}${stat('Processos oficiais',E.processos.length,'Manual Vivo')}${stat('Indicadores',indicators.length,'Em acompanhamento')}${stat('Oportunidades em curso',focus.length,'Planos em execução')}</div>
  <div class="grid two" style="margin-top:17px">${card(`<div class="flex"><h2>Visão de resultados</h2><button class="btn light" onclick="go('INDICADORES')">Ver painel →</button></div><div class="rings">${selected.map(i=>`<div class="ring"><div><strong style="font-size:15px">${esc(fmtMetric(i,indicatorValue(i)))}</strong><small>${esc(i.nome)}</small></div></div>`).join('')||'<p class="hint">Sem indicadores registrados.</p>'}</div>`)}
  ${card(`<div class="flex"><h2>Em foco</h2>${tag('Gestão ativa','ok')}</div><div class="stack">${focus.map(o=>`<div class="item"><strong>${esc(o.titulo)}</strong><p>${esc(o.descricao||'')}</p><button class="btn light" onclick="go('CRESCIMENTO')">Abrir plano →</button></div>`).join('')||'<p class="hint">Nenhuma oportunidade priorizada.</p>'}</div>`)}</div>
  <div class="grid two" style="margin-top:17px">${card(`<h2>Rotinas da equipe</h2>${E.rotinas_rascunho.map(r=>`<div class="item"><strong>${esc(r.titulo)}</strong><p>${esc(nameOf(r.responsavel_pessoa_id))} · ${pilot.done[r.id]?'Feito':'Em aberto'}</p></div>`).join('')||'<p class="hint">Nenhuma rotina cadastrada.</p>'}<button class="btn light" onclick="go('ROTINAS')">Abrir rotinas →</button>`)}
  ${card(`<h2>Propostas de processos</h2>${(V3.propostasProcessos||[]).filter(p=>p.status==='pendente').map(p=>`<div class="item"><b>${esc(p.titulo)}</b><p>${esc(p.descricao||'')}</p><button class="btn light" onclick="claraReviewProposal('${safeId(p.id)}')">Revisar proposta</button></div>`).join('')||'<p class="hint">Nenhuma proposta pendente.</p>'}`)}</div>`;
 }
 for(const el of content.querySelectorAll('.eyebrow'))if(el.textContent.includes('BRISA'))el.textContent='CLARA / '+D.empresa.nome;
 const brand=document.querySelector('.top>strong');if(brand)brand.textContent=D.empresa.nome+' / Painel Clara V9';
 const footer=document.querySelector('.sidefoot');if(footer){for(const n of [...footer.childNodes])if(n.nodeType===3)n.textContent='';const small=footer.querySelector('span');if(small)small.textContent=D.empresa.localizacao_geral||'';}
 const hero=content.querySelector('.pb-eyebrow');if(hero)hero.textContent=D.empresa.nome+' · CLARA';
};
const originalToast=toast;
toast=t=>originalToast(claraDirty&&/salv|publicad|cadastrad|registrad|aplicad|atualizad|adicionad|arquivad|removid/i.test(t)?'Alteração recebida. Aguarde a confirmação de salvamento no topo do painel.':t);
const guards={
 processos:{criar:['processNewForm','saveProcessDraft','requestProcessChange','saveProcessChange'],editar:['processSend','processApprove','processRework','claraDecideProposal']},
 indicadores:{criar:['indicatorForm','saveIndicatorV3','measureForm','saveMeasure'],editar:['goalForm','saveGoal','claraEditarDestaques','claraSetDestaques'],excluir:['archiveIndicator']},
 rotinas:{criar:['claraAddTask','claraSaveTask','commitmentForm','saveCommitment'],editar:['completeRoutine','setRoutineDate','claraEditTask','claraToggleTask','claraSaveTaskHistory','toggleCommitment']},
 diario:{criar:['saveJournal'],editar:['claraSelectHistory']},
 crescimento:{criar:['addSuggestion','addOpp'],editar:['setRunning','checkOpp','saveActionMeta']},
 configuracoes:{editar:['saveCompany']}
};
for(const [area,actions] of Object.entries(guards))for(const [action,names] of Object.entries(actions))for(const name of names){
 const fn=window[name];if(typeof fn!=='function')continue;
 window[name]=function(...args){
  const needsEdit=(name==='processNewForm'&&args[0])||(name==='saveProcessDraft'&&args[1]!=='new');
  if(!ClaraData.can(claraRuntime.member,area,needsEdit?'editar':action)){args[0]?.preventDefault?.();toast('Você não possui permissão para esta ação.');return;}
  return fn.apply(this,args);
 };
}
document.addEventListener('click',e=>{
 const target=e.target.closest('button,input,select,textarea,a');if(!target)return;
 if(claraRuntime.store.failed){e.preventDefault();e.stopImmediatePropagation();return;}
},true);
render();
document.title='Painel Clara V9 — '+D.empresa.nome;
const claraFooter=document.querySelector('.footnote');if(claraFooter)claraFooter.textContent='Clara / '+D.empresa.nome;
document.documentElement.style.visibility='visible';


