# Missão Escola — relatório de execução da versão beta local

Data: 05/11/2026. Base do trabalho: `fc7d925` (último commit publicado anteriormente). Entrega exclusivamente local; nenhuma alteração enviada ao GitHub, nenhuma build publicada, nenhum secret modificado e nenhuma migração executada em produção.

Atualização: a interface anterior da rotina foi restaurada por preferência do usuário; detalhes e validação em [ROTINA-RESTAURADA.md](ROTINA-RESTAURADA.md).

## A. Diagnóstico e dependências

O diagnóstico anterior às modificações está em [BETA-LOCAL.md](BETA-LOCAL.md). A arquitetura existente foi preservada: HTML/CSS/JavaScript sem framework; motores Journey/Routine; Adaptive; Supabase Auth/backups; API social compartilhada entre Workers e Pages; Tutor via Supabase Edge Function com provedor configurado no servidor. Não foram acrescentadas dependências.

| Problema | Causa e componentes |
|---|---|
| Ano presumido | `profile.grade || 7` em Adaptive e UI; informar ano exigia perfil completo. |
| Matérias diferentes nas entradas | Início usava recomendação enquanto `state.subject` iniciava fixo; faltava seleção persistida comum. |
| Retomada indireta e limitada ao dia | Início abria visão geral; planos de dias anteriores eram ignorados na UI; tentativas erradas/pistas e questão ativa não tinham persistência suficiente. A gravação de acertos já existia em commit e foi preservada. |
| Questão em segundo plano | Títulos, metadados e confiança antecediam enunciado/alternativas. |
| Conclusão redundante | Último acerto só marcava a questão; outro clique era necessário para finalizar a sequência. |
| XP antes da aprendizagem | Início de plano premiava abertura; conquistas usavam modal/toast sobre o conteúdo. |
| Tutor sem requisito claro | Compositor visível sem usuário ou protocolo disponível; login sem retorno explícito ao contexto. |
| Cabeçalho mobile | Compactação aplicada apenas a algumas abas; contadores competiam com o nome; menu destacava atalhos mesmo sem estarem ativos. |
| Rotina longa | Configuração real, geração e confirmação existentes em uma única superfície extensa. |
| Apoio sem atendimento | Listener local simulava envio; não havia serviço de recebimento. |
| Conexão indefinida | Transporte comum de conta não tinha limite de espera para login/backups. |

## B. Implementação

- **Ano e continuidade:** seleção leve sem inventar nome/idade; seleção e matéria persistidas no learner existente. Perfil completo continua opcional e seu ano é reutilizado. Mudanças no ano mantêm observações e arquivam as sequências recentes (até 30), sem apagar os eventos de XP. Planos antigos de visitantes compatíveis são mantidos após confirmação do ano. O perfil autenticado usa o mesmo snapshot sincronizado e as revisões/conflitos existentes.
- **Atividade:** identificador atual, primeiras respostas, alternativas erradas, confiança e uso de pistas persistidos. Início e Estudo consultam o mesmo estado. “Continuar” abre diretamente a pendência, inclusive de outro dia; uma atividade concluída não reaparece como pendente. Questão X de Y, enunciado e alternativas vêm primeiro. Informações adicionais são expansíveis; reflexão de confiança só aparece após responder. Sem pular uma questão obrigatória por engano.
- **Conclusão:** último acerto conclui e salva automaticamente, atualiza a rotina vinculada e abre resultado com contagem, apoio/acertos, pontos e opções de voltar/rever. Históricos antigos sem contabilidade de XP por sequência mostram o total preservado, sem inventar zero pontos recebidos.
- **Gamificação:** regras de valor e idempotência permanecem em Journey. A abertura não concede XP. O bônus da missão de estudo foi deslocado para a conclusão real. Revisão usa “Entendi, ir para a prática”; avisos de estudo ficam no fluxo, sem toast ou modal cobrindo alternativas. Meta diária de pontos é nomeada separadamente da conclusão da atividade.
- **Tutor/conta:** sem login, campo oculto e explicação imediata com “Entrar ou criar conta”. Em carregamento/indisponibilidade, compositor permanece oculto e há recarregamento. Login aguarda a primeira tentativa de sincronização e retorna ao contexto válido. Proteções do backend, tokens e RLS existentes não foram afrouxados. Chat/KaTeX continuam sob demanda.
- **Rotina:** layout completo da versão anterior restaurado a pedido do usuário. Cartões de geração/montagem manual, horários, duração, matérias, compromissos e calendário retornaram à apresentação original. Motor, validação de conflitos, edição e dados salvos foram preservados. A prévia continua separada da rotina salva.
- **Interface/acessibilidade:** nome e logo alinhados, contadores secundários removidos do cabeçalho móvel e apenas a aba ativa destacada. Textos claros corrigidos nos componentes afetados. Textos ampliados refluem; o menu pode rolar internamente quando necessário, sem estourar a página. Fontes de formulário de pelo menos 16 px e zoom manual preservados. Foco/teclado, estados sem depender só de cor e redução de movimento mantidos.
- **Apoio:** formulário fictício removido; orientação transparente para procurar a escola ou um adulto de confiança, sem inventar contatos e sem coletar relatos sem atendimento.
- **Transporte:** timeout de 15 segundos com mensagem de tentativa novamente, preservando os dados locais; códigos/revisões de conflito mantidos.
- **Entrega:** servidor Node local serve somente dist e reaproveita `/api/social` quando configurado. Sem configuração, responde 503 real. Arquivos privados do repositório não são servidos. Iniciador Windows não executa deploy.

Arquivos alterados/adicionados:

- `INICIAR-LOCAL.bat`
- `LEIA-ME-TESTE-LOCAL.md`
- `account.js`
- `adaptive.js`
- `beta.css`
- `cloud-api.mjs`
- `docs/BETA-LOCAL.md`
- `index.html`
- `package.json`
- `scripts/build.mjs`
- `scripts/serve-local.mjs`
- `study-focus.js`
- `study-ui.js`
- `tests/beta.test.cjs`
- `tests/browser/beta.cjs`
- `tests/browser/home.cjs`
- `tests/browser/island-life.cjs`
- `tests/browser/progress-sync.cjs`
- `tests/browser/study-focus.cjs`
- `tests/browser/tutor.cjs`
- `tests/cloud-api.test.mjs`
- `tests/local-server.test.mjs`
- `tutor-bootstrap.js`
- `tutor-ui.js`
- `tutor.css`

## C. Validação efetivamente executada

| Verificação | Resultado |
|---|---|
| `npm test` antes das alterações | Passou; log de referência incluído. |
| `npm run build` final | Passou; build pronta em dist. |
| `npm test` final | Passou: transporte, APIs, SQL social, Adaptive, Worker, sincronização, Tutor/core/API/SQL/bundle e 6 testes novos do estado beta. |
| `node tests/browser/beta.cjs` | Passou: primeiro acesso, ano persistente, matéria consistente, retomada direta, erro/apoio após reload, plano de dia anterior, conclusão sem clique extra, revisão sem XP duplicado, rotina automática/manual, troca de ano, login e falha de API com fixtures. |
| `node tests/browser/home.cjs` | Passou: central, acessos, estado preservado, meta de pontos, baú e navegação. |
| `node tests/browser/tutor.cjs` | Passou com respostas controladas: stream, fórmulas, texto seguro, contexto, cancelamento, troca de conta, indisponibilidade/retry, histórico e teclado/viewport. |
| `node tests/browser/progress-sync.cjs` | Passou com API controlada: login/refresh, snapshot completo, outra aba/aparelho, offline, conflito e troca de conta. |
| `node tests/browser/theme.cjs` | Passou: ambos os temas, teclado, armazenamento bloqueado/limitado, reload e abas. |
| `node tests/browser/splash.cjs` | Passou: 15 cenários, incluindo CSS reset, recursos/autenticação lentos, offline, CPU reduzida, mobile, landscape, redução de movimento e user agent Opera. |
| `node tests/browser/island-life.cjs` | Passou: seis ilhas, geometria/estado preservados, teclado, movimento, pausas fora de tela e redução de movimento. Medição estável: 0 recalculações de layout em 2 segundos, CPU simulada 4×. |
| `node tests/local-server.test.mjs` | Passou: HTML, módulos, SVG, isolamento do código privado, rotas desconhecidas e backend não configurado retornando indisponibilidade. |
| Sintaxe e `git diff --check` | Passaram nos arquivos novos/modificados verificados. |

Responsividade: 320, 360, 390, 768 e 1366 px na suíte beta; 1440 px na suíte da central. Ambos os temas. Texto a 200% validado também na questão em 320 px, além de navegação por teclado. O teclado/viewport de iPhone é simulado em Chromium; não é um teste em Safari nativo.

Alguns testes existentes foram atualizados para refletir os critérios novos (ano explícito, retomada direta, conclusão automática e compositor indisponível oculto). Os testes de sincronização e de animação aguardam o fim da abertura antes de interagir/medir, evitando confundir a animação de entrada com atividade estável.

Logs e prints estão em `evidencias-beta/`. As respostas controladas são usadas apenas nos testes; a build não simula sucesso de API nem substitui dados reais por fixtures.

## D. Pendências externas e limites

1. **Tutor real:** login Supabase, Edge Function quick-endpoint, secrets/modelo Groq e CORS precisam estar configurados no serviço existente. Para localhost, a origem deve estar autorizada. Nenhuma resposta real de Groq foi gerada nesta entrega.
2. **Conta/sincronização reais:** o fluxo foi validado com API controlada e as regras SQL/concorrência localmente. Disponibilidade, configuração de Auth/RLS e comportamento do projeto de produção precisam de uma conta real de teste. O uso de uma conta real no pacote mantém a sincronização existente; prefira conta de teste.
3. **Amigos e ligas reais:** API/SQL/Worker passaram nos testes existentes; teste entre duas contas reais depende do backend, migrações e secret do servidor. Nenhuma migração ou configuração de Cloudflare/Supabase foi alterada.
4. **Apoio:** não existe serviço de atendimento confirmado; portanto a build não oferece envio. Criar um canal real continua pendente de definição de responsável e backend.
5. **Dispositivos e acessibilidade:** Chrome/Opera e Safari nativos, leitores de tela e teste com alunos reais ainda exigem validação humana. A inspeção local não é certificação completa WCAG 2.2 AA.

## E. Desempenho medido

Os números abaixo correspondem à medição da entrega beta inicial, anterior à restauração visual da rotina. Não foi feito novo benchmark de página para esta alteração de apresentação. A validação atual da rotina e das demais funções está em ROTINA-RESTAURADA.md.

Chromium headless, servidor local sem compressão, contextos de navegador novos, sem limitação de rede/CPU nesta medição de página. Uma execução por largura antes e depois. Chamadas ao Supabase bloqueadas; percurso abre o estudo e a primeira questão. Estes números não representam produção nem celular físico. A animação de abertura foi preservada e influencia o LCP.

| Largura | LCP antes → depois | CLS antes → depois | Maior evento roteirizado | Requisições de recursos | Bytes dos recursos |
|---|---|---|---|---|---|
| 390 px | 3916 → 4076 ms | 0.001020 → 0.001020 | 72 → 40 ms | 29 → 31 | 831778 → 851344 bytes |
| 1366 px | 2548 → 2516 ms | 0.024579 → 0.000567 | 48 → 64 ms | 29 → 31 | 831778 → 851344 bytes |

As contagens e bytes usam Resource Timing e **não incluem o documento HTML principal**. O acréscimo corresponde aos recursos da reorganização; não foi adicionada biblioteca pesada. Chat e KaTeX seguem carregando só quando necessários. INP de campo não foi medido: o maior evento roteirizado é evidência de laboratório e não deve ser apresentado como INP real. A amostra é pequena e há variação entre execuções; não há ganho comprovado de LCP no celular. Devem ser feitas medições em aparelhos reais e rede limitada antes do beta público.

Os JSONs antes/depois, o roteiro da medição e a medição da animação estão em `evidencias-beta/`.

## F. Status

| Correção | Status |
|---|---|
| Seleção do ano, conteúdo futuro e preservação do histórico | Concluída e validada localmente. |
| Questões, continuidade, tentativas/pistas e conclusão automática | Concluída e validada localmente. |
| XP sem abertura e sem duplicação nas ações testadas | Concluída e validada localmente. |
| Cabeçalho, temas, tamanhos e ampliação nos cenários executados | Concluída e validada localmente; dispositivos nativos/leitores de tela aguardam validação. |
| Rotina com layout anterior, edição e persistência | Concluída e validada localmente. |
| Requisito de conta no Tutor e retorno após login | Concluída e validada com API de teste; integração real aguardando validação. |
| Autorização/sincronização/backend social existentes | Preservados e validados por testes locais; disponibilidade externa pendente de configuração/verificação real. |
| Apoio transparente sem confirmação falsa | Concluída e validada; atendimento real não implementado, pendente de serviço. |
| Desempenho em celular físico e INP de campo | Aguardando validação; métricas de laboratório incluídas sem promessa de melhoria geral. |
| Publicação | Não realizada, conforme solicitado. |
