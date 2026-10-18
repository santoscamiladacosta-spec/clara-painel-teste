# Clara V9 — candidata à homologação

A interface parte de CLARA_V9_DESTAQUES_INDICADORES.zip. As oito abas e os estilos originais foram mantidos; valores e textos fixos da empresa fictícia foram substituídos por informações do cliente ou estados vazios.

## Backend aplicado em 18/10/2026

Projeto: `fluegdtbcuaomuhybbzv`.

- Migrações `20261018090000`, `20261018091000`, `20261018092000` e `20261018093000`: aplicadas após autorização específica.
- Novas tabelas de módulos, auditoria, importações, convites e remoções lógicas. Nenhuma tabela anterior foi apagada ou recriada.
- RPCs validam usuário ativo, empresa, aba, ação, conteúdo e revisão. Alterações concorrentes retornam conflito, sem sobrescrever silenciosamente.
- Importações JSON são validadas novamente no banco, gravadas atomicamente e registradas por identificador e empresa.
- Função `clara-v9-equipe` separada, com verificação JWT habilitada, `auth.getUser()` e autorização transacional no banco. `clara-convidar-funcionario` e `clara-memoria-mcp` anteriores foram preservadas.
- Exclusão de acesso é lógica: desativa o vínculo e registra a remoção; a conta global e os históricos permanecem. Readmissão de vínculo removido exige novo convite e aceite da pessoa.
- Não há fallback de dados operacionais para localStorage. O armazenamento do SDK de autenticação continua responsável pela sessão.

As tabelas anteriores tinham 1 empresa, 1 vínculo e 0 registros operacionais/de memória na conferência realizada. Isso não significa que os dados fictícios do ZIP foram migrados: eles não foram inseridos.

## Testes executados

- 21 testes Node: hidratação, isolamento dos módulos, permissões, recuperação de dados, fila de gravação, falhas, validação de JSON, proteção da Edge Function e conteúdo completo dos relatórios.
- PostgreSQL isolado (PGlite), com as funções auxiliares de segurança inspecionadas no projeto: migrações, RLS, isolamento entre empresas, permissões por ação, remoção e readmissão, concorrência, auditoria, importação atômica, repetição, datas inválidas e regressão da memória.
- Chrome local com backend simulado: oito abas, criação e recuperação de compromisso, login, administração de equipe, solicitação de recuperação de senha, remontagem dos controles e logout.
- Relatórios: quatro tipos renderizados em A4 com dados exclusivamente sintéticos de homologação; preservação de 120 análises verificada em teste de conteúdo. Esses PDFs não são entregáveis de cliente.
- Supabase online: `clara-v9-equipe` ativa e chamada anônima recusada com HTTP 401. URLs de autenticação e redirecionamento conferem com o painel publicado; cadastro público desabilitado.

Os testes do PostgreSQL isolado não equivalem a um teste completo com JWT real no navegador e envio real de e-mail. Nenhuma senha de usuário foi redefinida e nenhum convite real foi enviado nesta execução.

## Relatórios

`clara-reports.js` produz HTML paginado para salvar como PDF pelo diálogo de impressão do navegador. Meu Momento permite selecionar as abas; Manual Vivo usa processos aprovados; Playbook usa análises selecionadas; Histórico usa todas as análises e registros disponíveis. Não há cortes `slice` para reduzir o conteúdo dos documentos.

Os quatro modelos oficiais foram recebidos e inspecionados em 18/10/2026, incluindo Manual Vivo e Playbook do pacote CLARA_MODELOS_CORRIGIDOS.zip. O gerador foi ajustado para fichas de processo, linha do tempo, cartões de detalhes, calendário, histórico completo, gráfico de registros datados e identificação de captura. Textos ilustrativos dos modelos não entram nos dados do cliente. A composição usa cores e hierarquia das referências; a fonte do navegador é Arial, enquanto as referências usam DejaVu Sans, portanto não se declara reprodução tipográfica exata. A homologação visual humana permanece pendente.

Também foi corrigido o resumo do Meu Momento: contagens e atividade respeitam as abas selecionadas e autorizadas. Situações, decisões e aprendizados ausentes não são inventados. Campos adicionais e etapas em objetos são preservados no detalhamento.

## Pendências que impedem a publicação definitiva

1. Homologar visualmente a composição candidata dos quatro PDFs, agora comparada às referências fornecidas. A quantidade de páginas acompanha os dados; não é limitada à quantidade de páginas dos modelos.
2. Homologar login, convite recebido por e-mail, definição de senha, recuperação, remoção, readmissão e restrições com contas reais de proprietário, gestor e colaborador em ambiente autorizado.
3. Homologar leitura e gravação no Supabase com sessão real, incluindo duas empresas e dois dispositivos. As verificações atuais de isolamento e concorrência foram feitas em PostgreSQL isolado.
4. Conferir dados reais de operação: o banco inspecionado não tinha registros operacionais ou memória. Não há documento real completo de cliente que possa ser conferido como PDF final.
5. Publicar somente depois desses critérios. Esta branch não substitui `main` e não altera a configuração do GitHub Pages.

## Executar testes

Com Node 24 ou superior:

```sh
npm install
npm test
npm run test:database
npx playwright install chromium
npm run test:browser
```

Os testes de banco usam uma instância local descartável. Não apontar esse runner para o banco ativo. Para executar Chrome instalado no Windows, opcionalmente definir `CLARA_BROWSER_EXECUTABLE`.

## Publicação e retorno

Preservar `config.js`. Manter a URL de retorno autorizada no Supabase. Antes de promover a branch, registrar o SHA atual de `main` como versão de retorno e confirmar que os testes passaram. Não reaplicar migrações manualmente se já constarem do histórico do projeto. Em caso de problema de interface, restaurar o commit anterior do site; preservar as tabelas e a auditoria V9.


## Revisão visual dos PDFs — segunda geração

A usuária aprovou a estrutura-base do Manual Vivo: composição, fichas e passo a passo preservados. As quatro páginas de homologação foram comparadas por renderização com a versão aprovada, sem diferenças visuais.

Playbook e Histórico agora agrupam título, metadados e primeiro bloco de cada análise. A massa de 12 análises foi conferida por página, incluindo a última; teste adicional com 180 trechos e primeiro resumo maior que uma página manteve os marcadores finais e o primeiro texto junto ao cabeçalho.

Meu Momento passou de 11 para 7 páginas com a mesma massa sintética: retirada de quebras obrigatórias entre módulos, disposição de campos em linhas e estados vazios compactos. Não houve exclusão de registros. Rótulos dos campos recebem títulos em português, com acentuação; campos adicionais sem nome editorial conhecido são identificados como informações complementares, mantendo os valores.

21 testes Node passaram. Os quatro PDFs sintéticos foram gerados novamente para aprovação visual humana. Essa revisão não aprova as pendências reais de equipe, isolamento e memória, nem autoriza publicação.

## Homologação visual concluída pela usuária

A Revisão 2 dos quatro modelos (Manual Vivo, Playbook, Meu Momento e Histórico de Análises) foi aprovada pela usuária com dados sintéticos. A composição atual dos geradores passa a ser o padrão oficial. Não realizar novas alterações visuais sem solicitação da usuária. Essa aprovação não autoriza merge/publicação e não substitui os testes funcionais reais de equipe, importação, memória e isolamento.

## Homologação funcional retomada — 18/10/2026

- Seletor de arquivo JSON corrigido sem alteração visual: input temporário é anexado ao documento, removido após seleção/cancelamento e coberto por teste de navegador.
- Sessão proprietária real: prévia aberta, cancelamento com 0 importações no banco, aprovação de análise e tarefa, recuperação após recarga, bloqueio de repetição (Arquivo já importado), arquivo de outra empresa e ação inválida recusados. Consulta final: 1 importação, 1 análise e 2 tarefas totais (uma anterior e uma importada), sem duplicação.
- Ajuste da origem exata http://127.0.0.1:8765 autorizado expressamente e aplicado à clara-v9-equipe. Versão 3 ACTIVE/JWT true; preflight 204 e listagem autenticada retornou Equipe atualizada. A tentativa de atualização v2 apresentou BOOT_ERROR; o empacotamento v3 corrigiu a falha antes de qualquer convite. Origem oficial, JWT, auth.getUser e permissões RPC preservados; outros hosts/portas continuam recusados nos testes.
- 22 testes Node e o teste de navegador com backend simulado passaram. Funções originais e configuração publicada não foram alteradas.
- Endereços temporários autorizados para homologação: coachcamilasantos@gmail.com (gestor) e empreendacomia.online@gmail.com (colaborador). Convites aguardam confirmação no momento do envio com permissões explícitas. Não declarar envio, recebimento, aceite ou acesso validado antes das respectivas evidências.
- Isolamento com outras sessões/segunda empresa e memória entre conversas reais continuam pendentes. Aprovação visual dos quatro modelos permanece registrada e não autoriza publicação.
