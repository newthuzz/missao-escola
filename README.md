# Missão Escola

Site estático de estudos com Supabase Auth, backup privado e amigos/ligas por Cloudflare Pages Functions.

- [Login, backups e publicação](supabase/SETUP.md)
- [Ativação de amigos e ligas](supabase/SOCIAL-SETUP.md)
- [Migração SQL social](supabase/social.sql)
- [Melhorias do estudo personalizado, testes e limites](docs/ESTUDO-PERSONALIZADO.md)

O frontend usa apenas a chave pública. A chave `service_role` deve ficar exclusivamente nos Secrets do projeto Cloudflare Pages. Não é necessário passar pelo servidor do ChatGPT.

Para desenvolvimento, use o checkout existente. `npm ci` instala as dependências de teste e `npm test` verifica o transporte HTTP, a API e as operações SQL em PostgreSQL local via PGlite. Node.js 20 ou superior é recomendado. `npm run build` copia os arquivos públicos para `dist/`, sem incluir testes, SQL ou dependências no site publicado. No Cloudflare Pages, use esse comando e diretório de saída `dist`.

O backend social só funciona quando as Pages Functions estão sendo executadas. Um servidor estático simples permite visualizar a interface, mas não executa `/api/social`.

Para o Worker existente `missao-escola`, use a configuração `wrangler.jsonc` e as instruções em [Publicar no Worker](docs/CLOUDFLARE-WORKER.md). O backend social é compartilhado entre Pages e Workers.
