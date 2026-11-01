# Modelos de e-mail da Clara — aprovados em 01/11/2026

Os quatro modelos estão em `modelos-email.html`, lado a lado, com conteúdo de exemplo.
Abra no navegador para ver. O retrato vem de `clara-email.png`, servido junto com o painel.

## Regras de envio combinadas

| Para quem | Quando | O que leva |
|---|---|---|
| Cada colaborador | Dias úteis, de manhã (horário por empresa) | Tarefas com prazo, recados, processos dele. **Só sai se tiver conteúdo.** |
| Proprietário | Segunda, quarta e sexta | Nota de Dependência com a variação e o porquê, o que espera decisão, o que andou, recomendação. |
| Qualquer pessoa | Na hora | Impedimento, alerta de prioridade alta, convite de acesso. |

## Decisões de desenho

- Sem imagens além do retrato: caixa corporativa bloqueia imagem e o modelo tem que chegar inteiro assim.
- O nome "Clara." é texto, não imagem — o cabeçalho sobrevive ao bloqueio.
- O retrato tem o fundo navy embutido e é circular na própria imagem, porque o Outlook ignora cantos arredondados.
- No aviso imediato o retrato fica na assinatura, não no topo: urgência primeiro.
- A Clara assina como Gerente de Operações da empresa, nunca como ferramenta.
- Nenhum e-mail pede resposta por e-mail: sempre leva ao painel ou à conversa.
- O colaborador não pode desligar o próprio boletim; quem configura é o proprietário.

## O que falta para ligar

1. Conta no Resend, domínio `empreendacomia.online` verificado, chave de API.
2. Chave e remetente guardados como secrets no Supabase (`RESEND_API_KEY`, `CLARA_EMAIL_REMETENTE`).
3. Mover o envio do servidor MCP para o banco, para que ações do painel também gerem e-mail.
4. Rotina agendada (pg_cron) para os dois boletins, com horário e dias úteis por empresa.
