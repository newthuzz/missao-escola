# Tutor IA — implementação e estado da entrega

O código do tutor foi integrado à aplicação existente. A ativação online e a avaliação semântica com o modelo real ainda estão pendentes. Não há fallback de respostas cadastradas nem um simulador apresentado ao aluno como IA. Sem o serviço configurado, a interface informa indisponibilidade e permite tentar novamente.

## 1. Provedor e modelo

Integração preparada para **OpenAI Responses API**, modelo `gpt-5-mini`, por uma Edge Function Supabase chamada `quick-endpoint`. A chave `OPENAI_API_KEY` fica nos secrets do Supabase. O site no Cloudflare envia a sessão do aluno para a função. Esse é o modelo definido no código; chamadas reais ainda precisam ser validadas na conta do usuário. A implementação anterior com Workers AI foi substituída para aproveitar a estrutura mostrada nas capturas.

O recurso só gera respostas quando o secret de runtime `TUTOR_ENABLED`, no Supabase, está exatamente como `true`. Na ausência dele, permanece desativado. `TUTOR_ALLOWED_ORIGINS` lista os domínios do site autorizados a acessar a função pelo navegador. A cobrança e as quotas são da API OpenAI, independentes de uma assinatura do ChatGPT. O cliente verifica a versão do protocolo antes de habilitar envios; um endpoint antigo ou desativado não recebe perguntas do aluno para geração.

## 2. Comunicação e interface

`tutor-bootstrap.js` adiciona um botão fixo no canto inferior direito e observa eventos das funções existentes de navegação e exercícios. Não captura a tela nem executa IA no navegador. O chat é importado na primeira abertura. KaTeX 0.19.1 e suas fontes locais só são carregados quando uma resposta contém fórmula.

Fluxo: texto livre no site Cloudflare → `POST /functions/v1/quick-endpoint` no Supabase com `apikey` pública e JWT do aluno → verificação da sessão no Supabase Auth → recuperação autorizada do exercício e histórico → OpenAI Responses API → streaming SSE → gravação da resposta concluída no Supabase. Resumos extensos também são produzidos pelo modelo. `store:false` desativa o armazenamento solicitado à API OpenAI; o histórico privado no Supabase é mantido separadamente.

O painel oferece texto livre, Enter para enviar, Shift+Enter para nova linha, indicador de geração, sugestões opcionais que apenas preenchem o campo, campo opcional para resposta discursiva/etapa atual, minimização, histórico, paginação de mensagens antigas e exclusão de conversa. Fórmulas são renderizadas com `trust:false` e limites de expansão. Texto gerado não é interpretado como HTML.

Em celulares, os botões de tutor e perfil ficam acima da navegação inferior. O chat tem rolagem própria; em janelas baixas, o painel inteiro também pode rolar para manter os controles acessíveis.

## 3. Identificação do exercício

O navegador envia somente ID, versão e modo, além da pergunta e da resposta informada pelo aluno. A versão inclui enunciado, alternativas, gabarito, explicação e dicas; mudanças editoriais relevantes separam a conversa anterior. O gabarito existente no banco público do app é usado localmente para calcular a versão, mas não é aceito do cliente como verdade pelo backend.

`scripts/build-tutor-catalog.mjs` gera o catálogo do servidor a partir dos bancos reais de `index.html` e `study-content.js`. O backend consulta esse catálogo pelo ID e rejeita versões antigas, IDs inexistentes e questões acima da faixa do perfil salvo. O perfil é lido do backup privado do usuário, sem enviar nome, e-mail ou idade ao modelo. O contexto contém o ano escolar e a ilha correspondente ao XP salvo; as ilhas continuam sendo marcos de progresso, não disciplinas.

Prática, exemplo resolvido e teste inicial são identificados pelas funções reais da aplicação. A seleção do aluno acompanha a pergunta. Durante o diagnóstico, a ajuda é conceitual e o gabarito não integra o contexto do modelo. Um diagnóstico ainda ativo no backup também impõe essa restrição, mesmo se o cliente solicitar modo de estudo.

O banco atual contém perguntas textuais de múltipla escolha, sem anexos de imagem/gráfico. Não foram inventadas mídias ausentes. Perguntas abertas e discursivas podem ser fornecidas no texto livre, com a resposta no campo opcional. Isso não cria notas oficiais nem transforma o banco existente em uma plataforma de provas discursivas.

A troca de exercício ou conta aborta a requisição e invalida seu identificador de geração na interface. Uma resposta antiga não pode preencher o chat da nova questão. O backend cancela a leitura do stream e sinaliza o cancelamento da chamada HTTP à OpenAI quando há desconexão; isso não garante estorno de processamento já realizado pelo provedor. Minimizar e reabrir preserva a conversa quando o contexto continua o mesmo.

## 4. Armazenamento e memória

Migração: `supabase/tutor.sql`. Reaproveita as duas tabelas das capturas, preserva seus dados e cria somente duas tabelas auxiliares:

| Tabela | Finalidade |
| --- | --- |
| `ai_conversations` | Proprietário, contexto/versionamento, resumo e sequência de mensagens |
| `ai_messages` | Mensagens ordenadas, papel, texto e data |
| `ai_requests` | Reserva de geração, identificador idempotente, estado e resposta concluída |
| `ai_usage` | Identificador da conta e datas de uso para quotas, sem conteúdo das perguntas |

RLS permite ao usuário autenticado consultar somente suas conversas e mensagens. Ele não pode forjar mensagens de IA nem chamar o RPC privilegiado. Escritas, quotas e exclusões passam pela Edge Function e pelo RPC `tutor_action`, exclusivo de `service_role`. A identidade usada no RPC vem da sessão verificada, nunca do corpo enviado pelo navegador.

Os históricos ficam no Supabase até exclusão da conversa ou da conta; não foi criada uma promessa de expiração automática. Apagar a conversa remove suas mensagens, resumo e respostas de idempotência, mas preserva contagens de uso para não permitir contornar limites. O código gerado para colar no painel está em `supabase/functions/quick-endpoint/index.ts`; a fonte está em `server/tutor-edge.mjs`, `server/tutor-handler.mjs` e `server/tutor-openai.mjs`. O chat não grava histórico no `localStorage` nem o inclui no backup de progresso. Rascunhos e dados visíveis são descartados ao trocar de conta.

O modelo recebe até 12 mensagens recentes, com limite agregado de aproximadamente 14 mil caracteres, e um resumo de até 3 mil caracteres. Mensagens antigas muito longas são limitadas a trechos de 6 mil caracteres apenas na memória enviada ao modelo; o texto original no banco e no histórico é preservado. Cada atualização do resumo processa até 18 mil caracteres antigos, evitando chamadas desproporcionais em conversas longas. A consulta operacional recupera as 40 mensagens mais recentes; a interface pode paginar o restante. Depois de uma sequência muito extensa de falhas sem resposta concluída, parte da memória anterior pode exigir consulta manual pelo aluno. Não se promete memória ilimitada.

## 5. Recuperação de conhecimento e cálculos

O backend seleciona a unidade da questão e até dois pré-requisitos, incluindo objetivos, resumos autorais e referências cadastradas. É recuperação por IDs e relacionamentos, sem embeddings ou busca indiscriminada. Não faz navegação externa nem afirma ter lido os links durante a resposta.

O material atual é uma seleção autoral, sem revisão pedagógica externa comprovada e sem cobertura integral da BNCC. Isso é informado ao modelo. O tutor pode explicar outros assuntos educacionais com o conhecimento do modelo e deve reconhecer incertezas; o catálogo não restringe artificialmente a conversa a palavras-chave.

Há uma calculadora determinística limitada a números, parênteses, porcentagem e operações aritméticas, sem `eval` ou execução de código. Ela verifica expressões puramente aritméticas enviadas pelo aluno e operações identificáveis na explicação oficial. A resposta mostra exatamente quais contas foram conferidas. Não verifica automaticamente toda questão matemática, álgebra simbólica, unidades físicas ou todas as afirmações discursivas.

## 6. Segurança e limites

- Sessão verificada pelo Supabase, CORS limitado aos domínios configurados, validação de tamanho e IDs, respostas `no-store` e segredos apenas na Edge Function. O gateway JWT legado fica desativado porque o código valida o token diretamente em Auth; uma chamada sem sessão continua recebendo 401.
- Limite de 8 gerações/minuto e 80/dia UTC por conta; teto global de 2.000 solicitações/dia UTC. Cada solicitação pode envolver uma chamada adicional de resumo, portanto esses limites não são um teto monetário.
- Até 80 conversas e 2.000 mensagens por usuário. A interface permite excluir conversas. Quotas são aplicadas em transação, inclusive entre aparelhos.
- Uma geração simultânea por conta; IDs idempotentes impedem repetir o modelo após sucesso. Falhas podem ser tentadas novamente com a mesma chave, sem duplicar a pergunta. Reservas abandonadas expiram após dois minutos.
- Timeout no carregamento, nas chamadas ao banco, no modelo e no navegador. Falhas não geram uma resposta simulada.
- Materiais e resumos são rotulados como dados, nunca regras do sistema. O modelo não recebe ferramentas de escrita no banco nem segredos. Isso reduz o impacto de instruções maliciosas, mas não garante que um modelo generativo sempre siga todas as orientações pedagógicas.
- Consultar o tutor numa questão de prática marca a tentativa local como assistida, usando a lógica já existente; o tutor não concede XP nem corrige o progresso por conta própria.

O perfil e o progresso do aplicativo são dados educacionais sincronizados pelo próprio aluno. O diagnóstico atual não é uma avaliação de alta segurança: o banco original já está disponível no navegador. A restrição de ajuda é pedagógica, não uma garantia contra cola em provas formais.

## 7. Testes efetivamente realizados

| Verificação | Resultado |
| --- | --- |
| `npm test` | Passou: API existente, banco social, modelo adaptativo, Worker, sincronização e novos testes do tutor |
| `npm run test:tutor` | Passou: catálogo/versionamento, calculadora, memória, API e SQL real no PGlite |
| RLS e RPC | Outro usuário não lê/apaga conversas; navegador não forja resposta nem executa RPC privilegiado; migração repetível |
| API com provedor controlado | Streaming UTF-8, falhas, resumo, idempotência, quotas e validação antes de gerar |
| `node tests/browser/tutor.cjs` | Passou no Chromium: texto livre, teclado, carregamento sob demanda, fórmulas, XSS, contexto, troca de conta, cancelamento, erro/retry e histórico |
| Regressão `tests/browser/progress-sync.cjs` | Passou: login, token renovado, restauração, autosave, offline, conflito e isolamento entre contas |
| Wrangler 4.156.0 `deploy --dry-run` | Passou: Worker do site empacotado com `ASSETS`; a função Supabase é gerada separadamente pelo esbuild; não foi uma execução real do provedor |
| `npm audit --omit=dev` | Zero vulnerabilidades reportadas para as dependências de produção verificadas |

As respostas do provedor foram simuladas exclusivamente nos testes automatizados de integração. Esses testes comprovam fluxo, segurança e isolamento, não compreensão semântica real.

| Caso exigido | Estado real |
| --- | --- |
| A — “Pq essa conta deu isso?” | Transporte/contexto testados; resposta do modelo real ainda não avaliada |
| B — “E se fosse negativo?” | Histórico encaminhado; interpretação real ainda não avaliada |
| C — Mudança para porcentagem | Texto livre encaminhado sem roteador de palavras-chave; qualidade real pendente |
| D — Correção discursiva | Campo de resposta e encaminhamento implementados; avaliação semântica real pendente |
| E — Explicação alternativa | Mensagem e memória encaminhadas; reformulação real pendente |
| F — Resolução completa | Contexto oficial e regras de diagnóstico testados; resolução real pendente |
| G — Pergunta inédita | Entrada inédita aceita e encaminhada; compreensão real pendente |
| H — Troca de exercício | Passou com requisição atrasada no Chromium: mensagem antiga não apareceu na nova questão |

`scripts/test-tutor-live.mjs` registra respostas reais dos casos A–G quando executado explicitamente com uma conta de teste e as variáveis `TUTOR_TEST_SITE` e `TUTOR_TEST_TOKEN`. Ele não atribui aprovação semântica por palavras-chave: o relatório exige revisão humana. Não foi executado contra produção nesta entrega. Nenhuma chave deve ser colada no chat, código ou relatório.

## 8. Limitações atuais

Migração no banco real, publicação da Edge Function e avaliação real pendentes impedem declarar o tutor concluído em produção. Não foram executados testes em Opera GX nativo, Safari, Firefox ou celulares físicos. Há validação de layout móvel no Chromium, incluindo janelas baixas; ela não mede a bateria de aparelhos reais. O tutor não recebe anexos de imagens, não navega na web, não possui busca vetorial e não garante precisão factual absoluta.

## 9. Ativação externa

Siga `docs/ATIVAR-TUTOR-IA.md`. É necessário executar a migração, publicar a integração, atualizar a Edge Function `quick-endpoint`, manter o secret OpenAI, configurar os domínios permitidos e definir `TUTOR_ENABLED=true` no Supabase. Sem acesso administrativo conectado a essas contas, não foi possível executar essas etapas ou consultar seu resultado daqui.

## 10. Próximas melhorias após a avaliação real

Priorizar revisão de educadores dos casos A–G e testes de instruções adversariais; em seguida, definir política formal de retenção e descarte automático, orçamento monetário/monitoramento do provedor e uso com menores conforme a política da escola. Quando houver materiais revisados suficientes, ampliar recuperação com busca semântica. Imagens, gráficos e álgebra simbólica podem ser acrescentados com ferramentas específicas, sem transformar seus resultados em notas oficiais automaticamente.
