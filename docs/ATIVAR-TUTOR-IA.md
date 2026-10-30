# Como ativar o Tutor IA

O código está preparado para Supabase e Cloudflare Workers AI. A personalização local e o restante do site continuam usando os fluxos existentes. O tutor não começa a gerar respostas até ser ativado.

## 1. Preparar as tabelas no Supabase

1. Entre em `supabase.com/dashboard` e abra o projeto cujo identificador é `pxnvttqsgjnakeukttdr`.
2. No menu lateral, abra **SQL Editor** e escolha **New query**.
3. Abra o arquivo `supabase/tutor.sql` deste repositório e copie seu conteúdo inteiro.
4. Cole na consulta e clique em **Run**. Aguarde a mensagem de sucesso.
5. Em **Table Editor**, confira as tabelas `tutor_conversations`, `tutor_messages`, `tutor_requests` e `tutor_usage`. Não é preciso preencher nenhuma delas manualmente.

Essa migração não apaga os estudos nem altera as tabelas existentes. Pode ser executada novamente. O backup `learner_backups`, configurado anteriormente com `supabase/schema.sql`, também precisa existir.

## 2. Publicar a integração

Após a autorização para esta atualização maior, enviar o commit à branch `main`. No Cloudflare, abra **Workers & Pages → missao-escola → Deployments** e aguarde **Ready**.

As configurações continuam sendo:

| Campo | Valor |
| --- | --- |
| Root directory | Vazio, ou raiz do repositório |
| Build command | `npm run build` |
| Deploy command | `npx wrangler deploy` |

Não coloque `/dist` em **Root directory**. O Wrangler já aponta para `dist` como pasta de arquivos estáticos e para `worker.mjs` como backend.

## 3. Conferir o serviço de IA

No Worker publicado, procure **Bindings** e confirme que há um binding chamado **AI**, do tipo **Workers AI**. A configuração do repositório declara esse binding automaticamente.

Se o Cloudflare solicitar ativação do Workers AI ou aceitação de condições da conta, conclua pelo painel após conferir o plano, as quotas e os preços. O modelo configurado é `@cf/meta/llama-3.3-70b-instruct-fp8-fast`. Não é necessário colocar uma chave de IA no HTML nem usar o servidor deste chat. O acesso efetivo desse modelo na sua conta ainda deve ser verificado no teste real.

## 4. Conferir o secret do Supabase

Em **Worker → Settings → Variables and Secrets**, procure **SUPABASE_SERVICE_ROLE_KEY**.

- Se já existe como **Secret**, mantenha-o. É o mesmo secret usado pelo backend de amigos e ligas.
- Se não existe, adicione como **Secret** o valor `service_role` do projeto Supabase. Ele deve estar no runtime do Worker, não somente em variáveis da build.
- Não utilize a chave pública `sb_publishable_...` nesse campo.
- Não coloque esse valor no GitHub, HTML, mensagens do tutor ou nesta conversa.

O código já usa o endereço e a chave pública do projeto informados anteriormente. Opcionalmente, `SUPABASE_URL` e `SUPABASE_PUBLISHABLE_KEY` permitem configurar outro projeto no backend, mas isso exige também alinhar o frontend; não é necessário mudar para esta ativação.

## 5. Ligar o tutor

Na mesma tela **Variables and Secrets**, adicione:

| Tipo | Nome | Valor |
| --- | --- | --- |
| Texto/Plaintext | `TUTOR_ENABLED` | `true` |

Salve e publique a nova configuração se o painel pedir **Deploy**. O valor precisa ser o texto `true`, em minúsculas. Para interromper novas gerações, altere para `false` e publique essa configuração. O acesso ao histórico não depende de deixar o modelo ligado.

## 6. Verificar no site

1. Use uma conta de teste, sem dados reais de alunos. Entre por **Minha conta** e aguarde a sincronização.
2. Abra **Estudo personalizado → Exercícios**.
3. Abra o botão **Tutor IA** no canto inferior direito. Confira se o enunciado mostrado corresponde à questão aberta.
4. Digite uma pergunta livre sem escolher sugestão. Confira a resposta e faça uma pergunta complementar, como “por que dividiu?”.
5. Troque de questão com o tutor aberto. O cabeçalho deve mudar e uma geração antiga deve ser descartada.
6. Consulte o histórico e mensagens anteriores, minimize/reabra e confirme que a conversa correta reaparece.
7. No teste inicial, peça a resolução completa: o tutor deve oferecer ajuda conceitual sem gabarito.
8. Execute e registre os casos A–G descritos em `docs/TUTOR-IA.md`, avaliando coerência e correção com revisão humana. Uma resposta recebida, sozinha, não comprova aprendizagem nem qualidade.

Os limites iniciais são oito gerações por minuto e 80 por dia UTC por conta. Eles também se aplicam a tentativas repetidas após falhas. O provedor pode impor limites próprios.

## Se não responder

| Sintoma | Verificação |
| --- | --- |
| Pede login | Entre em Minha conta; uma sessão expirada precisa ser renovada |
| Conversa não carrega | Confirme sucesso da migração, projeto e secret de runtime |
| Indisponibilidade | Confira `TUTOR_ENABLED=true`, binding AI e disponibilidade do serviço/modelo |
| Mensagem sobre faixa escolar | Confira o ano no perfil e aguarde a sincronização da conta |
| Mensagem sobre exercício atualizado | Atualize o site e abra a questão novamente |
| Limite de uso | Aguarde a janela indicada; excluir histórico não zera quotas |
| Erro depois de começar a responder | Tente novamente; o identificador evita repetir uma resposta já concluída no servidor |

Se precisar compartilhar logs para diagnóstico, remova tokens e não inclua mensagens privadas dos alunos. O backend evita devolver detalhes internos do provedor ou do banco ao estudante.
