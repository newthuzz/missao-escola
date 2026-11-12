# Professores e apoio pedagógico — relatório e operação

Implementação de 12/11/2026. Mantém HTML/CSS/JavaScript, Supabase Auth/Postgres, a API social no Cloudflare e o Tutor existentes.

## O que mudou

- Login com escolha de aluno/professor, cadastro institucional, confirmação de e-mail, consulta do andamento e recuperação de senha.
- Administração por instituição: indicadores, pesquisa de solicitações, aprovação/rejeição, turmas, disciplinas, vínculos de alunos, atribuições e suspensão de professores.
- Painel do professor: fila autorizada, atendimentos assumidos, histórico, filtros, notificações e perfil institucional.
- “Preciso de apoio” preserva o acolhimento e ganha pedidos, conversas persistentes e acompanhamento pelo aluno.
- Notificações individuais com Realtime e consulta alternativa a cada 25 segundos enquanto a página está visível. Ausência de conexão não simula confirmação de envio.

## Arquivos

| Arquivo | Responsabilidade |
| --- | --- |
| `account.js` | Auth existente, login por intenção, validação remota da sessão, recuperação e isolamento da sincronização dos estudos |
| `auth-callback.mjs` | Leitura e remoção imediata dos tokens do fragmento da URL; nenhum papel é aceito do callback |
| `pedagogy-api.mjs` | RPCs autenticadas, validação do cadastro e assinatura Realtime leve |
| `pedagogy-ui.js` | Painéis, formulários, conversas, estados e limpeza ao mudar a conta |
| `pedagogy.css` | Temas, responsividade, foco e componentes institucionais |
| `study-focus.css` | Correção do tamanho mínimo do seletor de dificuldade para evitar zoom de foco no iPhone |
| `index.html` | Folha de estilos e texto atualizado de disponibilidade do apoio |
| `scripts/build.mjs` | Inclusão dos novos módulos na distribuição estática |
| `supabase/migrations/20261112142420_pedagogical_support.sql` | Migração transacional, incremental e reaplicável |
| `supabase/bootstrap-pitagoras.sql` | Vínculo inicial autorizado à conta administradora já existente |
| `tests/pedagogy-api.test.mjs`, `tests/pedagogy-db.test.mjs` | Contratos, segurança e persistência |
| `tests/browser/pedagogy.cjs` | Fluxo completo em navegador com Auth e banco locais de teste |
| `tests/browser/beta.cjs`, `package.json`, `.gitignore` | Regressão atualizada, suíte e exclusão de temporários da CLI |

A migração não substitui `social_profiles`, backups nem dados de aprendizagem. Reutiliza `user_roles`; os novos nomes `edu_*` evitam colisões com os módulos existentes.

## Banco e autorização

| Entidade | Dados e acesso |
| --- | --- |
| `edu_schools` | Instituição, disponibilidade, contato e política de retenção |
| `edu_classes`, `edu_subjects` | Turmas/disciplinas vinculadas à instituição; chaves compostas impedem misturar escolas |
| `edu_profiles` | Nome institucional, separado do avatar social e do perfil de aprendizagem |
| `edu_admin_scopes` | Instituições administradas e autorização específica para casos reservados |
| `edu_memberships` | Matrículas/vínculos confirmados pela administração; sem autoinscrição |
| `edu_teacher_applications` | Estados pending/approved/rejected/cancelled e revisão administrativa |
| `edu_teacher_assignments` | Combinações explícitas professor/turma/disciplina; suspensão não restaura atribuições retiradas |
| `edu_support_requests` | Pedido do aluno, encaminhamento e estado open/in_progress/answered/closed |
| `edu_support_messages` | Mensagens cronológicas com remetente obrigatório obtido de `auth.uid()` |
| `edu_notifications` | Destinatário, tipo e referência; sem texto da conversa |
| `edu_audit_logs` | Aprovação, rejeição, configuração, vínculos e operações críticas; sem senha ou corpo de mensagens |

Todas as novas tabelas têm RLS. SELECT exige sessão confirmada e, quando o JWT contém `session_id`, uma sessão ainda existente e não expirada no Auth. Mutações diretas de `anon`/`authenticated` são revogadas; passam pela RPC `pedagogy_action`. Não há chave privilegiada no cliente.

A RPC pública usa SECURITY INVOKER e chama a implementação no esquema privado `pedagogy`, com SECURITY DEFINER, `search_path=''` e verificação da identidade, função e escopo a cada operação. Auxiliares de escrita não podem ser executados pelo navegador. A RPC anônima `pedagogy_catalog` expõe somente nomes/IDs ativos de instituições, turmas e disciplinas para o cadastro — nunca pessoas, pedidos ou mensagens.

- Aluno: somente seus pedidos/mensagens; enviar exige vínculo ativo na turma.
- Professor: somente fila autorizada ou seu atendimento; não lê atendimento atribuído a outro professor. Responder exige assumir o atendimento.
- Administrador: somente instituições de seu escopo; não cria administradores nem amplia o próprio escopo pelo painel.
- Casos reservados: aluno e administrador da instituição com `can_sensitive`; professores comuns não os leem. O canal depende de configuração institucional. Orientações de emergência existentes permanecem disponíveis.
- Metadados de cadastro são entrada não confiável: geram apenas solicitação pendente. Confirmar e-mail não aprova o professor.
- Aprovação bloqueia a solicitação durante a transação. Papel, atribuições, revisão, auditoria e notificação são atômicos. A interface exige confirmação do vínculo e combinações explícitas de turma/disciplina.
- Mensagens/pedidos usam identificador idempotente e comparação do conteúdo; repetir um envio sem confirmação não duplica registros. Limites: 3 solicitações de professor/dia, 10 pedidos de apoio/24h, 120 mensagens/hora por usuário.
- Listas em páginas de 25; conversas em lotes de 50. Não são publicados conteúdos de conversas no Realtime, somente a tabela de notificações com RLS e filtro do próprio usuário.

## Rotas equivalentes

A arquitetura já usa navegação por fragmentos. Não foi adicionado um roteador pesado.

| Ambiente | Rota |
| --- | --- |
| Aluno / início | `/#inicio` e páginas de estudo existentes |
| Conta / login | `/#social` |
| Professor | `/#professor` |
| Administração | `/#administracao` |
| Andamento do cadastro | `/#professor-pendente` |
| Ajuda ao aluno | `/#apoio` |

As páginas institucionais começam sem conteúdo privado até a verificação no servidor. Escolher “professor”, adulterar localStorage ou navegar diretamente não concede permissão. A troca de conta limpa conversas, modais e assinaturas. A revogação no banco vale na próxima operação; a interface verifica o contexto também nas atualizações periódicas.

## Configuração inicial e uso

1. Aplique a migração pelo processo autorizado de migrações do Supabase. Ela é transacional e reaplicável; não apaga os estudos existentes.
2. Para esta instalação, execute `supabase/bootstrap-pitagoras.sql` como proprietário confiável. O script só usa o único administrador existente com e-mail confirmado, cria **Colégio Pitagoras** se ausente e vincula o escopo. Se houver ambiguidade de administrador/instituição, falha sem alterar dados. Reaplicar preserva permissões existentes.
3. Entre com a conta administradora habitual. O servidor direciona ao painel administrativo.
4. Em **Turmas e vínculos**, cadastre as turmas e disciplinas reais. Confirme o vínculo de cada aluno pelo e-mail da conta já confirmada. Nenhuma turma ou pessoa fictícia é cadastrada automaticamente.
5. O professor solicita acesso em **Minha conta → Entrar como professor → Solicitar cadastro de professor**. Confirma o e-mail e aguarda a revisão.
6. A administração confere o vínculo e aprova somente as combinações de turma/disciplina corretas. Pode alterá-las ou suspender o acesso depois.
7. O aluno acessa **Apoio → Solicitar ajuda a um professor**. O professor usa a fila ou seus atendimentos para responder.
8. Configure o contato da coordenação e ative o canal reservado somente quando houver equipe autorizada para atendê-lo. O cadastro inicial concede a autorização reservada à conta administradora existente, mas deixa o canal desativado até a decisão da instituição.

### Primeiro administrador em outra instalação

O primeiro administrador precisa ser configurado por um operador confiável, fora do navegador público. Não existe “primeiro usuário vira administrador”.

1. Crie a conta pelo Supabase Auth e confirme seu e-mail; confira a identidade do responsável fora da aplicação.
2. No SQL Editor como proprietário, selecione o UUID exato dessa conta confirmada em `auth.users`. Não use metadados de cadastro, apelido ou parâmetros enviados pelo navegador para decidir o papel.
3. Em uma transação, insira `(UUID verificado, 'admin')` em `user_roles`, crie/selecione a instituição e insira o vínculo em `edu_admin_scopes`. `can_sensitive` só deve ser true para o responsável institucional designado.
4. Registre a operação em `edu_audit_logs`, confira os vínculos e encerre a transação. Faça login e verifique que somente a instituição autorizada aparece.

Não publique uma função de bootstrap nem uma service_role para executar essas etapas. No Colégio Pitagoras, já existe administrador: o script fornecido apenas estabelece o escopo, sem promover outra conta.

### Supabase Auth — verificar no painel

Em **Authentication → URL Configuration**, confira:

- Site URL: `https://missao-escola.arthur-m2602.workers.dev`.
- Redirect URLs: permitir o endereço da aplicação usado nos links de confirmação/recuperação (`https://missao-escola.arthur-m2602.workers.dev/**`, ou os destinos exatos necessários). Não autorize domínios de terceiros.
- Confirmação de e-mail habilitada para cadastros e provedor de envio configurado para o volume institucional.
- Verificar um e-mail real de confirmação e um de recuperação após a configuração. Os testes automatizados usam Auth isolado e não enviam e-mails reais.

O diagnóstico do projeto identificou proteção contra senhas vazadas desativada. Ative-a conforme o plano disponível: [guia oficial de segurança de senhas](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection). Essa configuração não é alterada pela migração SQL.

## Retenção e exclusão

Cada instituição começa com `retention_days=365` para atendimentos encerrados. A função privada `pedagogy.purge_expired_support()` está disponível somente ao proprietário; a migração não executa nem agenda exclusão. Antes de acioná-la/agendá-la, a instituição deve definir finalidade, base legal, prazo, atendimento aos direitos dos titulares e responsáveis pelos casos reservados. Mensagens e notificações ligadas ao pedido são removidas por cascata. Exclusões de contas seguem os relacionamentos com Auth. Auditoria registra operações sem conteúdo de conversa.

Esse mecanismo técnico não constitui uma certificação de conformidade com a LGPD. A instituição ainda precisa definir os procedimentos de acesso, retenção e resposta aos titulares. A identificação automática de palavras sensíveis é apenas uma barreira complementar; não substitui a escolha do canal reservado nem a equipe responsável.

## Validação executada

| Verificação | Resultado / limite |
| --- | --- |
| `npm test` | Aprovado: suíte existente e novas suítes de API/SQL |
| Migração aplicada duas vezes em PGlite | Aprovado: reaplicação e integridade |
| RBAC/RLS e chamadas diretas | Aprovado: aluno, professor pendente, outra escola, autoaprovação, falsificação de remetente e escrita direta negados |
| Atomicidade | Aprovado: falha injetada na notificação reverte aprovação, papel e vínculos |
| Aprovação concorrente | Aprovado no executor PGlite local: um resultado e atribuições sem duplicação; não substitui teste de carga com múltiplas conexões Postgres |
| Sessão revogada | Aprovado: RPC e SELECT direto bloqueados após remoção da sessão de teste |
| Atribuições | Aprovado: pares explícitos, edição limitada à escola, suspensão/reativação não restaura links retirados |
| Conversas | Aprovado: envio, resposta, remetente, encerramento, histórico, lotes de 50, repetição idempotente |
| Navegador institucional | Aprovado com Auth/banco locais: cadastro, confirmação, pendência, aprovação, ativação, conversa, perda da confirmação de envio, recuperação e saída |
| Atualização alternativa | Aprovado em navegador: mensagem aparece pelo polling após falha simulada do WebSocket |
| Administração em navegador | Aprovado: turmas, disciplinas, vínculo de aluno, edição de atribuições, suspensão/reativação |
| Layout | Aprovado: 360/768/1440 px, temas claro/escuro, texto a 200%, sem rolagem horizontal nos percursos testados |
| Acessibilidade básica | Rótulos, foco visível, modal nativo com foco interno/devolução, estados anunciados e movimento reduzido; não é auditoria completa com leitores de tela |

As capturas em `work/pedagogy-captures/` são explicitamente **prévia com contas locais de teste**, sem dados de estudantes reais. Os testes de navegador não fazem alterações no banco de produção.

## Implantação e limites da verificação

O registro final da migração, publicação e regressões está na seção abaixo. Entrega real de e-mail, conversa entre duas contas reais, comportamento do Realtime em rede móvel e carga concorrente de produção exigem validação operacional posterior; não foram simulados como resultados de produção.

### Registro desta entrega

- `npm test`, build estático e testes de navegador institucional, beta, social, sincronização, Tutor e HTML portátil: **aprovados**.
- A regressão do Tutor identificou inicialmente o seletor de dificuldade com fonte de 13,6 px no celular. A regra de `study-focus.css` foi corrigida para o mínimo de 16 px, e a suíte completa do Tutor passou na nova execução. Nenhum teste conhecido permanece reprovado.
- Antes da tentativa de ativação: banco com um administrador existente, três backups e três perfis sociais; nenhuma tabela `edu_*`.
- **Migração de produção pendente.** A integração Supabase retornou `status=expired` em duas solicitações `apply_migration`, sem aprovação concluída. A consulta após a primeira tentativa confirmou zero tabelas `edu_*`. Não foi utilizado outro canal para contornar a confirmação.
- O bootstrap do **Colégio Pitagoras** também está pendente, pois depende da migração. O código está pronto para vincular a única conta administradora confirmada; não foi criada instituição fictícia nem outra conta privilegiada.
- Não houve testes com pessoas reais, entrega real de e-mails nem confirmação de Realtime em produção. Os resultados SQL/navegador descritos acima são locais e isolados.
- O diagnóstico de segurança anterior apontou proteção contra senhas vazadas desativada e avisos informativos de RLS sem política em tabelas antigas de social/IA, destinadas ao acesso de serviço. Não houve alteração nessas políticas antigas. Os advisors precisam ser executados novamente depois que a migração for autorizada/aplicada.

### Ativação manual se a confirmação da integração não funcionar

No painel do projeto Supabase **missao escola**, abra **SQL Editor → New query**:

1. Cole todo o conteúdo de `supabase/migrations/20261112142420_pedagogical_support.sql` e clique **Run**. Aguarde o sucesso antes do próximo passo.
2. Em outra consulta, cole `supabase/bootstrap-pitagoras.sql` e clique **Run**. O script verifica a conta administradora e o nome informado antes do vínculo.
3. Confira o resultado desta consulta sem expor e-mails ou credenciais:

```sql
select s.name,
       (select count(*) from public.edu_admin_scopes a where a.school_id=s.id) as administradores_vinculados
from public.edu_schools s
where s.name='Colégio Pitagoras';
```

4. Entre no site com sua conta administradora habitual. Abra **Turmas e vínculos** para cadastrar os nomes reais. Enquanto a migração não estiver instalada, o apoio informa que ainda não foi ativado; os estudos existentes permanecem disponíveis.
5. Execute **Database → Advisors** e confira a configuração de Auth descrita acima. Em implantação gerenciada por CLI, registre/reconcilie a migração executada manualmente antes de futuros `db push`; o SQL Editor não insere automaticamente o histórico da CLI.

Não cole senha, chave secreta ou service_role no SQL ou no chat. Os arquivos fornecidos não precisam desses valores.
