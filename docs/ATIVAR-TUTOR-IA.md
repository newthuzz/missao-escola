# Tutorial completo — Tutor IA com Supabase e OpenAI

Esta versão aproveita o que aparece nas suas capturas: `ai_conversations`, `ai_messages`, a função **quick-endpoint** e o secret **OPENAI_API_KEY**. O site continua no Cloudflare. O tutor roda no Supabase e chama a OpenAI, com o modelo `gpt-5-mini`.

**A publicação do GitHub/Cloudflare não atualiza a Edge Function nem executa SQL no Supabase.** As etapas abaixo são necessárias no seu painel. Até o backend compatível estar disponível, o site não envia perguntas ao modelo.

## 1. Abrir o projeto correto

1. Entre em [Supabase Dashboard](https://supabase.com/dashboard).
2. Abra o projeto de identificador **pxnvttqsgjnakeukttdr**.
3. Confira em **Table Editor** que existem `ai_conversations`, `ai_messages` e `learner_backups`.

Você não precisa recriar as tabelas de perfil, progresso, amigos ou ligas. O SQL desta versão só atualiza as tabelas de IA e acrescenta seus controles.

## 2. Atualizar as tabelas com o arquivo compatível

1. Abra [supabase/tutor.sql](../supabase/tutor.sql).
2. No GitHub, clique em **Raw** para abrir somente o SQL. Use **Ctrl+A → Ctrl+C** para copiar o arquivo inteiro.
3. No Supabase, abra **SQL Editor → New query**.
4. Cole todo o conteúdo e clique em **Run**.
5. Aguarde a mensagem de sucesso. Se aparecer um erro, guarde a mensagem e interrompa esta etapa para conferir a diferença de estrutura; não apague tabelas para tentar corrigir.

O arquivo foi preparado para as colunas mostradas nas capturas. Ele faz o seguinte:

| Tabela | Alteração |
| --- | --- |
| `ai_conversations` | Acrescenta contexto, identificação da versão, resumo, sequência e atualização |
| `ai_messages` | Acrescenta sequência, mantendo texto, IDs e `exercise_id` existentes |
| `ai_requests` | Nova: controla geração e novas tentativas sem duplicação |
| `ai_usage` | Nova: registra uso para aplicar quotas |

As conversas antigas são mantidas como históricos anteriores, sem atribuir arbitrariamente uma questão única a uma conversa que pode ter tratado de vários exercícios. O SQL também configura índices, a função `tutor_action` e as permissões. Os alunos leem apenas suas próprias conversas; as escritas são feitas pelo backend autenticado.

A migração foi testada localmente com o esquema antigo e mensagens de exemplo, inclusive executando duas vezes. O resultado real no seu projeto só é confirmado após a execução no painel.

## 3. Descobrir o endereço público do site

1. Abra o Cloudflare e entre em **Workers & Pages → missao-escola**.
2. Clique em **Visit**, no canto superior direito.
3. Copie o endereço da página que abriu.
4. Use somente a parte formada por `https://` e o nome do domínio. Retire caminhos, barras finais e trechos como `/#inicio`.

Esse endereço é o site que os alunos acessam. **Não use `dash.cloudflare.com`**, que é o endereço do painel administrativo.

## 4. Conferir e cadastrar os secrets no Supabase

Volte ao Supabase e abra **Edge Functions → Secrets**, a mesma tela mostrada nas suas capturas.

| Nome | Valor |
| --- | --- |
| `OPENAI_API_KEY` | Mantenha a chave que já está cadastrada |
| `TUTOR_ALLOWED_ORIGINS` | Cole o endereço público obtido no passo 3 |
| `TUTOR_ENABLED` | Coloque inicialmente `false` |

Use **Add secret / New secret**, conforme o botão disponível, e salve. Caso você utilize mais de um domínio, coloque os endereços separados por vírgula, cada um com `https://`.

`SUPABASE_URL`, `SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY` são variáveis padrão fornecidas pelo Supabase às Edge Functions. Não é necessário copiá-las para o site ou criar novos secrets com esses nomes. A função utiliza a chave pública para validar o login e a chave privilegiada somente no servidor para executar o RPC protegido.

A presença de `OPENAI_API_KEY` não comprova que a chave funciona ou que há quota disponível. Confira também o uso/faturamento da API na conta OpenAI. A cobrança da API é independente de uma assinatura do ChatGPT. Não coloque a chave OpenAI no HTML, GitHub ou em mensagens do tutor.

## 5. Substituir o código da quick-endpoint

1. Abra o arquivo [supabase/functions/quick-endpoint/index.ts](../supabase/functions/quick-endpoint/index.ts).
2. No GitHub, use **Raw** e copie o conteúdo inteiro. O arquivo é grande porque inclui o catálogo real de exercícios; não copie apenas o começo ou um trecho exibido na tela.
3. No Supabase, entre em **Edge Functions → quick-endpoint → Code**.
4. Abra `index.ts`.
5. Faça uma cópia do código antigo em um arquivo local, caso precise consultá-lo depois.
6. Selecione todo o código antigo e substitua pelo conteúdo do novo arquivo.
7. Clique em **Deploy / Deploy updates** e aguarde a confirmação.

Mantenha o nome **quick-endpoint**. O endereço usado pelo site será:

```text
https://pxnvttqsgjnakeukttdr.supabase.co/functions/v1/quick-endpoint
```

O arquivo já contém validação de login, recuperação do exercício e histórico, resumo, gravação, quotas, OpenAI Responses API, streaming e tratamento de resposta incompleta. Nenhuma chave privada está embutida nele; elas são lidas dos secrets em runtime.

Para futuras atualizações do backend ou do catálogo, `npm run build` gera novamente esse arquivo. Publicar apenas o site não substitui o código da função no Supabase.

## 6. Conferir a verificação JWT da função

Na **quick-endpoint → Settings**, procure uma opção como **Verify JWT with legacy secret** ou **Enforce JWT verification**.

Para o código completo desta versão, desative a verificação do gateway legado e salve. O arquivo `supabase/config.toml` registra a mesma configuração para publicação por CLI.

**Isso não remove o login.** A nova função verifica obrigatoriamente o token do usuário no Supabase Auth antes de consultar conversas ou chamar a OpenAI. A verificação interna foi testada: uma chamada sem sessão recebe `401`. Faça esse ajuste somente depois de instalar o código completo do passo 5.

Não use a chave `sb_publishable_...` como token do aluno no cabeçalho `Authorization`. O site envia automaticamente o token da sessão do usuário logado. A chave pública vai no cabeçalho `apikey`.

## 7. Conferir a publicação do site no Cloudflare

A versão adaptada do site precisa estar na branch `main` do GitHub. Depois do envio:

1. Abra **Cloudflare → Workers & Pages → missao-escola → Deployments**.
2. Aguarde o deployment correspondente ao commit mais recente aparecer como **Ready**.
3. Clique em **Visit** e atualize a página.

A configuração da build continua:

| Campo | Valor |
| --- | --- |
| Root directory | Raiz do repositório, normalmente vazio |
| Build command | `npm run build` |
| Deploy command | `npx wrangler deploy` |

Não coloque `/dist` em **Root directory**. O Wrangler já usa `dist` para os arquivos estáticos.

Você não precisa ativar Workers AI, criar um binding `AI` ou colocar a chave da OpenAI no Cloudflare para este tutor. O secret já usado por amigos e ligas no Worker deve ser mantido; ele tem outra finalidade.

## 8. Ativar o tutor

Depois de concluir o SQL, publicar a função e conferir o site:

1. Volte a **Supabase → Edge Functions → Secrets**.
2. Edite `TUTOR_ENABLED` de `false` para **`true`**.
3. Salve. Mudanças de secrets passam a valer nas novas invocações; se o painel solicitar uma ação adicional de publicação, conclua-a.
4. No site, feche e reabra o painel do tutor ou clique em **Tentar novamente** para recarregar a disponibilidade.

`TUTOR_ENABLED` deve ficar no **Supabase**, onde o tutor está rodando. Uma variável com esse nome somente no Cloudflare não ativa a função.

Para interromper novas gerações, altere novamente para `false`. O histórico continua protegido e pode ser consultado ou excluído.

## 9. Testar usando uma conta de teste

Use uma conta sem dados reais de estudantes durante a validação inicial.

1. No site, entre por **Minha conta** e aguarde a sincronização.
2. Abra **Estudo personalizado → Exercícios**.
3. Abra **Tutor IA** no canto inferior direito.
4. Confira se o enunciado no painel corresponde à questão aberta.
5. Digite livremente: **“Resolve essa questão e explica cada passo.”** Envie sem escolher uma sugestão.
6. Continue com **“Pq deu esse resultado?”**, **“E se fosse negativo?”** e **“Não entendi, explica de outro jeito.”** Avalie se a resposta usa a conversa anterior e muda a explicação quando necessário.
7. Pergunte **“Esquece a questão, me explica porcentagem.”** O tutor deve acompanhar a mudança de assunto.
8. Para testar correção discursiva, envie **“Outra questão: qual a importância da fotossíntese? Minha resposta está certa?”** e preencha o campo opcional com **“É o jeito que a planta usa a luz para produzir alimento.”**
9. Troque a questão enquanto uma resposta está sendo gerada. A resposta antiga não deve aparecer na nova atividade.
10. Minimize e reabra, consulte uma conversa anterior e use **Ver mensagens anteriores** quando houver paginação.
11. No teste inicial, peça o gabarito: a ajuda deve permanecer conceitual.
12. No Supabase, confira se a conta de teste tem linhas em `ai_conversations` e `ai_messages`. `ai_requests` e `ai_usage` também devem registrar as gerações.

Uma resposta recebida comprova a conexão, mas não comprova a correção pedagógica. Os casos A–G precisam de avaliação das respostas reais. Os testes locais de interface, banco e API usam o provedor simulado exclusivamente no ambiente de teste.

Os limites iniciais são oito gerações por minuto e 80 por dia UTC por conta, além de um teto global. Evite enviar todos os testes repetidamente em poucos segundos.

## 10. Entender o botão Test do Supabase

O exemplo automático `{"name":"Functions"}` mostrado na tela não corresponde à API do tutor.

Para consultar o estado do backend, o corpo da nova função é:

```json
{"op":"state","context":{}}
```

Essa chamada também precisa do token de um usuário logado. Sem ele, `401` é o resultado esperado. O caminho mais simples para um leigo testar com a autenticação correta é o próprio site, seguindo o passo 9; não é necessário copiar tokens para este chat.

## 11. Resolver os erros mais comuns

| Sintoma | O que conferir |
| --- | --- |
| `401`, “Login necessário” ou “Sessão inválida” | Entre novamente no site; use a sessão do usuário, não a chave pública no lugar do token |
| `Invalid JWT` antes de chegar ao código | Confira o passo 6 e se o código novo completo foi publicado |
| “Origem não permitida” ou erro de CORS | Confira `TUTOR_ALLOWED_ORIGINS`, o endereço de Visit e todos os domínios realmente usados |
| “Mensagem inválida” ao consultar o estado | Confira se a função ainda está com o código antigo ou se o corpo utilizado foi o exemplo `name: Functions` |
| “Não foi possível acessar esta conversa” | Confira se o SQL atual terminou com sucesso no mesmo projeto da função |
| Tutor indisponível ou botão Enviar desativado | Confira `TUTOR_ENABLED=true`, secret OpenAI, função nova e recarregue o painel do tutor |
| Log `Tutor OpenAI HTTP 401` | Confira a validade da chave OpenAI cadastrada no Supabase |
| Log `Tutor OpenAI HTTP 429` | Confira limites, quota e faturamento da API OpenAI; aguarde se for limite temporário |
| Log `Tutor OpenAI HTTP 403/404` | Confira permissões do projeto OpenAI e acesso ao modelo `gpt-5-mini` |
| “Exercício atualizado” | Atualize o site e confira se o catálogo da Edge Function é da mesma versão do site |
| Resposta interrompida | Tente novamente; somente respostas concluídas são gravadas como resposta final |
| Deployment Cloudflare falhou | Abra o log da build mais recente e confira os comandos do passo 7 |

Em **Edge Functions → quick-endpoint → Logs**, compartilhe somente a mensagem necessária para diagnóstico, sem tokens, chaves ou conversas privadas. O código registra o status HTTP do provedor sem registrar a chave.

## O que pode ser considerado concluído

A instalação estará validada quando o SQL e a função estiverem publicados, o deployment do site estiver Ready, uma conta de teste receber respostas reais e o histórico aparecer no banco com isolamento entre contas. Até essa verificação, não se deve declarar que a integração está operacional em produção.
