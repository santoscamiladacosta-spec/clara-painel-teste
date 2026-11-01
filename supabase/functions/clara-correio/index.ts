// Clara · Correio
// Envia o que a Clara precisa mandar por e-mail. Chamado pelo agendador do banco (pg_cron),
// nunca pelo usuário. Três tarefas:
//   imediatos — avisos que não podem esperar (impedimento, alerta alto, convite)
//   boletins  — o dia de cada colaborador, na hora configurada da empresa
//   resumos   — o retrato do proprietário, nos dias configurados
// Regra que atravessa tudo: ninguém recebe e-mail vazio.

const URL_SB = Deno.env.get("SUPABASE_URL")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND = Deno.env.get("RESEND_API_KEY") ?? "";
const REMETENTE = Deno.env.get("CLARA_EMAIL_REMETENTE") ?? "";
const PAINEL = Deno.env.get("CLARA_PAINEL_URL") ?? "https://clara.empreendacomia.online";
const SEGREDO = Deno.env.get("CLARA_CRON_SECRET") ?? "";

const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

const api = (caminho: string, init: RequestInit = {}) =>
  fetch(`${URL_SB}${caminho}`, {
    ...init,
    headers: { apikey: SERVICE, authorization: `Bearer ${SERVICE}`, "content-type": "application/json", ...(init.headers ?? {}) },
  });

const sql = async (caminho: string) => {
  const r = await api(`/rest/v1/${caminho}`);
  return r.ok ? await r.json() : [];
};

const emailDoUsuario = async (usuarioId: string) => {
  const r = await api(`/auth/v1/admin/users/${usuarioId}`);
  if (!r.ok) return null;
  const u = await r.json();
  return u?.email ?? null;
};

// ───────────────────────── peças visuais ─────────────────────────

const RETRATO = `${PAINEL}/clara-email.png`;

const cabecalho = (empresa: string, grande = false) => `
<tr><td style="background:#102447;padding:${grande ? "30px 28px 26px" : "22px 28px"}">
  <table role="presentation" cellpadding="0" cellspacing="0"><tr>
    <td width="${grande ? 64 : 52}" style="padding-right:${grande ? 16 : 14}px"><img src="${RETRATO}" width="${grande ? 64 : 52}" height="${grande ? 64 : 52}" alt="Clara" style="display:block;border:0"></td>
    <td>
      <div style="font:800 ${grande ? 25 : 21}px Inter,Arial;color:#ffffff;letter-spacing:-.6px">Clara<span style="color:#c8a23a">.</span></div>
      <div style="font:600 9px Inter,Arial;letter-spacing:2.4px;color:#8ea3bd;margin-top:3px">GERENTE DE OPERAÇÕES${empresa ? " · " + esc(empresa.toUpperCase()) : ""}</div>
    </td></tr></table>
</td></tr>`;

const rodape = (empresa: string, nota: string) => `
<tr><td style="padding:18px 28px 24px">
  <div style="border-top:1px solid #eceff2;padding-top:14px;font:400 11px Inter,Arial;color:#9aa6b4;line-height:1.6">
    ${nota}<br>Clara, Gerente de Operações da ${esc(empresa)}.
  </div>
</td></tr>`;

const botao = (texto: string, href: string) => `
<tr><td style="padding:24px 28px 4px" align="center">
  <a href="${href}" style="display:inline-block;background:#102447;color:#ffffff;text-decoration:none;font:650 14px Inter,Arial;padding:14px 34px;border-radius:9px">${texto}</a>
</td></tr>`;

const titulo = (t: string, sub: string) => `
<tr><td style="padding:26px 28px 0">
  <div style="font:700 20px Inter,Arial;color:#17243a;letter-spacing:-.4px">${t}</div>
  <div style="font:400 13px Inter,Arial;color:#6b7a8c;margin-top:4px">${sub}</div>
</td></tr>`;

const secao = (t: string) => `<tr><td style="padding:20px 28px 0"><div style="font:700 10px Inter,Arial;letter-spacing:1.3px;color:#8c99a8">${t}</div></td></tr>`;

const cartao = (titulo: string, linha1: string, linha2: string, cor: string | null) => `
<tr><td style="padding:10px 28px 0">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e4e8ed;${cor ? `border-left:3px solid ${cor};` : ""}border-radius:10px">
    <tr><td style="padding:14px 16px">
      <div style="font:650 14px Inter,Arial;color:#17243a;line-height:1.4">${titulo}</div>
      ${linha1 ? `<div style="font:400 12px Inter,Arial;color:#6b7a8c;margin-top:5px">${linha1}</div>` : ""}
      ${linha2 ? `<div style="font:400 12px Inter,Arial;color:#6b7a8c;margin-top:7px">${linha2}</div>` : ""}
    </td></tr>
  </table>
</td></tr>`;

const envelope = (corpo: string) =>
  `<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:100%;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #dfe4ea;font-family:Inter,Arial,sans-serif">${corpo}</table>`;

// ───────────────────────── envio ─────────────────────────

const enviar = async (para: string, assunto: string, html: string) => {
  if (!RESEND || !REMETENTE) return { ok: false, motivo: "nao_configurado" };
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${RESEND}`, "content-type": "application/json" },
    body: JSON.stringify({ from: REMETENTE, to: [para], subject: assunto, html }),
  });
  return { ok: r.ok, motivo: r.ok ? "enviado" : `HTTP ${r.status}` };
};

const hojeISO = () => new Date().toISOString().slice(0, 10);
const dBR = (d: string) => (d ? d.split("-").reverse().join("/") : "");

// ───────────────────────── tarefa: avisos imediatos ─────────────────────────

async function imediatos() {
  // Só o que não pode esperar. O resto vai no boletim da manhã.
  const recados = await sql(
    `clara_recados?select=id,empresa_id,para_pessoa_id,tipo,assunto,mensagem,prazo,prioridade,criado_em` +
      `&email_enviado_em=is.null&email_erro=is.null&status=in.(aberto,visto)` +
      `&or=(prioridade.in.(alta,urgente),tipo.eq.alerta)&order=criado_em.asc&limit=40`,
  );
  const feitos: unknown[] = [];
  for (const r of recados) {
    const [emp] = await sql(`clara_empresas?id=eq.${r.empresa_id}&select=nome,email_ativo`);
    if (!emp || emp.email_ativo === false) continue;
    const [v] = await sql(`clara_vinculos?empresa_id=eq.${r.empresa_id}&pessoa_id=eq.${encodeURIComponent(r.para_pessoa_id)}&ativo=eq.true&select=usuario_id`);
    if (!v) continue;
    const dest = await emailDoUsuario(v.usuario_id);
    if (!dest) continue;

    const html = envelope(`
      <tr><td style="background:#8f2f20;padding:16px 28px">
        <div style="font:700 11px Inter,Arial;letter-spacing:1.6px;color:#ffd9d2">PRECISA DE VOCÊ AGORA</div></td></tr>
      ${titulo(esc(r.assunto), `${new Date(r.criado_em).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" })}${r.prazo ? " · prazo " + dBR(r.prazo) : ""}`)}
      <tr><td style="padding:18px 28px 0">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f8fa;border-radius:10px">
          <tr><td style="padding:15px 17px"><div style="font:400 13.5px Inter,Arial;color:#17243a;line-height:1.6">${esc(r.mensagem)}</div></td></tr>
        </table></td></tr>
      ${botao("Abrir o painel", PAINEL + "/painel.html")}
      ${rodape(emp.nome, "Avisos assim saem na hora. O resto espera o boletim da manhã.")}`);

    const res = await enviar(dest, r.assunto, html);
    await api(`/rest/v1/clara_recados?id=eq.${r.id}`, {
      method: "PATCH",
      headers: { prefer: "return=minimal" },
      body: JSON.stringify(res.ok ? { email_enviado_em: new Date().toISOString() } : { email_erro: res.motivo }),
    });
    feitos.push({ recado: r.id, ...res });
  }
  return feitos;
}

// ───────────────────────── tarefa: boletim do colaborador ─────────────────────────

async function boletins(hora: number, diaSemana: number) {
  const empresas = await sql(`clara_empresas?ativa=eq.true&email_ativo=eq.true&select=id,nome,email_hora,email_dias`);
  const feitos: unknown[] = [];
  for (const emp of empresas) {
    const h = Number(String(emp.email_hora ?? "07:30").slice(0, 2));
    const dias: number[] = emp.email_dias ?? [1, 2, 3, 4, 5];
    if (h !== hora || !dias.includes(diaSemana)) continue;

    const vincs = await sql(`clara_vinculos?empresa_id=eq.${emp.id}&ativo=eq.true&select=usuario_id,pessoa_id,perfil`);
    const registros = await sql(`clara_registros?empresa_id=eq.${emp.id}&arquivado=eq.false&colecao=in.(tarefas,processos,pessoas)&select=colecao,id,dados`);
    const tarefas = registros.filter((r: any) => r.colecao === "tarefas").map((r: any) => r.dados);
    const nomeDe = (pid: string) => registros.find((r: any) => r.colecao === "pessoas" && r.id === pid)?.dados?.nome ?? "";
    const h0 = hojeISO();

    for (const v of vincs) {
      if (!v.pessoa_id) continue;
      const minhas = tarefas.filter(
        (t: any) => t.responsavel_pessoa_id === v.pessoa_id && !["concluida", "concluída", "feito"].includes(String(t.status ?? "").toLowerCase()),
      );
      const paraHoje = minhas.filter((t: any) => t.prazo && t.prazo <= h0);
      const recados = await sql(
        `clara_recados?empresa_id=eq.${emp.id}&para_pessoa_id=eq.${encodeURIComponent(v.pessoa_id)}&status=in.(aberto,visto)&email_enviado_em=is.null&select=assunto,mensagem&limit=5`,
      );
      if (!paraHoje.length && !recados.length) continue; // dia tranquilo, nenhum e-mail

      const dest = await emailDoUsuario(v.usuario_id);
      if (!dest) continue;
      const primeiro = (nomeDe(v.pessoa_id) || "").split(" ")[0];

      const html = envelope(`
        ${cabecalho(emp.nome)}
        ${titulo(`Bom dia, ${esc(primeiro)}.`, new Date().toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo", weekday: "long", day: "numeric", month: "long" }))}
        ${paraHoje.length ? secao("PARA HOJE") : ""}
        ${paraHoje
          .map((t: any) =>
            cartao(
              esc(t.titulo ?? t.nome),
              t.prazo < h0 ? `Venceu ${dBR(t.prazo)}` : "Hoje",
              t.descricao ? `<b style="color:#17243a">Pronto quando:</b> ${esc(t.descricao)}` : "",
              t.prazo < h0 ? "#c4472b" : "#d78a32",
            ),
          )
          .join("")}
        ${recados.length ? secao(recados.length === 1 ? "UM RECADO" : "SEUS RECADOS") : ""}
        ${recados.map((r: any) => cartao(esc(r.assunto), "", esc(r.mensagem), null)).join("")}
        ${botao("Abrir o painel", PAINEL + "/painel.html")}
        ${rodape(emp.nome, "Você recebe este boletim só quando há algo no seu nome. Dia tranquilo, nenhum e-mail.")}`);

      const res = await enviar(dest, `Seu dia na ${emp.nome}`, html);
      feitos.push({ pessoa: v.pessoa_id, ...res });
    }
  }
  return feitos;
}

// ───────────────────────── tarefa: resumo do proprietário ─────────────────────────

async function resumos(hora: number, diaSemana: number) {
  const empresas = await sql(`clara_empresas?ativa=eq.true&email_ativo=eq.true&select=id,nome,email_hora,resumo_dias`);
  const feitos: unknown[] = [];
  for (const emp of empresas) {
    const h = Number(String(emp.email_hora ?? "07:30").slice(0, 2));
    const dias: number[] = emp.resumo_dias ?? [1, 3, 5];
    if (h !== hora || !dias.includes(diaSemana)) continue;

    const donos = await sql(`clara_vinculos?empresa_id=eq.${emp.id}&ativo=eq.true&perfil=eq.proprietario&select=usuario_id,pessoa_id`);
    if (!donos.length) continue;

    const dep = await (await api(`/rest/v1/rpc/clara_dependencia_admin`, { method: "POST", body: JSON.stringify({ p_empresa: emp.id }) })).json().catch(() => null);
    const registros = await sql(`clara_registros?empresa_id=eq.${emp.id}&arquivado=eq.false&colecao=in.(processos,pontos_abertos,pessoas)&select=colecao,id,dados`);
    const esperando = registros.filter((r: any) => r.colecao === "processos" && r.dados?.status_doc === "validacao");
    const abertos = registros.filter((r: any) => r.colecao === "pontos_abertos");
    const desde = new Date(Date.now() - 7 * 864e5).toISOString();
    const diario = await sql(`clara_diario?empresa_id=eq.${emp.id}&registrado_em=gte.${desde}&select=assunto,topicos&order=registrado_em.desc&limit=20`);
    const andou = diario.filter((d: any) => !/\((editar|criar|excluir|arquivar)\)\s*$/i.test(d.assunto)).slice(0, 5);

    if (!esperando.length && !abertos.length && !andou.length) continue;

    const nomeDe = (pid: string) => registros.find((r: any) => r.colecao === "pessoas" && r.id === pid)?.dados?.nome ?? "";
    const cor = (t: string[]) =>
      (t ?? []).includes("Problemas e obstáculos") ? "#c4472b" : (t ?? []).includes("Decisões") ? "#2f84b8" : "#19907e";

    for (const d of donos) {
      const dest = await emailDoUsuario(d.usuario_id);
      if (!dest) continue;
      const primeiro = (nomeDe(d.pessoa_id) || "").split(" ")[0];
      const nota = dep?.nota;

      const html = envelope(`
        ${cabecalho(emp.nome)}
        ${titulo(`${esc(primeiro)}, o retrato de hoje.`, new Date().toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo", weekday: "long", day: "numeric", month: "long" }))}
        ${nota != null ? `<tr><td style="padding:22px 28px 0">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f8fa;border-radius:11px"><tr>
            <td style="padding:18px 20px" width="42%">
              <div style="font:700 10px Inter,Arial;letter-spacing:1.2px;color:#8c99a8">NOTA DE DEPENDÊNCIA</div>
              <div style="font:750 34px Inter,Arial;color:#17243a;letter-spacing:-1.4px;margin:6px 0 2px">${esc(nota)}</div>
              <div style="font:600 12px Inter,Arial;color:#6b7a8c">Faixa ${esc(dep?.faixa ?? "")}</div>
            </td>
            <td style="padding:18px 20px;border-left:1px solid #e4e8ed">
              <div style="font:400 12.5px Inter,Arial;color:#6b7a8c;line-height:1.65">Ela cai quando um processo entra no Manual Vivo e quando uma segunda pessoa passa a executá-lo.</div>
            </td></tr></table></td></tr>` : ""}
        ${esperando.length || abertos.length ? secao("ESPERA DECISÃO SUA") : ""}
        ${esperando.map((p: any) => cartao(esc(p.dados.nome), "Revisado, aguardando a sua publicação", "", "#d78a32")).join("")}
        ${abertos.slice(0, 4).map((p: any) => cartao(esc(p.dados.titulo ?? p.dados.nome), esc(p.dados.detalhe ?? "Ponto em aberto do mapeamento"), "", null)).join("")}
        ${andou.length ? `${secao("O QUE ANDOU")}
          <tr><td style="padding:10px 28px 0"><div style="font:400 13px Inter,Arial;color:#516071;line-height:1.75">
          ${andou.map((d: any) => `<span style="color:${cor(d.topicos)}">■</span>&nbsp; ${esc(d.assunto)}`).join("<br>")}
          </div></td></tr>` : ""}
        ${botao("Ver no painel", PAINEL + "/painel.html")}
        ${rodape(emp.nome, "Para conversar sobre qualquer um destes pontos, é só me chamar.")}`);

      const res = await enviar(dest, `${emp.nome} — o retrato de hoje`, html);
      feitos.push({ dono: d.pessoa_id, ...res });
    }
  }
  return feitos;
}

// ───────────────────────── porta ─────────────────────────

Deno.serve(async (req) => {
  if (SEGREDO && req.headers.get("x-clara-cron") !== SEGREDO) {
    return new Response(JSON.stringify({ erro: "nao_autorizado" }), { status: 401, headers: { "content-type": "application/json" } });
  }
  const url = new URL(req.url);
  const job = url.searchParams.get("job") ?? "imediatos";
  const agora = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
  const hora = agora.getHours();
  const dia = agora.getDay() === 0 ? 7 : agora.getDay();

  try {
    const r =
      job === "boletins" ? await boletins(hora, dia) :
      job === "resumos" ? await resumos(hora, dia) :
      await imediatos();
    return new Response(JSON.stringify({ job, hora, dia, resultado: r }), { headers: { "content-type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ job, erro: String((e as Error).message ?? e) }), { status: 500, headers: { "content-type": "application/json" } });
  }
});
