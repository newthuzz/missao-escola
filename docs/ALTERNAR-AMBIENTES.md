# Alternância exclusiva de ambientes

A conta administradora existente do Colégio Pitagoras pode alternar pelos botões **Administrador**, **Professor** e **Aluno** no topo do conteúdo. No celular, o primeiro botão usa o rótulo curto **Admin** e mantém o nome acessível completo. Os botões aparecem somente após a autorização retornada pelo servidor.

A escolha permanece na mesma aba após recarregar. Não requer outra conta ou novo login. No ambiente de aluno, estudo, jornada, social e sincronização usam os dados da própria conta. Ao retornar ao professor ou à administração, a interface volta aos controles institucionais. Alternar não cria matrículas, atribuições ou perfis fictícios.

## Autorização

- `edu_workspace_owners` admite uma única linha e um único usuário, com RLS e leitura restrita ao próprio titular. O navegador não pode inserir, alterar ou remover essa autorização.
- A capacidade também exige que o usuário ainda tenha o papel administrativo e um escopo institucional ativo. Ser outro administrador não basta.
- `pedagogy.workspace_action` é a implementação privada da RPC pública existente. Acrescenta `canSwitchWorkspace` ao contexto e valida `switch_workspace` por `auth.uid()`, sessão e autorização atual do banco.
- O papel real continua `admin`. O modo salvo no navegador é apenas uma preferência de apresentação e não concede permissões.
- O painel do professor da conta proprietária usa somente os pedidos autorizados de suas instituições, permite assumir e responder e separa os atendimentos reservados à coordenação para o ambiente administrativo. Professores normais mantêm suas atribuições e acessos anteriores.
- A revogação da autorização ou do papel administrativo bloqueia imediatamente novas trocas no servidor. A interface retira os botões ao atualizar o contexto ou receber a recusa do servidor.
- Não existe função pública para promover outra conta a proprietária. O script `supabase/bootstrap-owner-workspaces.sql` é uma operação do proprietário do banco e valida a única conta administradora confirmada e seu vínculo com o Colégio Pitagoras. Não substitui uma proprietária diferente já cadastrada.

## Arquivos

Migração incremental `supabase/migrations/*_owner_workspaces.sql`; script de autorização `supabase/bootstrap-owner-workspaces.sql`; interface em `pedagogy-ui.js` e `pedagogy.css`; integração da conta/sincronização em `account.js`; testes em `tests/owner-workspaces.test.mjs` e `tests/browser/owner-workspaces.cjs`. A migração original de suporte é preservada.

## Validação

A suíte SQL verifica a capacidade exclusiva, a impossibilidade de um segundo proprietário, três modos permitidos, administradores/professores/alunos sem essa autorização, adulteração de identificadores, escrita direta negada, escopo institucional, separação dos casos reservados, resposta como a identidade real, revogação e reaplicação segura do bootstrap.

O teste em navegador usa exclusivamente banco/Auth locais. Verifica três modos, recuperação de falha na troca, estudo com XP preservado, sincronização, persistência após recarregar, outro administrador sem acesso, aluno com armazenamento adulterado, revogação, teclado, texto ampliado e os layouts 360/768/1440 px em dois temas. Capturas locais em `work/owner-workspaces/` são prévias com dados de teste.

A ativação em produção e os resultados finais são registrados após aplicar a migração e conferir os advisors. Não são criados usuários, turmas, mensagens ou dados de demonstração em produção para esses testes.

## Ativação em produção

Migração `20261112165552_owner_workspaces` aplicada e registrada no Supabase, seguida do bootstrap autorizado. Confirmado um único titular, vinculado ao administrador existente do Colégio Pitagoras. RLS ativo, ausência de leitura anônima/escrita direta de clientes e função auxiliar privada sem execução por `authenticated`.

Uma transação de verificação, revertida ao final, consultou o contexto de todas as contas confirmadas com o papel `authenticated`: somente o titular recebeu `canSwitchWorkspace=true`; seus três modos foram aceitos e os pedidos das demais contas foram recusados. O painel do professor respondeu para o titular. Não foram criados dados de demonstração em produção. Permaneceram os três backups e três perfis sociais anteriores.

Advisors sem novos problemas de segurança ou chaves estrangeiras sem índice neste recurso. Permanece a configuração anterior de [proteção contra senhas vazadas desativada](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection), além dos avisos anteriores dos módulos de social/IA. Os índices existentes ainda sem uso são informativos; não foram removidos.

A inspeção com fonte ampliada identificou que as colunas fixas dos indicadores podiam transbordar. As colunas agora se reorganizam conforme o espaço e o tamanho do texto, sem ocultar conteúdo.
