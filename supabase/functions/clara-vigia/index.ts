// Clara · Vigia
// Verifica todo dia se as Claras dos clientes estão funcionando e escreve
// para a consultoria. Só escreve quando há algo. Relatório diário de
// "está tudo bem" é e-mail que se para de abrir.

const URL_SB = Deno.env.get("SUPABASE_URL")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND = Deno.env.get("RESEND_API_KEY") ?? "";
const REMETENTE = Deno.env.get("CLARA_EMAIL_REMETENTE") ?? "";
const PAINEL = Deno.env.get("CLARA_PAINEL_URL") ?? "https://clara.empreendacomia.online";
const SEGREDO = Deno.env.get("CLARA_CRON_SECRET") ?? "";

const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

const rpc = async (nome: string) => {
  const r = await fetch(`${URL_SB}/rest/v1/rpc/${nome}`, {
    method: "POST",
    headers: { apikey: SERVICE, authorization: `Bearer ${SERVICE}`, "content-type": "application/json" },
    body: "{}",
  });
  return r.ok ? await r.json() : null;
};

const dia = (n: number) => n === 1 ? "1 dia" : `${n} dias`;

Deno.serve(async (req) => {
  if (SEGREDO && req.headers.get("x-clara-cron") !== SEGREDO) {
    return new Response(JSON.stringify({ erro: "nao_autorizado" }), { status: 401, headers: { "content-type": "application/json" } });
  }

  const v = await rpc("clara_vigia_admin");
  const paras: string[] = (await rpc("clara_consultoria_emails")) ?? [];
  // Quem esperava o boletim: sem nome de empresa, um aviso de infraestrutura nao gera acao.
  const afetadas: string[] = (await rpc("clara_vigia_afetadas")) ?? [];
  if (!v) return new Response(JSON.stringify({ erro: "sem_leitura" }), { status: 500 });

  // ── o que quebrou ──
  const quebrou: string[] = [];
  const todos = afetadas.length ? ` <i>&mdash; sem receber: ${afetadas.map(esc).join(", ")}</i>` : " <i>&mdash; afeta todos os clientes</i>";
  for (const f of v.rotinas_falhas ?? []) quebrou.push(`A rotina <b>${esc(f.rotina)}</b> falhou: ${esc(f.erro ?? "sem mensagem")}${todos}`);
  for (const f of v.correio_falhas ?? []) quebrou.push(`O correio respondeu <b>${esc(f.codigo ?? "sem resposta")}</b>: ${esc(f.erro ?? "")}${todos}`);
  // Se ninguem tem boletim ligado, ninguem esperava receber: nao e problema.
  if (v.boletim_rodou_hoje === false && afetadas.length) {
    quebrou.push(`O <b>boletim da manhã não rodou hoje</b>. Ficaram sem receber: ${afetadas.map(esc).join(", ")}.`);
  }
  for (const f of v.emails_recusados ?? []) quebrou.push(`E-mail recusado na <b>${esc(f.empresa)}</b> (“${esc(f.assunto)}”): ${esc(f.erro)}`);
  for (const f of v.licencas_estouradas ?? []) quebrou.push(`A <b>${esc(f.empresa)}</b> passou do contrato de ${esc(f.tipo)}: ${esc(f.uso)} em uso, ${esc(f.limite)} contratadas.`);

  // ── o que pede a sua atenção, sem estar quebrado ──
  const olhar: string[] = [];
  for (const f of v.empresas_paradas ?? []) olhar.push(`Ninguém mexeu no painel da <b>${esc(f.empresa)}</b> há ${dia(f.dias)}.`);
  for (const f of v.convites_parados ?? []) olhar.push(`Na <b>${esc(f.empresa)}</b>, ${esc(f.email)} foi convidado há ${dia(f.dias)} e nunca criou a senha.`);
  for (const f of v.execucoes_abandonadas ?? []) olhar.push(`Na <b>${esc(f.empresa)}</b>, alguém começou o processo ${esc(f.processo)} há ${dia(f.dias)} e não concluiu.`);

  if (!quebrou.length && !olhar.length) {
    return new Response(JSON.stringify({ ok: true, motivo: "nada_a_relatar" }), { headers: { "content-type": "application/json" } });
  }
  if (!RESEND || !REMETENTE || !paras.length) {
    return new Response(JSON.stringify({ ok: false, motivo: "nao_configurado", quebrou, olhar }), { headers: { "content-type": "application/json" } });
  }

  const lista = (itens: string[], cor: string) =>
    itens.map((t) => `<tr><td style="padding:11px 0;border-bottom:1px solid #eef1f4;font:400 13.5px Inter,Arial;color:#1b2434;line-height:1.55">
      <span style="color:${cor};font-weight:700">■</span>&nbsp; ${t}</td></tr>`).join("");

  const bloco = (titulo: string, sub: string, itens: string[], cor: string) => !itens.length ? "" : `
    <tr><td style="padding:22px 28px 0">
      <div style="font:700 10px Inter,Arial;letter-spacing:1.3px;color:#8c99a8">${titulo}</div>
      <div style="font:400 12.5px Inter,Arial;color:#8c99a8;margin-top:4px">${sub}</div>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px">${lista(itens, cor)}</table>
    </td></tr>`;

  const html = `<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:100%;background:#fff;border-radius:14px;overflow:hidden;border:1px solid #dfe4ea;font-family:Inter,Arial,sans-serif">
    <tr><td style="background:${quebrou.length ? "#8f2f20" : "#102447"};padding:18px 28px">
      <div style="font:700 11px Inter,Arial;letter-spacing:1.6px;color:${quebrou.length ? "#ffd9d2" : "#c8a23a"}">
        ${quebrou.length ? "ALGO PAROU DE FUNCIONAR" : "VIGIA DA CLARA"}</div>
    </td></tr>
    <tr><td style="padding:24px 28px 0">
      <div style="font:700 19px Inter,Arial;color:#17243a;letter-spacing:-.4px">${quebrou.length ? "Precisa de você hoje" : "Dois sinais para olhar"}</div>
      <div style="font:400 13px Inter,Arial;color:#6b7a8c;margin-top:4px">${new Date().toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo", weekday: "long", day: "numeric", month: "long" })}</div>
    </td></tr>
    ${bloco("O QUE QUEBROU", "Mexa nisso antes que um cliente perceba.", quebrou, "#c4472b")}
    ${bloco("O QUE PEDE ATENÇÃO", "Não está quebrado — é cliente esfriando.", olhar, "#d78a32")}
    <tr><td style="padding:24px 28px 4px" align="center">
      <a href="${PAINEL}/painel.html" style="display:inline-block;background:#102447;color:#fff;text-decoration:none;font:650 14px Inter,Arial;padding:14px 32px;border-radius:9px">Abrir o painel</a>
    </td></tr>
    <tr><td style="padding:18px 28px 24px">
      <div style="border-top:1px solid #eceff2;padding-top:14px;font:400 11px Inter,Arial;color:#9aa6b4;line-height:1.6">
        Este e-mail só chega quando há algo. Silêncio quer dizer que as Claras dos seus clientes passaram o dia funcionando.
      </div>
    </td></tr></table>`;

  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${RESEND}`, "content-type": "application/json" },
    body: JSON.stringify({
      from: REMETENTE, to: paras,
      subject: quebrou.length ? `Vigia da Clara — ${quebrou.length} ${quebrou.length === 1 ? "problema" : "problemas"}` : "Vigia da Clara — sinais para olhar",
      html,
    }),
  });

  return new Response(JSON.stringify({ ok: r.ok, quebrou: quebrou.length, olhar: olhar.length }), { headers: { "content-type": "application/json" } });
});
