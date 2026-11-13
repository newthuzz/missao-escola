# Correção do cadastro de professores

## Diagnóstico confirmado

O painel anterior só aprovava solicitações feitas pelos próprios professores. A seção Professores não cadastrava pessoas por e-mail e nem retornava o e-mail dos professores vinculados. A conta proprietária podia abrir o painel por sua autorização exclusiva, mas não tinha o papel `teacher` nem atribuições docentes reais.

Na inspeção de produção havia três escolas administradas pela conta proprietária; somente CDL-BH possuía uma turma e uma disciplina configuradas. Nenhuma das escolas tinha solicitações ou vínculos docentes. Não foram impressos e-mails pessoais, senhas ou chaves para fazer esse diagnóstico.

## Correção preparada

- **Administrador → Professores → Cadastrar professor por e-mail**, com nome, e-mail, combinações explícitas de turma/disciplina e confirmação do vínculo.
- Contas já confirmadas recebem a vinculação docente imediatamente. Quem ainda não tem conta fica com o cadastro pendente de ativação.
- O professor novo usa o link de ativação mostrado no painel, cria sua senha pessoal e confirma sua própria conta no Supabase Auth. O administrador não cria nem conhece essa senha. O formulário não afirma enviar convites por e-mail.
- A ativação depende do e-mail confirmado da sessão real, da autorização administrativa ainda válida e de turmas/disciplinas ativas. Metadados ou parâmetros do navegador não concedem papéis.
- A lista administrativa passa a exibir o e-mail real, a situação de ativação e as atribuições. O cadastro pendente pode ser cancelado, e a suspensão/reativação docente permanece separada da administração.
- Escolas sem turma ou disciplina recebem uma orientação e um acesso direto para configurá-las.
- O script `supabase/bootstrap-owner-teacher.sql` cadastra a conta proprietária existente como docente nas escolas que ela já administra. Usa somente pessoas e escolas reais; quando há exatamente uma turma e uma disciplina existentes, ativa essa combinação. Nos demais casos lista o proprietário sem inventar atribuições e permite escolhê-las depois.
- A autorização exclusiva dos três ambientes permanece vinculada a uma única conta. Cadastrar outro professor não concede administração nem alternância de ambientes.

## Arquivos e segurança

Migração `supabase/migrations/20261113145811_teacher_registration.sql`; correção de dados `supabase/bootstrap-owner-teacher.sql`; interface em `pedagogy-ui.js`, `pedagogy.css`, `pedagogy-api.mjs` e `account.js`.

`edu_teacher_registrations` possui RLS, leitura somente para o administrador da escola ou o docente já vinculado e nenhuma mutação direta por clientes. E-mails de terceiros não são expostos aos alunos. Operações privilegiadas estão no esquema privado `pedagogy`, com search_path fixo; a RPC pública continua SECURITY INVOKER e sem execução anônima.

Cadastro, papel docente, aprovação institucional, vínculos, auditoria e notificação interna são transacionais. O remetente e os papéis nunca são aceitos do formulário. Repetir um envio sem confirmação não duplica registros. Solicitações canceladas, administrador sem autorização, conta não confirmada e atribuições inativas não ativam o docente. Reativar uma suspensão não restaura um papel que foi revogado no banco.

## Testes executados

- `npm test`: aprovado na implementação, incluindo regressões existentes.
- `tests/teacher-registration.test.mjs`: aprovado com a versão final da migração; contas existentes, novas, pendentes, canceladas, revogação, isolamento de escolas, idempotência, transação com falha injetada e bootstrap idempotente do proprietário.
- `tests/pedagogy-api.test.mjs`: aprovado; o novo formulário de ativação envia apenas credenciais pessoais ao Auth, sem escola, papel ou autoridade de aprovação do cliente.
- `tests/browser/teacher-registration.cjs`: aprovado com Auth/SQL locais; e-mail do proprietário, vínculo existente, perda da confirmação de envio, ativação de novo usuário, estado pendente com turma inativa, confirmação de e-mail, painel, edição de atribuições, suspensão/reativação e acesso negado para aluno.
- `tests/browser/pedagogy.cjs`: fluxo anterior de solicitação/aprovação e atendimento aprovado.
- `tests/browser/owner-workspaces.cjs` e `tests/browser/progress-sync.cjs`: alternância exclusiva e sincronização aprovadas.
- Build estático, build e regressão do HTML portátil: aprovados. Log em `work/teacher-registration-portable.log`.

As capturas em `work/teacher-registration/` são prévias identificadas por dados locais de teste. Nenhum e-mail real foi enviado para validar o fluxo, e não foi comprovada a entrega de e-mails de confirmação do provedor em produção.

## Ativação em produção

Migração `20261113145811_teacher_registration` aplicada com sucesso no Supabase em 13/11/2026, seguida do script `supabase/bootstrap-owner-teacher.sql`, após a confirmação do usuário. O nome do arquivo local foi alinhado ao histórico real da integração.

Verificações de produção:

- Conta proprietária com papéis `admin` e `teacher`, três cadastros docentes reais e uma atribuição ativa na turma/disciplina já existentes na CDL-BH.
- Colégio Pitagoras e Ari da Franca: proprietário listado como docente, sem inventar turmas ou disciplinas. As atribuições podem ser definidas depois pelo painel.
- Uma transação revertida verificou o contexto administrativo e a lista de professores de cada escola com o papel `authenticated`: o e-mail retornado para o proprietário corresponde ao e-mail real da conta. O endereço não foi impresso nos resultados.
- Permanece uma única conta autorizada a alternar os três ambientes. Três backups e três perfis sociais preservados.
- RLS ativo em `edu_teacher_registrations`; leitura anônima, mutação direta por clientes e execução do auxiliar de ativação pelo cliente negadas.
- Advisors sem novos problemas de segurança ou chaves estrangeiras sem índice neste recurso. Índices ainda sem uso são informativos. Permanecem os avisos anteriores dos módulos de social/IA e de [proteção contra senhas vazadas desativada](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

As duas tentativas anteriores de confirmação haviam expirado sem executar alterações. A nova confirmação permitiu concluir a ativação pela mesma integração; não foi usado um canal alternativo para contornar a confirmação.

Não é necessário executar SQL manualmente. Atualize o site e abra **Administrador → Professores**. O cadastro por e-mail requer selecionar uma escola com turmas e disciplinas reais configuradas. Contas existentes e confirmadas são vinculadas no cadastro; pessoas sem conta usam o link de ativação apresentado e confirmam o próprio e-mail.
