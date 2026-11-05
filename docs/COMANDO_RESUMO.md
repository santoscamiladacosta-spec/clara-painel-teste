# Comando +resumo (somente consultoria)

Uso: `+resumo <empresa> [período]` — um resumo por empresa, para montar o arquivo (PDF) do cliente.

- `+resumo Aurora` → mês anterior completo (a Clara avisa o período usado).
- `+resumo Aurora novembro`, `+resumo Aurora 01/11 a 30/11`, `+resumo Aurora últimos 30 dias` → período escolhido.

## Como funciona
- Todo dia às 23h50 (Brasília) a rotina `clara-retrato` grava uma foto de cada empresa ativa em `clara_retratos` (nota e faixa, processos, indicadores, tarefas, recados e equipe por pessoa). Só números; nunca fórmula nem fatores internos da nota.
- A ferramenta `clara_resumo` (servidor da Clara 1.7.0) chama `clara_resumo_periodo`, que só responde à consultoria (`clara_admins`). Compara a primeira e a última foto do período e soma o que foi concluído dentro dele.
- A foto diária começou em 05/11/2026. Antes disso só existem a nota mensal (`clara_dependencia_historico`) e os fatos com data (tarefas concluídas, recados, diário, alterações do painel). A ferramenta devolve `avisos` sempre que o período não está totalmente coberto.

## Roteiro para o comandos.md da skill da Clara
## +resumo — resumo de período de uma empresa (somente consultoria)
**Consultar:** `clara_resumo` com `nome_empresa` (sem chamar `clara_contexto` antes). Sem período, usa o mês anterior completo: diga isso em uma frase. Se houver mais de uma empresa com o nome, pergunte qual.
**Conduzir:** apresente início × fim da Nota de Dependência (nota e faixa), processos mapeados e publicados, processos críticos sem substituto, indicadores com meta e com valor, tarefas abertas e vencidas, e o desempenho da equipe (concluídas e no prazo). Repasse todos os `avisos`. Só afirme o que veio da ferramenta; se faltar foto de algum dia, diga. Não revele fórmula nem fatores da nota. Ofereça gerar o PDF para o cliente.
