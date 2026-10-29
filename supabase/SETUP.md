# Ativar o banco e publicar

Esta versão é um site estático, com Supabase Auth e backup privado de progresso, perfil de aprendizagem e rotina. O salvamento é manual. Amigos, ligas, avatares sociais e correção competitiva do servidor original ainda não foram migrados. Não existe importação automática de dados do servidor antigo. Os dados locais de outro domínio precisam ser migrados separadamente.

1. No projeto Supabase `pxnvttqsgjnakeukttdr`, abra o **SQL Editor** e execute `supabase/schema.sql`. O SQL cria a tabela, políticas de acesso por usuário e função de salvamento com controle de versão.
2. Em **Authentication → Providers**, habilite e-mail e senha. Em **URL Configuration**, configure **Site URL** com o domínio final do site e os redirecionamentos necessários. A confirmação de e-mail deve voltar ao site publicado. Configure SMTP próprio para envio de e-mails em produção.
3. Publique a pasta do repositório no GitHub e conecte-a ao **Cloudflare Pages**. Selecione framework **None**, sem comando de build e diretório de saída `.`. Não são necessárias variáveis secretas no Cloudflare. A chave `sb_publishable_…` é pública por definição; a proteção dos dados depende das políticas SQL. Nunca adicione uma chave `service_role` ao site.
4. Abra o site por HTTPS, vá a **Minha conta**, crie a conta, confirme o e-mail e entre. Clique em **Atualizar cópia** antes de decidir salvar ou carregar. O site não envia dados automaticamente.
5. Para validar: salve o progresso de uma conta, entre na mesma conta em outro navegador e carregue o backup. Entre com uma segunda conta e confirme que ela não vê o backup da primeira. Em dois aparelhos com a mesma revisão, salve no primeiro e confirme que o segundo informa conflito ao salvar. Atualize a cópia antes de decidir qual versão manter.

## Desenvolvimento local

Use o checkout existente, sem criar worktrees. Em `/workspace/missao-escola`, execute `python3 -m http.server 8000 --bind 127.0.0.1` e acesse pelo navegador local. Não abra o HTML por `file://`, pois ele usa um módulo JavaScript externo.

Execute `node --test tests/cloud-api.test.mjs` para os testes do transporte HTTP. Esses testes usam respostas simuladas; não validam a aplicação do SQL, as políticas reais nem o envio de e-mails. A restauração pede confirmação e guarda uma cópia anterior em `missao-escola-before-restore` no armazenamento local.

## Recuperar senha

Esta primeira integração ainda não inclui fluxo de recuperação de senha na interface. Configure um fluxo de recuperação antes de disponibilizar contas ao público em produção.
