'use strict';
if(window.parent===window||!window.parent.CLARA_RUNTIME){
 document.documentElement.style.visibility='hidden';
 location.replace('./index.html');
 throw Error('Sessão e empresa devem ser validadas antes de abrir o painel.');
}
const claraRuntime=window.parent.CLARA_RUNTIME;
let claraDirty=false;
document.documentElement.style.visibility='hidden';
const claraMemory=new Map([
 ['clara_brisa_piloto_v3',JSON.stringify(claraRuntime.store.state.pilot)],
 ['clara_v3_brisa_revisao_2026',JSON.stringify(claraRuntime.store.state.v3)],
 ['clara_v9_indicadores_destaque',JSON.stringify(claraRuntime.store.state.destaques)],
 ['clara_brisa_v3_metas_demo_v1',JSON.stringify(claraRuntime.store.state.goals)],
]);
const claraStore={
 getItem:key=>claraMemory.get(key)??null,
 setItem(key,value){claraDirty=true;claraMemory.set(key,value);queueMicrotask(claraPersist);},
 removeItem(){throw Error('Reinicialização indisponível no painel operacional.');}
};
function claraSnapshot(){return {data:D,v3:V3,pilot,destaques:JSON.parse(claraMemory.get('clara_v9_indicadores_destaque')||'null'),goals:goalState};}
function claraPersist(){
 try{claraRuntime.store.enqueue(claraSnapshot());}
 catch(e){claraSyncStatus('error',e.message);}
}
function claraSyncStatus(status,detail){
 const el=document.getElementById('clara-sync');if(!el)return;
 el.textContent=status==='pending'?'Salvando alterações…':status==='saved'?'Alterações confirmadas no Supabase.':'Não foi possível salvar: '+detail+' Recarregue para recuperar os dados confirmados.';
 el.style.background=status==='error'?'#fff0ef':'#eef3f8';
 if(status==='saved')claraDirty=false;
 if(status==='error')document.querySelector('.app').inert=true;
}
window.addEventListener('beforeunload',e=>{if(claraRuntime.store.pending||claraRuntime.store.failed){e.preventDefault();e.returnValue='';}});
