# Clara — memória externa (2026-10-16)

Plugin: https://chatgpt.com/plugins/plugins_6ad2011b9a988191b12898cfd68a553f
Release: pluginrel_6ad2044811008191b24c2aa816fda188. Pacote 1.1.1; Skill 1.1.0 preservada byte a byte.
Projeto: fluegdtbcuaomuhybbzv.

## Aplicado
- RPC public.clara_memoria_registrar_v1 SECURITY INVOKER; grava conversas e itens atomicamente nas tabelas existentes. IDs estaveis evitam repeticao em retry identico.
- RLS existente mantido: apenas proprietario ativo pode acessar memoria. Gestores/funcionarios/consultora nao recebem acesso adicional.
- Funcao clara-memoria-mcp publicada, com verificacao de usuario no Auth, token OAuth com client_id e chamadas REST sob o JWT do usuario. Nao usa service_role.
- verify_jwt=false somente nesta funcao para permitir discovery OAuth publico; cada chamada funcional exige autenticacao dentro do handler.
- Pagina clara-oauth-consent.html adicionada separadamente; index.html, config.js e painel-demonstracao.html nao foram alterados.
- Plugin recebeu mcp.json OAuth/DCR; manifests atualizados; demais arquivos retidos.

## Testado
SQL real no projeto sob papel authenticated e identidades temporarias: gravacao atomica; leitura; retry identico sem duplicacao; empresa B nao le conversas/itens da A; escrita cruzada negada; funcionario sem acesso; usuario_id falsificado negado; item com empresa inconsistente negado; tipo invalido nao deixa gravacao parcial; identidade vazia nao le.
Fixtures inteiramente revertidas (ROLLBACK); contagem residual de empresas e usuarios de teste igual a zero.
HTTP: discovery retorna 200; chave anon e token invalido recebem 401.
Readback do plugin confirma release e Skill original identica ao ZIP.
Nao foram testados login OAuth, aprovacao/recusa reais, JWT OAuth valido, chamadas MCP autenticadas ou memoria entre dois chats reais.

## Etapa manual indispensavel
No Supabase, projeto Clara - Gerente de IA > Authentication > OAuth Server:
1. Enable OAuth Server.
2. Enable Dynamic Client Registration.
3. Configure Authorization Path para apontar a pagina publicada:
https://santoscamiladacosta-spec.github.io/clara-painel-teste/clara-oauth-consent.html
Conferir a URL final montada pelo painel: deve corresponder exatamente a essa URL, sem duplicar clara-painel-teste. Nao alterar Site URL para o dominio Supabase.
O conector de configuracao disponivel nesta sessao nao expoe os campos oauth_server_* para atualizacao. Eles foram lidos como disabled/false/path null.
A documentacao oficial exige servidor OAuth e frontend de consentimento:
https://supabase.com/docs/guides/auth/oauth-server/mcp-authentication
https://supabase.com/docs/guides/auth/oauth-server/getting-started

## Validacao final pendente
Conectar o plugin no ChatGPT, entrar como proprietario no Painel Clara e aprovar.
Chat A: solicitar registro de uma pendencia identificada e verificar retorno memoria_gravada=true.
Chat B independente: consultar a pendencia e conferir empresa, registro_id e conteudo.
Repetir com proprietario de outra empresa, membro inativo e token expirado; nao deve haver acesso indevido.
Confirmar que recusar atualizar painel nao gera JSON, e autorizar gera apenas JSON sem alegar importacao.
O servidor consulta no maximo 50 conversas e 200 itens recentes por chamada; resposta declara os limites.
Nao declarar integracao concluida antes desses testes.
