# Progresso automático da conta

Quando há uma sessão Supabase válida, o site consulta a cópia privada da conta e carrega progresso, perfil de aprendizagem e rotina automaticamente. Não é necessário pressionar “Carregar” a cada entrada.

## Funcionamento

- Ao entrar ou abrir o site já autenticado, consulta a última revisão salva no Supabase.
- Se já existir uma cópia e não houver trabalho local pendente vinculado à mesma conta, ela é carregada. Antes da troca, o estado anterior é guardado em `missao-escola-before-restore`.
- Sem cópia online, os estudos de um visitante podem ser salvos como primeira cópia da conta. Se os estudos estiverem identificados como pertencentes a outra conta, eles são arquivados localmente e a conta nova começa com estudos em branco. Não há importação automática entre contas diferentes.
- Alterações salvas pelo app são enviadas depois de aproximadamente 1,2 segundo sem novas alterações. O site também confere a conta ao recuperar conexão, receber foco ou voltar a ficar visível, e a cada 20 segundos enquanto está visível.
- Uma cópia nova de outro aparelho só substitui automaticamente um aparelho sem alterações pendentes. Não há mesclagem automática de XP, perfis ou rotinas.
- Edições ainda não salvas de perfil, preferências ou rotina adiam a aplicação de uma cópia recebida. Salve ou descarte a edição e sincronize novamente.
- Se ocorrer uma alteração durante a consulta inicial, ela também impede a substituição automática.

## Offline e conflitos

A falta de conexão mantém os dados neste navegador. A sincronização tenta novamente ao recuperar a conexão. Se a página for recarregada, o site compara o estado local com a revisão de base conhecida: trabalho pendente da mesma conta pode ser enviado se a cópia online não tiver mudado.

Se os dois aparelhos tiverem alterações, o site pausa o envio e mostra uma mensagem em **Minha conta**. O usuário escolhe:

- **Usar progresso deste aparelho:** consulta a revisão atual e tenta substituí-la com confirmação e controle de concorrência.
- **Carregar progresso da conta:** carrega a revisão online consultada, mantendo uma cópia anterior local e pedindo confirmação.

Uma nova corrida entre consulta e salvamento não sobrescreve o vencedor: o RPC existente valida a revisão e retorna conflito. Não se deve tentar resolver conflitos alterando apenas o número da revisão no navegador.

O estado e a mensagem de sincronização ficam em **Minha conta**. Erros de armazenamento ou formato da cópia não autorizam descartar o progresso atual. Uma cópia inválida mantém a sincronização em erro até a correção dos dados ou a restauração por um procedimento apropriado.

## Limites

- Fechar a aba imediatamente após uma resposta pode interromper uma solicitação. A cópia local persistida será examinada na próxima entrada. Não há garantia de envio depois que o navegador é fechado.
- Nenhuma solução pode recuperar alterações feitas offline se o usuário limpar o armazenamento antes de sincronizar.
- Esta implementação utiliza consultas periódicas; não é atualização instantânea via Supabase Realtime.
- Cópias anteriores antigas com versão v1 do perfil de aprendizagem continuam aceitas e são normalizadas pelo motor atual. Formatos futuros/desconhecidos são rejeitados.
- Não substitui os controles de acesso do Supabase: a tabela continua privada por usuário e o salvamento usa a sessão autenticada.

## Instalação e validação

Não há nova migração SQL nem credencial adicional. O `supabase/schema.sql` existente, com `learner_backups` e `save_learner_backup`, precisa já ter sido aplicado. O novo arquivo `progress-sync.mjs` é incluído por `npm run build`.

`node tests/progress-sync.test.mjs` cobre consulta inicial, conta nova, troca de conta, alterações locais/remotas, offline, recarga, edição em andamento, cópia inválida, interrupção de sessão, falhas de armazenamento, concorrência e mudanças durante solicitações.

`node tests/browser/progress-sync.cjs` executa os cenários de Chromium neste ambiente, que já possui Playwright e Chromium instalados. Em outra máquina, ajuste os caminhos no início do roteiro.

Também foi exercitado no Chromium com duas contas e dois contextos independentes, usando respostas simuladas do Supabase: carregar perfil/XP, salvar estudo, receber atualização ao voltar à aba, preservar trabalho offline após recarga, detectar conflito, escolher a cópia online e impedir envio dos estudos da conta anterior para uma conta nova.

Esses testes não representam acesso ou validação do projeto Supabase real. A mudança só estará disponível no site publicado após deploy do código correspondente.
