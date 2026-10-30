# Ativar amigos e ligas no Cloudflare Pages

## 1. Supabase

No projeto `pxnvttqsgjnakeukttdr`, execute **supabase/social.sql** no SQL Editor. É uma migração adicional: mantenha a tabela de backups existente. O arquivo pode ser executado novamente sem apagar os dados.

A migração cria perfis, amizades, bloqueios, ligas, participantes e sessões. Todas as tabelas sociais têm RLS e negam acesso direto a `anon` e `authenticated`. A função `social_action` só pode ser executada pelo `service_role`. A API do Cloudflare valida o token no Supabase Auth e determina a identidade; não confia no ID enviado pelo navegador. E-mail, rotina, perfil de aprendizagem e backup não são retornados pela API social.

## 2. Cloudflare

Esta implementação usa **Cloudflare Pages Functions**, em `functions/api/social.js`. O site precisa estar em um projeto **Pages conectado ao GitHub**. Um Worker separado ou upload apenas do HTML não executa essas Functions.

No projeto Pages, em **Settings → Variables and Secrets**, configure para Production:

- `SUPABASE_SERVICE_ROLE_KEY`: tipo **Secret**, com a chave **service_role JWT legada** do projeto Supabase, disponível nas configurações de API. A API usa essa chave somente no servidor. Não use a chave pública e não envie o segredo no chat ou no GitHub.
- `SUPABASE_URL`: variável opcional, valor `https://pxnvttqsgjnakeukttdr.supabase.co`. Esse endereço já é o padrão do código.

Se quiser testar em Preview, configure também nesse ambiente. Refaça o deploy depois de salvar as variáveis. O código valida a sessão consultando `/auth/v1/user`; a chave JWT legada é necessária porque é usada também como Bearer na chamada PostgREST. Não substitua por uma `sb_publishable_…` ou `sb_secret_…` sem adaptar o transporte.

Configuração de build: framework **None**, comando de build `npm run build`, diretório de saída `dist`. O diretório `functions` deve estar na raiz do repositório. `_routes.json` limita a execução de Functions a `/api/*`.

Mantenha o domínio publicado configurado em Supabase **Authentication → URL Configuration** para o cadastro e confirmação de e-mail já existentes.

## 3. Testar no site publicado

1. Entre em **Minha conta** e clique em **Carregar amigos e ligas**. Crie um apelido público.
2. Em outro navegador ou janela privada, entre com outra conta, crie outro perfil e copie o código de amizade.
3. Na primeira conta, envie o convite pelo código. Na segunda, atualize a lista e aceite. Verifique que ambos aparecem como amigos.
4. Entre na liga em ambas as contas. Comece uma sessão, responda às três questões e atualize o ranking na outra conta.
5. Recarregue no meio da sessão: ela deve reaparecer ao carregar amigos e ligas, enquanto não expirar.
6. Bloqueie a outra conta: a amizade desaparece e novos convites são recusados. A liga mantém os pontos; apelidos de jogadores bloqueados ficam ocultos.

## Regras desta versão

- Sessões com três questões de adição/subtração, geradas no servidor. Esta primeira versão competitiva não cobre as demais matérias nem adapta a dificuldade ao ano escolar.
- Semana começa na segunda-feira às 00h de Brasília. A liga da nova semana é criada quando o usuário entra; não exige cron.
- Até dez jogadores por grupo e quatro faixas: Aurora, Celeste, Cristal e Estelar.
- Os três primeiros com pontos sobem na próxima participação se o grupo anterior tinha pelo menos quatro pessoas. Empates usam o identificador do usuário como desempate. Não há rebaixamento.
- Dez pontos por acerto, até vinte acertos pontuados por dia; quinze de bônus por sessão com acerto, até três bônus por dia; no máximo dez sessões iniciadas por dia. Sessões expiram após trinta minutos ou na mudança do dia/semana.
- A mesma resposta reenviada retorna o resultado anterior sem pontuar novamente. Operações são transacionais e serializadas por jogador; entrada nas ligas também é serializada.
- Pontos das ligas não alteram XP, estrelas ou o backup local. Não há importação de pontos do ChatGPT.
- Perfis são encontrados pelo código compartilhado, sem busca pública por nome. Participantes veem apelidos e pontos da própria liga. Não há chat, reações, equipes, denúncias ou loja social nesta versão.
- O backup dos estudos é sincronizado automaticamente pela conta e permanece separado dos pontos sociais. O ranking social é atualizado pelo botão de atualização; não usa Realtime.
- Configure rate limiting para `/api/social` no Cloudflare antes de abrir para um público amplo. Os limites de pontuação já são aplicados no banco; proteção contra volume abusivo de requisições pertence também à configuração do Cloudflare.

## Validação automatizada

`npm ci` e `npm test` executam testes do transporte, da API Cloudflare e da migração em PostgreSQL local (PGlite). Eles não substituem o teste no projeto Supabase e no domínio Cloudflare reais.
