# Publicar no Worker existente

Destino informado: Worker `missao-escola`, conta `702c08a2b345e9051dad28b56b3e34d0`. A configuração `wrangler.jsonc` usa esse nome e essa conta e publica o site de `dist/` com uma entrada para `/api/social`. O backend de autenticação/pontuação é o mesmo já implementado em `functions/api/social.js`.

No painel do Worker:

1. Em **Settings → Build**, use a raiz do repositório: **Root directory vazio**, nunca `/dist`. A pasta `dist` é criada pelo build.
2. **Build command:** `npm run build`.
3. **Deploy command:** `npx wrangler deploy`.
4. Em **Settings → Variables and Secrets** do Worker de produção, mantenha `SUPABASE_SERVICE_ROLE_KEY` como **Secret de execução**. Uma variável disponível apenas durante a build não é suficiente. Não coloque a chave no repositório.
5. O SQL `supabase/social.sql` continua necessário para amigos e ligas. Não há SQL adicional para as melhorias do estudo personalizado.
6. Refaça o deploy depois de salvar as configurações. O arquivo Wrangler também executa o build antes de publicar, permitindo publicação pela CLI a partir da raiz.

A publicação direta pela CLI exige autenticação autorizada na conta Cloudflare. Um push na branch integrada pode iniciar o pipeline, mas não comprova que a publicação terminou. Confira a implantação correspondente ao commit e use **Visit** para obter o endereço público do site.

O suporte a Cloudflare Pages foi preservado: projetos Pages podem continuar usando `npm run build`, saída `dist` e as Functions na raiz.
