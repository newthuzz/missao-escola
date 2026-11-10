# Base dos exploradores

Redesign local da área social, 10/11/2026. Não publicado e sem migrações executadas em produção.

## Experiência

Visão geral, Amigos e Minha liga; perfil com oito ilustrações SVG locais originais, quatro cenários, quatro molduras e quatro títulos. Editor com prévia imediata, salvar/cancelar e modal nativo com foco devolvido ao botão de abertura. Perfis antigos com símbolos continuam válidos e são representados por ilustrações equivalentes. A substituição pelo novo identificador acontece ao salvar no editor.

O estado carrega automaticamente após login. Conta e sincronização continuam disponíveis em uma seção expansível. Amigos e convites usam cartões com identidade e capa. Ranking usa avatar, título, moldura, destaque do próprio usuário e das três primeiras posições. As quatro ligas têm emblemas distintos. Bloqueios ocultam apelido e personalização no ranking da liga.

Desafios continuam com três questões geradas pelo servidor. A API retorna `sessionPoints`, soma das respostas confirmadas da sessão, inclusive quando retomada. Reenvios conservam a proteção transacional existente. Nenhuma regra de pontuação, limite ou promoção foi alterada.

## Migração e publicação, após autorização

1. Faça backup do banco e confirme que `supabase/social.sql` já foi aplicado. Em instalação nova, execute primeiro esse arquivo base.
2. Execute **supabase/social-personalization.sql** no mesmo projeto Supabase. É uma migração incremental e reaplicável: preserva perfis, amizades, bloqueios, pontos e sessões; adiciona padrões para usuários antigos e atualiza a função `social_action`.
3. Não execute a migração base novamente depois da incremental: ela contém a versão anterior da função. Se isso acontecer, reaplique a incremental antes de publicar o frontend.
4. Publique frontend e Worker juntos, após aplicar o SQL e executar os testes. O build inclui `social.js`, `social-art.js` e `social.css`. A chave `SUPABASE_SERVICE_ROLE_KEY` permanece somente no backend.
5. Valide no domínio publicado usando duas contas de teste. A publicação do Cloudflare não executa o SQL do Supabase.

O backend novo aceita clientes antigos com os quatro símbolos. Para retornar ao frontend anterior, mantenha a migração incremental; não remova colunas com dados de personalização. O frontend novo requer a migração para salvar as novas opções.

## Verificações locais

- `npm test`: API, SQL, autorização, limites, reenvios, sincronização, estudos e tutor. O teste social inclui perfis antigos, identificadores inválidos, propagação de cosméticos, ocultação por bloqueio e reaplicação da migração.
- `npm run build`.
- `node tests/browser/social.cjs`: Chromium com duas contas isoladas, API Cloudflare real e RPC SQL em PGlite local. Testa cadastro social, salvar/recarregar/cancelar, devolução de foco, convite/aceite, bloqueio/desbloqueio, entrada na liga, retomada e conclusão de sessão e recuperação de indisponibilidade. Captura 360/768/1440 px nos temas claro/escuro e verifica ausência de overflow.
- `node tests/browser/progress-sync.cjs`: restauração, renovação de sessão, envio automático, uso offline, conflitos em dois aparelhos e troca de conta. O teste aguarda a abertura terminar e abre a seção de conta para as ações manuais.
- As capturas usam somente contas locais de teste e ficam em `work/social-captures/`.

Nenhum serviço externo real foi usado para comprovar persistência em produção. Supabase/Cloudflare reais, dispositivos físicos, Safari e Firefox permanecem pendentes. O modal nativo oferece contenção de foco e Escape; a verificação de navegador confirma Escape e devolução do foco.
