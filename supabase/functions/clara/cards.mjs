// GERADO por cards/gerar.mjs — não editar à mão.
const HTML = String.raw`<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Clara</title>
<style>
:root{--bg:#ffffff;--soft:#f5f7fa;--line:#e3e8ee;--ink:#1c3047;--muted:#6f7f93;--navy:#101e35;--blue:#2f6f99;--gold:#bd965c;--ok:#147f70;--okbg:#e7f6f2;--warn:#9c6b2b;--warnbg:#fff3dd;--bad:#a8423a;--badbg:#fdeceb;--chip:#edf2f7;--btnink:#fff}
:root[data-theme="dark"]{--bg:#18202b;--soft:#202b38;--line:#2f3c4b;--ink:#e6edf4;--muted:#9aa9b9;--navy:#d8b57a;--blue:#7fb6da;--gold:#d8b57a;--ok:#5fd0b8;--okbg:#173a35;--warn:#e9bd78;--warnbg:#3a2f1c;--bad:#f09b93;--badbg:#3d2322;--chip:#263343;--btnink:#18202b}
*{box-sizing:border-box}
html,body{margin:0;background:var(--bg);color:var(--ink);font:13px/1.45 Inter,"Segoe UI",system-ui,-apple-system,Arial,sans-serif}
#app{padding:16px 16px 14px}
.head{display:flex;gap:12px;align-items:center;margin-bottom:12px}
.av{width:38px;height:38px;border-radius:50%;flex:none;display:grid;place-items:center;background:linear-gradient(140deg,#101e35,#2c5476);color:#f2d9ac;font-weight:800;font-size:16px;border:2px solid #d8c19a}
.head h1{font-size:15px;margin:0;letter-spacing:-.2px}
.head p{margin:1px 0 0;color:var(--muted);font-size:12px}
.eyebrow{font-size:10px;letter-spacing:1.6px;text-transform:uppercase;font-weight:700;color:var(--gold);margin:14px 0 6px}
.list{display:grid;gap:7px}
.it{border:1px solid var(--line);border-radius:10px;padding:9px 11px;background:var(--bg);display:flex;gap:10px;align-items:center;justify-content:space-between}
.it.click{cursor:pointer}.it.click:hover{border-color:var(--blue)}
.it b{font-weight:600}.it small{display:block;color:var(--muted);font-size:11.5px;margin-top:1px}
.it .txt{min-width:0;flex:1}.it .txt b,.it .txt small{overflow:hidden;text-overflow:ellipsis}
.tags{display:flex;gap:5px;flex-wrap:wrap;justify-content:flex-end;flex:none}
.tag{font-size:10.5px;border-radius:99px;padding:3px 8px;background:var(--chip);color:var(--muted);font-weight:700;white-space:nowrap}
.tag.ok{background:var(--okbg);color:var(--ok)}.tag.warn{background:var(--warnbg);color:var(--warn)}.tag.bad{background:var(--badbg);color:var(--bad)}.tag.blue{color:var(--blue)}
.chips{display:flex;gap:6px;flex-wrap:wrap}
.chip{border:1px solid var(--line);background:var(--soft);color:var(--ink);border-radius:99px;padding:6px 11px;font-size:12px;font-weight:600;cursor:pointer}
.chip:hover{border-color:var(--blue);color:var(--blue)}
.row{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px}
.btn{border:1px solid var(--navy);background:var(--navy);color:var(--btnink);border-radius:9px;padding:8px 13px;font-size:12px;font-weight:700;cursor:pointer}
.btn.light{background:transparent;color:var(--ink);border-color:var(--line)}
.btn:disabled{opacity:.45;cursor:default}
.stats{display:flex;gap:8px;flex-wrap:wrap}
.stat{flex:1;min-width:110px;background:var(--soft);border-radius:10px;padding:9px 11px}
.stat strong{display:block;font-size:19px;letter-spacing:-.4px}
.stat span{font-size:11px;color:var(--muted)}
.ring{width:92px;height:92px;border-radius:50%;display:grid;place-items:center;flex:none}
.ring>div{width:72px;height:72px;border-radius:50%;background:var(--bg);display:grid;place-content:center;text-align:center}
.ring strong{font-size:22px;line-height:1}.ring small{font-size:9.5px;color:var(--muted)}
.dep{display:flex;gap:16px;align-items:center}
.bar{height:6px;background:var(--chip);border-radius:9px;overflow:hidden;margin-top:5px}.bar span{display:block;height:100%;border-radius:9px}
.hist{display:flex;align-items:flex-end;gap:5px;height:46px;margin-top:4px}
.hist div{flex:1;max-width:34px;background:var(--blue);opacity:.75;border-radius:4px 4px 0 0;min-height:3px;position:relative}
.hist div span{position:absolute;bottom:-15px;left:50%;transform:translateX(-50%);font-size:9px;color:var(--muted);white-space:nowrap}
.diff{border:1px solid var(--line);border-radius:11px;overflow:hidden;margin-bottom:8px}
.diff .dh{display:flex;justify-content:space-between;gap:8px;align-items:center;padding:9px 11px;background:var(--soft)}
.diff table{width:100%;border-collapse:collapse;font-size:12px}
.diff td{padding:6px 11px;border-top:1px solid var(--line);vertical-align:top}
.diff td:first-child{color:var(--muted);width:30%}
.old{color:var(--bad);text-decoration:line-through;opacity:.85}.new{color:var(--ok);font-weight:600}
.note{background:var(--soft);border-radius:10px;padding:10px 12px;color:var(--muted);font-size:12px}
.empty{color:var(--muted);font-size:12px;padding:10px;border:1px dashed var(--line);border-radius:10px}
.sent{color:var(--ok);font-size:12px;font-weight:600;align-self:center}
.more{color:var(--muted);font-size:11.5px;padding:2px 4px}
</style>
</head>
<body>
<div id="app"><div class="note">Carregando…</div></div>
<script>
(function(){
'use strict';
var CARD = window.__CLARA_CARD__ || 'contexto';
var app = document.getElementById('app');

/* ---------- Ponte MCP Apps (JSON-RPC via postMessage) ---------- */
var nid = 1, pend = {};
function send(m){ window.parent.postMessage(m, '*'); }
function req(method, params){
  var id = nid++; send({ jsonrpc:'2.0', id:id, method:method, params:params||{} });
  return new Promise(function(res, rej){ pend[id] = { res:res, rej:rej }; setTimeout(function(){ if(pend[id]){ delete pend[id]; rej(new Error('timeout')); } }, 20000); });
}
function notif(method, params){ send({ jsonrpc:'2.0', method:method, params:params||{} }); }
window.addEventListener('message', function(ev){
  if (ev.source !== window.parent) return;
  var m = ev.data; if (!m || m.jsonrpc !== '2.0') return;
  if (m.id != null && !m.method){ var p = pend[m.id]; if (p){ delete pend[m.id]; m.error ? p.rej(m.error) : p.res(m.result); } return; }
  if (m.method === 'ui/notifications/tool-result') return render(m.params || {});
  if (m.method === 'ui/notifications/host-context-changed') return tema(m.params || {});
  if (m.method === 'ui/notifications/tool-input' || m.method === 'ui/notifications/tool-input-partial' || m.method === 'ui/notifications/tool-cancelled') return;
  if (m.method === 'ui/resource-teardown' && m.id != null) return send({ jsonrpc:'2.0', id:m.id, result:{} });
  if (m.id != null) send({ jsonrpc:'2.0', id:m.id, error:{ code:-32601, message:'Método não suportado' } });
});
function tema(ctx){
  if (ctx && ctx.theme) document.documentElement.setAttribute('data-theme', ctx.theme === 'dark' ? 'dark' : 'light');
}
var ultimoH = 0;
function tamanho(){ var h = Math.ceil(document.documentElement.scrollHeight); if (Math.abs(h - ultimoH) > 1){ ultimoH = h; notif('ui/notifications/size-changed', { width: Math.ceil(document.documentElement.scrollWidth), height: h }); } }
if (window.ResizeObserver) new ResizeObserver(tamanho).observe(document.body);
req('ui/initialize', { appInfo:{ name:'clara-cards', version:'1.0.0' }, appCapabilities:{}, protocolVersion:'2026-01-26' })
  .then(function(r){ tema(r && r.hostContext); notif('ui/notifications/initialized', {}); tamanho(); })
  .catch(function(){ notif('ui/notifications/initialized', {}); });

/* Envia um pedido para a Clara na conversa: ela continua conduzindo e confirmando. */
function pedir(texto, botao){
  if (botao){ botao.disabled = true; }
  return req('ui/message', { role:'user', content:[{ type:'text', text:texto }] })
    .then(function(){ if (botao){ var s = document.createElement('span'); s.className = 'sent'; s.textContent = '✓ Enviado para a Clara'; botao.parentNode && botao.parentNode.appendChild(s); } })
    .catch(function(){ if (botao) botao.disabled = false; aviso('Escreva na conversa: ' + texto); });
}
function abrir(url){ req('ui/open-link', { url:url }).catch(function(){ aviso('Abra: ' + url); }); }
function aviso(t){ var n = document.createElement('div'); n.className = 'note'; n.style.marginTop = '10px'; n.textContent = t; app.appendChild(n); tamanho(); }

/* ---------- Utilidades ---------- */
function esc(s){ return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){ return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]; }); }
function hoje(){ var d = new Date(); return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0'); }
function dataBR(s){ if (!s) return ''; var p = String(s).slice(0,10).split('-'); return p.length === 3 ? p[2] + '/' + p[1] : s; }
function concluida(st){ return /^(concluid|feito|feita|finalizad|done|ok$)/i.test(String(st || '')); }
function saudacao(){ var h = new Date().getHours(); return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'; }
var PERFIL = { proprietario:'Proprietária(o)', gestor:'Gestor(a)', funcionario:'Colaborador(a)', temporario:'Temporário(a)', consultora:'Consultoria' };
var STATUS_DOC = { descoberta:['Em descoberta',''], validacao:['Aguardando aprovação','warn'], publicado:['Manual Vivo','ok'] };
var FAIXA = { baixa:['Baixa','ok','#1f9a7f'], moderada:['Moderada','blue','#3a86b0'], alta:['Alta','warn','#d39233'], critica:['Crítica','bad','#c4554b'] };
var COL = { tarefas:'Tarefas', processos:'Processos', indicadores:'Indicadores', rotinas:'Rotinas', compromissos:'Compromissos', pessoas:'Equipe', oportunidades:'Oportunidades', pontos_abertos:'Pontos em aberto', decisoes:'Decisões', ferramentas:'Ferramentas' };
var nomes = {};
function nomeDe(id){ return nomes[id] || ''; }
function titulo(d){ return d.titulo || d.nome || d.assunto || d.id || '(sem título)'; }
function tagPrazo(prazo, status){
  if (concluida(status)) return '<span class="tag ok">Concluída</span>';
  if (!prazo) return '';
  var h = hoje(); var p = String(prazo).slice(0,10);
  if (p < h) return '<span class="tag bad">Venceu ' + esc(dataBR(p)) + '</span>';
  if (p === h) return '<span class="tag warn">Hoje</span>';
  return '<span class="tag">' + esc(dataBR(p)) + '</span>';
}
function on(sel, fn){ Array.prototype.forEach.call(app.querySelectorAll(sel), function(el){ if (el['__on' + sel]) return; el['__on' + sel] = 1; el.addEventListener('click', function(ev){ ev.stopPropagation(); fn(el, ev); }); }); }
function ligarPedidos(){ on('[data-pedir]', function(el){ pedir(el.getAttribute('data-pedir'), el.tagName === 'BUTTON' ? el : null); }); on('[data-abrir]', function(el){ abrir(el.getAttribute('data-abrir')); }); }
function carregarNomes(depois){
  req('tools/call', { name:'clara_contexto', arguments:{} }).then(function(r){
    var c = r && r.structuredContent; (c && c.equipe || []).forEach(function(p){ nomes[p.pessoa_id] = p.nome; }); depois();
  }).catch(function(){});
}

/* ---------- Render ---------- */
var ultimo;
function render(res){
  ultimo = res;
  var d = res.structuredContent;
  if (!d && res.content && res.content[0] && res.content[0].text){ try { d = JSON.parse(res.content[0].text); } catch(e){} }
  if (res.isError || !d){ app.innerHTML = '<div class="note">A Clara explica na conversa o que aconteceu.</div>'; return tamanho(); }
  try { (VIEWS[CARD] || VIEWS.contexto)(d); } catch(e){ app.innerHTML = '<div class="note">Não consegui montar este card. A Clara segue pela conversa.</div>'; }
  ligarPedidos(); tamanho();
}
var cab = function(t, s){ return '<div class="head"><div class="av">C</div><div><h1>' + t + '</h1><p>' + s + '</p></div></div>'; };

var VIEWS = {
  contexto: function(d){
    var painel = d.painel_url || 'https://clara.empreendacomia.online/painel.html';
    if (d.sem_licenca_clara){
      app.innerHTML = cab('Olá' + (d.eu && d.eu.nome ? ', ' + esc(d.eu.nome) : ''), esc(d.empresa && d.empresa.nome || ''))
        + '<div class="note">Seu acesso nesta empresa é pelo <b>painel</b>: lá você acompanha e atualiza tarefas, processos e rotinas com a equipe. Para usar a Clara aqui na conversa, fale com o proprietário da empresa.</div>'
        + '<div class="row"><button class="btn" data-abrir="' + esc(painel) + '">Abrir o painel</button></div>';
      return;
    }
    if (d.escolher_empresa){
      app.innerHTML = cab('Com qual empresa vamos trabalhar?', 'Você tem acesso a mais de uma')
        + '<div class="list">' + (d.empresas || []).map(function(e){ return '<div class="it click" data-pedir="' + esc('Vamos trabalhar na empresa ' + e.nome + ' (empresa_id ' + e.empresa_id + ').') + '"><div class="txt"><b>' + esc(e.nome) + '</b><small>' + esc(PERFIL[e.perfil] || e.perfil || '') + '</small></div><span class="tag blue">Escolher</span></div>'; }).join('') + '</div>';
      return;
    }
    var eu = d.eu || {}, nome = eu.pessoa && eu.pessoa.nome ? eu.pessoa.nome.split(' ')[0] : '';
    var perfil = eu.perfil, gestao = perfil === 'proprietario' || perfil === 'consultora';
    var funcao = eu.pessoa && eu.pessoa.funcao ? eu.pessoa.funcao + ' · ' : '';
    var caixa = d.minha_caixa || { abertos:0, itens:[] };
    var h = cab(saudacao() + (nome ? ', ' + esc(nome) : '') + '!', esc(funcao) + esc(d.empresa && d.empresa.nome || '') + (funcao ? '' : ' · ' + esc(PERFIL[perfil] || perfil || '')));
    h += '<div class="stats"><div class="stat"><strong>' + (caixa.abertos || 0) + '</strong><span>recado(s) aberto(s) para você</span></div>'
      + '<div class="stat"><strong>' + ((d.equipe || []).length) + '</strong><span>pessoas na equipe</span></div>';
    if (gestao && d.licencas){ var L = d.licencas; h += '<div class="stat"><strong>' + L.clara_em_uso + (L.clara_limite != null ? '<span style="font-size:12px;font-weight:600"> / ' + L.clara_limite + '</span>' : '') + '</strong><span>com a Clara · ' + L.painel_em_uso + (L.painel_limite != null ? ' / ' + L.painel_limite : '') + ' no painel</span></div>'; }
    h += '</div>';
    var itens = (caixa.itens || []).slice(0, 4);
    h += '<div class="eyebrow">Sua caixa</div>';
    h += itens.length ? '<div class="list">' + itens.map(function(r){
      var pr = r.prioridade === 'urgente' ? '<span class="tag bad">Urgente</span>' : r.prioridade === 'alta' ? '<span class="tag warn">Alta</span>' : '';
      return '<div class="it click" data-pedir="' + esc('Vamos tratar o recado "' + r.assunto + '"' + (r.de ? ' de ' + r.de : '') + '.') + '"><div class="txt"><b>' + esc(r.assunto) + '</b><small>' + esc(r.de ? 'De ' + r.de : (r.tipo || 'recado')) + '</small></div><div class="tags">' + pr + tagPrazo(r.prazo) + '</div></div>';
    }).join('') + ((caixa.itens || []).length > 4 ? '<div class="more">+ ' + ((caixa.itens || []).length - 4) + ' na caixa</div>' : '') + '</div>'
      : '<div class="empty">Nada pendente na sua caixa. 👏</div>';
    var cmds = [['+prioridades','O que fazer primeiro'],['+pendências','O que está atrasado'],['+processos','Aprovar, revisar ou criar'],['+rotinas','Rotinas e compromissos'],['+diario','Diário de bordo']];
    if (gestao || perfil === 'gestor') cmds.splice(3, 0, ['+delegar','Distribuir tarefas']);
    if (gestao) cmds.push(['+dashboard','Visão geral e Nota de Dependência']);
    h += '<div class="eyebrow">Por onde começamos?</div><div class="chips">' + cmds.map(function(c){ return '<button class="chip" title="' + esc(c[1]) + '" data-pedir="' + esc(c[0]) + '">' + esc(c[0]) + '</button>'; }).join('') + '</div>';
    h += '<div class="row"><button class="btn light" data-abrir="' + esc(painel) + '">Abrir o painel</button></div>';
    app.innerHTML = h;
  },

  painel: function(d){
    var items = d.items || [], painel = d.painel_url || 'https://clara.empreendacomia.online/painel.html';
    var grupos = {}; items.forEach(function(r){ (grupos[r.colecao] = grupos[r.colecao] || []).push(r); });
    var ordem = ['tarefas','processos','indicadores','compromissos','rotinas','pontos_abertos','oportunidades','decisoes','pessoas','ferramentas'];
    var cols = Object.keys(grupos).sort(function(a,b){ var x = ordem.indexOf(a), y = ordem.indexOf(b); return (x < 0 ? 99 : x) - (y < 0 ? 99 : y); });
    function desenhar(){
      var h = cab('Painel', items.length + ' registro(s)' + (d.proxima_pagina != null ? ' · há mais' : ''));
      if (!items.length) h += '<div class="empty">Nada registrado nesta visão ainda.</div>';
      cols.forEach(function(c){
        var lista = grupos[c].slice();
        if (c === 'tarefas') lista.sort(function(a,b){ var A = a.dados || {}, B = b.dados || {}; return (concluida(A.status) - concluida(B.status)) || String(A.prazo || '9999').localeCompare(String(B.prazo || '9999')); });
        h += '<div class="eyebrow">' + esc(COL[c] || c) + ' · ' + lista.length + '</div><div class="list">';
        lista.slice(0, 7).forEach(function(r){
          var x = r.dados || {}, sub = [], tags = '';
          var resp = nomeDe(x.responsavel_pessoa_id) || x.responsavel || '';
          if (c === 'tarefas'){ if (resp) sub.push(resp); tags = tagPrazo(x.prazo, x.status) + (x.prioridade === 'alta' || x.prioridade === 'urgente' ? '<span class="tag warn">' + esc(x.prioridade) + '</span>' : ''); }
          else if (c === 'processos'){ var s = STATUS_DOC[x.status_doc] || [x.status_doc || 'Sem status','']; if (resp) sub.push(resp); tags = '<span class="tag ' + s[1] + '">' + esc(s[0]) + '</span>' + (x.critico ? '<span class="tag warn">Crítico</span>' : ''); }
          else if (c === 'indicadores'){ if (x.valor != null || x.valor_atual != null) sub.push('Atual: ' + (x.valor != null ? x.valor : x.valor_atual) + (x.unidade ? ' ' + x.unidade : '')); if (x.meta != null) sub.push('Meta: ' + x.meta); }
          else if (c === 'compromissos'){ if (x.data) sub.push(dataBR(x.data) + (x.hora ? ' · ' + x.hora : '')); }
          else if (c === 'pessoas'){ if (x.funcao) sub.push(x.funcao); }
          else { if (resp) sub.push(resp); if (x.frequencia) sub.push(x.frequencia); }
          h += '<div class="it click" data-pedir="' + esc('Quero tratar "' + titulo(x) + '" (' + (COL[c] || c).toLowerCase() + ').') + '"><div class="txt"><b>' + esc(titulo(x)) + '</b>' + (sub.length ? '<small>' + esc(sub.join(' · ')) + '</small>' : '') + '</div><div class="tags">' + tags + '</div></div>';
        });
        if (lista.length > 7) h += '<div class="more">+ ' + (lista.length - 7) + ' no painel</div>';
        h += '</div>';
      });
      h += '<div class="row"><button class="btn light" data-abrir="' + esc(painel) + '">Abrir o painel completo</button></div>';
      app.innerHTML = h; ligarPedidos(); tamanho();
    }
    desenhar();
    if (items.some(function(r){ return r.dados && r.dados.responsavel_pessoa_id; })) carregarNomes(desenhar);
  },

  dependencia: function(d){
    var f = FAIXA[d.faixa] || ['—','', '#9aa9b9'];
    var h = cab('Nota de Dependência', 'Quanto a operação depende de pessoas específicas · quanto menor, melhor');
    if (d.nota == null || d.status === 'nao_mensurado'){
      h += '<div class="note">Ainda não há processos avaliados para calcular a nota. Ela aparece assim que o mapeamento dos processos críticos for concluído.</div>';
      h += '<div class="row"><button class="btn" data-pedir="+processos">Ver processos</button></div>';
      app.innerHTML = h; return;
    }
    var pct = Math.max(0, Math.min(100, d.nota));
    h += '<div class="dep"><div class="ring" style="background:conic-gradient(' + f[2] + ' 0 ' + pct + '%,var(--chip) ' + pct + '% 100%)"><div><strong>' + d.nota + '</strong><small>de 100</small></div></div>'
      + '<div><span class="tag ' + f[1] + '">Dependência ' + esc(f[0]) + '</span><p style="margin:8px 0 0;color:var(--muted);font-size:12px">' + (d.processos_avaliados || 0) + ' de ' + (d.processos_inventariados || 0) + ' processo(s) avaliados' + (d.status === 'parcial' ? ' · avaliação parcial' : '') + '.</p></div></div>';
    var hist = d.historico || [];
    if (hist.length > 1){
      var mx = Math.max.apply(null, hist.map(function(x){ return x.nota || 0; }).concat([1]));
      h += '<div class="eyebrow">Evolução</div><div class="hist" style="margin-bottom:26px">' + hist.slice(-8).map(function(x){ return '<div style="height:' + Math.max(6, Math.round(100 * (x.nota || 0) / mx)) + '%" title="' + esc(x.mes + ': ' + x.nota) + '"><span>' + esc(String(x.mes).slice(5) + '/' + String(x.mes).slice(2,4)) + '</span></div>'; }).join('') + '</div>';
    }
    var procs = (d.processos || []).filter(function(p){ return p.nota != null; }).sort(function(a,b){ return b.nota - a.nota; });
    if (procs.length){
      h += '<div class="eyebrow">Onde está o maior risco</div><div class="list">' + procs.slice(0, 6).map(function(p){
        var pf = FAIXA[p.faixa] || ['—','','#9aa9b9'], s = STATUS_DOC[p.status_doc] || ['', ''];
        return '<div class="it click" data-pedir="' + esc('Quero reduzir a dependência do processo "' + p.nome + '".') + '"><div class="txt"><b>' + esc(p.nome) + '</b><div class="bar"><span style="width:' + p.nota + '%;background:' + pf[2] + '"></span></div></div><div class="tags">' + (s[0] ? '<span class="tag ' + s[1] + '">' + esc(s[0]) + '</span>' : '') + '<span class="tag ' + pf[1] + '">' + p.nota + '</span></div></div>';
      }).join('') + '</div>';
    }
    h += '<div class="row"><button class="btn" data-pedir="Como reduzimos a Nota de Dependência? Qual o próximo passo que você recomenda?">Como reduzir a nota?</button></div>';
    app.innerHTML = h;
  },

  propor: function(d){
    var diffs = d.diff || [];
    var ACAO = { criar:['Novo','ok'], editar:['Alteração','blue'], excluir:['Remoção','bad'] };
    var LABEL = { titulo:'Título', nome:'Nome', descricao:'Descrição', responsavel_pessoa_id:'Responsável', substituto_pessoa_id:'Substituto', prazo:'Prazo', status:'Status', status_doc:'Situação', prioridade:'Prioridade', objetivo:'Objetivo', gatilho:'Início', criterio_conclusao:'Concluído quando', etapas:'Etapas', frequencia:'Frequência', data:'Data', hora:'Hora', meta:'Meta', valor:'Valor', funcao:'Função', area:'Área', versao:'Versão', critico:'Crítico' };
    var OCULTOS = { id:1, fonte:1, criado_em:1, atualizado_em:1 };
    function val(k, v){
      if (v == null || v === '') return '—';
      if (k === 'status_doc' && STATUS_DOC[v]) return STATUS_DOC[v][0];
      if (/pessoa_id$/.test(k)) return nomeDe(v) || v;
      if (k === 'prazo' || k === 'data') return dataBR(v);
      if (Array.isArray(v)) return v.length + ' item(ns)';
      if (typeof v === 'object') return Object.keys(v).length + ' campo(s)';
      if (v === true) return 'Sim'; if (v === false) return 'Não';
      var s = String(v); return s.length > 140 ? s.slice(0, 137) + '…' : s;
    }
    function desenhar(){
      var h = cab('Confira antes de eu gravar', diffs.length + ' mudança(s) no painel · nada foi gravado ainda');
      diffs.forEach(function(x){
        var a = ACAO[x.acao] || [x.acao, ''], antes = x.antes || {}, depois = x.depois || {};
        var chaves = Object.keys(x.acao === 'excluir' ? antes : depois).filter(function(k){ return !OCULTOS[k]; });
        if (x.acao === 'editar') chaves = chaves.concat(Object.keys(antes).filter(function(k){ return !(k in depois) && !OCULTOS[k]; })).filter(function(k){ return JSON.stringify(antes[k]) !== JSON.stringify(depois[k]); });
        h += '<div class="diff"><div class="dh"><div><b>' + esc(titulo(x.acao === 'excluir' ? antes : depois)) + '</b><small style="display:block;color:var(--muted);font-size:11px">' + esc(COL[x.colecao] || x.colecao) + (x.motivo ? ' · ' + esc(x.motivo) : '') + '</small></div><span class="tag ' + a[1] + '">' + esc(a[0]) + '</span></div>';
        if (x.acao !== 'excluir' && chaves.length){
          h += '<table>' + chaves.slice(0, 10).map(function(k){
            return '<tr><td>' + esc(LABEL[k] || k.replace(/_/g, ' ')) + '</td><td>' + (x.acao === 'editar' ? '<span class="old">' + esc(val(k, antes[k])) + '</span> → ' : '') + '<span class="new">' + esc(val(k, depois[k])) + '</span></td></tr>';
          }).join('') + '</table>';
        }
        h += '</div>';
      });
      if (d.expira_em) h += '<div class="more">Esta proposta vale por 30 minutos.</div>';
      h += '<div class="row"><button class="btn" id="aprovar" data-pedir="Aprovo. Pode gravar.">Aprovar e gravar</button><button class="btn light" data-pedir="Quero ajustar antes de aprovar.">Quero ajustar</button></div>';
      app.innerHTML = h; ligarPedidos(); tamanho();
    }
    desenhar();
    var precisa = diffs.some(function(x){ var o = Object.assign({}, x.antes || {}, x.depois || {}); return Object.keys(o).some(function(k){ return /pessoa_id$/.test(k); }); });
    if (precisa) carregarNomes(desenhar);
  }
};
})();
</script>
</body>
</html>
`;
export const CARDS = ['contexto', 'painel', 'dependencia', 'propor'];
export const MIME_APP = 'text/html;profile=mcp-app';
export const uriCard = (nome) => `ui://clara/${nome}.html`;
export const htmlCard = (nome) => HTML.replace('<script>', `<script>window.__CLARA_CARD__=${JSON.stringify(nome)};</script>\n<script>`);
