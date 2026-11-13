# Cadastro de escolas pelo administrador

Implementado em 13/11/2026, no painel **Administrador → Escolas → Cadastrar nova escola**.

O formulário recebe o nome completo da escola e um contato opcional da coordenação. Após confirmar, o sistema vincula a escola à conta administradora, atualiza a lista de instituições e abre **Turmas e vínculos** com a nova escola selecionada. A seção **Escolas** lista somente as instituições administradas pela conta e oferece **Gerenciar escola** para selecionar cada uma.

Contas com papel administrativo confirmado podem cadastrar sua primeira escola mesmo sem vínculo anterior. Professores e alunos não podem executar o cadastro. Esta permissão não concede a alternância exclusiva dos três ambientes: a autorização da conta proprietária permanece separada.

## Implementação

- `pedagogy-ui.js`: seção Escolas, formulário, seleção e atualização do contexto, estados de operação e repetição segura após erro.
- `supabase/migrations/20261113114600_admin_school_registration.sql`: função privada `pedagogy.create_school`, extensão da RPC pública existente e índices de nomes e idempotência.
- `tests/admin-schools.test.mjs`: permissões, integridade e transações em banco local PGlite.
- `tests/browser/admin-schools.cjs`: cadastro completo com Auth e banco locais.
- `tests/pedagogy-db.test.mjs` e `package.json`: aplicação das migrações e inclusão na suíte.

O nome tem de 2 a 160 caracteres; o contato, até 300. Espaços consecutivos são normalizados. A comparação de nomes ignora diferenças entre maiúsculas e minúsculas e espaços. Um nome já existente, inclusive em escola inativa, é recusado sem conceder vínculo ao solicitante. O cadastro não substitui o procedimento de autorização para acessar uma escola existente.

A função verifica `auth.uid()`, a sessão confirmada e o papel `admin` atual em `user_roles`; não aceita o usuário responsável ou permissões de campos enviados pelo navegador. É executada em esquema privado, com SECURITY DEFINER e search_path fixo. A RPC pública permanece SECURITY INVOKER, sem execução anônima. Escritas diretas nas tabelas continuam revogadas para clientes.

A escola, o vínculo e a auditoria são gravados na mesma transação. O vínculo novo começa com `can_sensitive=false`, e o canal reservado não é ativado automaticamente. O cadastro não cria professores, alunos, matrículas ou turmas.

Identificador de envio, índice único de auditoria e bloqueios transacionais impedem duplicação ao repetir uma requisição. Reutilizar um identificador com outro conteúdo é recusado. O bloqueio por nome também serializa solicitações de administradores diferentes. A interface impede novos envios durante a operação e preserva o formulário em caso de falha.

## Verificações executadas

- `npm test`: aprovado, incluindo cadastro de escolas, funções institucionais, alternância exclusiva e suítes existentes.
- `npm run build`: aprovado.
- Banco local: cadastro permitido apenas para admin, primeira escola, normalização, limites, tentativa de atribuir outro usuário/permissões, isolamento entre administradores, nomes duplicados/inativos, repetição idempotente, revogação e reversão completa quando a auditoria falha.
- Navegador local: perda simulada da confirmação após gravar no servidor, repetição sem duplicação, vínculo e seleção automáticos, criação de turma, persistência após recarregar, segundo administrador e aluno sem acesso indevido, primeira escola e 360/768/1440 px em ambos os temas, incluindo texto ampliado.
- Regressões em navegador: alternância administrador/professor/aluno, estudos e sincronização, cadastro/aprovação de professores e conversas persistentes aprovados.

As capturas em `work/admin-schools/` são prévias com dados de teste locais. O teste de repetição concorrente usa o executor PGlite local; não equivale a um teste de carga com múltiplas conexões Postgres.

## Ativação e produção

A migração `20261113114600_admin_school_registration` foi aplicada no Supabase. A verificação de produção confirmou que o administrador recebe a recusa de duplicidade para a escola já existente e que as contas confirmadas sem papel administrativo recebem recusa de acesso. A transação de verificação foi revertida. Nenhuma escola fictícia foi cadastrada em produção; o primeiro cadastro de outra escola real deve ser feito no formulário.

Os advisors não apontaram novos problemas de segurança ou chaves estrangeiras sem índice neste recurso. Permanecem os avisos anteriores de social/IA e de [proteção contra senhas vazadas desativada](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection). Índices ainda sem uso são informativos em uma funcionalidade nova.

Não é necessário executar SQL manualmente. Atualize o site, entre na conta administradora e abra **Escolas**.
