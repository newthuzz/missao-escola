# Metas para o beta — Missão Escola

Atualizado em 10/11/2026. Objetivo: liberar um beta fechado em que estudantes consigam estudar, recuperar seu progresso, usar o tutor e participar da comunidade com segurança e clareza.

Revisão baseada no checkout `6957169` e nas últimas decisões sobre a área social. Status usados: **implementado no código**, **pendente de implementação** e **pendente de validação em produção**. Nenhum desses status deve ser substituído por uma porcentagem de conclusão sem evidência.

## Estado de referência

- O repositório contém central de estudos, rotina, jornada por ilhas, estudo personalizado, conta e sincronização, tutor e backend de amigos e ligas.
- A documentação registra verificações locais anteriores; elas não comprovam o estado atual da produção. Nenhum teste foi reexecutado nesta atualização de metas.
- O tutor tem configuração documentada para Groq ou OpenAI via Supabase. É necessário confirmar o provedor e modelo efetivamente publicados, sem presumir disponibilidade ou gratuidade ilimitada.
- O último erro social apresentado foi ausência de configuração do backend no Cloudflare. A correção do secret e a execução do SQL ainda precisam ser confirmadas.
- O novo design social está implementado localmente, com avatares ilustrados, capas, molduras e títulos persistentes. Migração e validação em produção permanecem pendentes; veja SOCIAL-EXPLORADORES.md.

## Últimas alterações incorporadas às metas

| Alteração | Estado observado | Meta atualizada para o beta |
| --- | --- | --- |
| Estudo guiado com início e retomada diretos (`c88ea9e`) | Implementado no código; há teste de navegador | Validar começar, continuar e concluir estudo, preservando atividades e sem duplicar XP ao retomar |
| Tutor ajustado ao teclado móvel e prevenção de zoom no foco (`87ec47`) | Implementado no código; há teste de navegador | Conferir em aparelho real que teclado não cobre o campo, o envio ou a resposta e que o foco não causa zoom indesejado |
| Tutor prioriza mensagens, com compositor compacto e controles opcionais (`f92f839`) | Implementado no código; há teste de navegador | Garantir leitura, envio, histórico e acesso aos controles em telas pequenas e com teclado aberto |
| Abertura com animação independente de resets de CSS, tolerância a fontes lentas e movimento reduzido (`e6ff7b6`, `6957169`) | Implementado no código; há cenários de teste | Garantir que a abertura termine e libere o app mesmo com recursos lentos, sessão expirada, rede indisponível ou preferência por movimento reduzido |
| Social como base de exploradores, com perfil visual e personalização na conta | Implementado e validado localmente; produção pendente | Entregar editor, navegação, amigos, emblemas e liga com dados reais e compatibilidade com perfis antigos |

Essas melhorias de estudo, tutor e abertura passam a exigir verificação de regressão; não precisam ser reconstruídas para o beta. A configuração social em produção continua sem confirmação nesta conversa.

## P0 — Condições para abrir o beta fechado

| Meta | Trabalho necessário | Critério de conclusão |
| --- | --- | --- |
| Publicação reproduzível | Confirmar Worker, versão publicada, build, secrets de execução e migrações Supabase; registrar procedimento de retorno à versão anterior | Domínio publicado executa site e API; versão e migrações são identificáveis; procedimento de recuperação documentado |
| Conta e progresso confiáveis | Validar cadastro, confirmação de e-mail, login, saída, recuperação de senha e sincronização em dois aparelhos; tratar conflitos e falhas | Progresso persiste após recarregar e entrar em outro aparelho; conflito não sobrescreve silenciosamente uma cópia; restauração e recuperação funcionam |
| Jornada de estudo completa | Revisar central, rotina, exercícios, correção, recomendações e progressão pelas ilhas | Um novo estudante consegue iniciar, concluir e retomar estudos sem intervenção; resultados e recomendações refletem os dados reais |
| Retomada sem recompensas duplicadas | Validar o novo início direto, persistência das atividades e conclusão do plano após sair ou recarregar | Continuar mantém as questões e respostas corretas do plano; retomar ou concluir novamente não concede XP duplicado |
| Abertura resiliente | Verificar animação, liberação do app, fontes lentas, autenticação expirada e movimento reduzido | A tela de abertura não prende a navegação; falhas permitem acesso ao estado apropriado do app, com indicação útil quando necessária |
| Backend social ativo | Confirmar secret de execução no Cloudflare, migração social e autenticação da API | Duas contas reais de teste criam perfis, trocam e aceitam convite, entram na liga e concluem uma sessão sem erro de configuração |
| Social com identidade | Implementar visão geral, Amigos e Minha liga; carregamento automático; editor com pelo menos oito avatares ilustrados, quatro capas, quatro molduras e títulos | Personalização salva na conta, sobrevive ao recarregamento e aparece para amigos e no ranking; perfis antigos continuam válidos |
| Fluxos sociais completos | Preservar convites, remoção, bloqueio e desbloqueio; melhorar ranking e sessões; incluir estados vazios, carregamento e erros | Ações funcionam com duas contas; bloqueios são respeitados; sessão pode ser retomada; pontos vêm do servidor e permanecem separados de XP e estrelas |
| Tutor validado | Confirmar Edge Function, provedor, modelo, histórico, limites e erros; avaliar uma amostra de perguntas representativas das matérias disponíveis | Usuário autenticado recebe explicações em português com contexto; falhas e limites têm mensagens úteis; resposta interrompida não é tratada como concluída |
| Tutor confortável no celular | Validar compositor compacto, controles opcionais, rolagem e ajuste ao teclado virtual | Campo, botão de enviar e mensagens continuam acessíveis com teclado aberto; não há zoom indesejado no foco nem perda de acesso aos controles |
| Privacidade e acesso | Verificar isolamento entre contas, permissões do banco, validação de personalização e proteção de segredos; definir rate limiting da API | Uma conta não acessa backup ou histórico privado de outra; frontend não contém segredos; API rejeita identidade e pontos forjados e possui proteção de volume configurada |
| Acessibilidade e uso móvel | Conferir temas claro/escuro, teclado, foco, modais, contraste, toque e movimento reduzido em 360, 768 e 1440 px | Fluxos principais são utilizáveis sem mouse; ausência de rolagem horizontal; identidade, ranking e ações permanecem legíveis |
| Operação do beta | Definir canal de feedback, grupo inicial de convidados, triagem de problemas e acompanhamento de erros sem conteúdo privado | Testadores sabem reportar falhas; há responsável pela triagem, lista de problemas conhecidos e procedimento para suspender um recurso com falha |

## P1 — Melhorias durante o beta

- Ajustar a primeira experiência a partir das dificuldades observadas: cadastro, primeiro estudo, perfil e entrada na liga.
- Refinar ilustrações, emblemas Aurora/Celeste/Cristal/Estelar e microinterações após verificar desempenho em celular real.
- Avaliar Firefox, Safari e aparelhos físicos; corrigir incompatibilidades com impacto nos participantes.
- Revisar qualidade dos exercícios, recomendações e explicações do tutor com feedback de estudantes.
- Medir, de forma proporcional e com coleta mínima, conclusão do primeiro estudo, retorno, falhas de sincronização, sucesso do tutor e conclusão de sessões sociais. Definir linha de base antes de prometer metas numéricas.
- Priorizar estabilidade e clareza a partir dos relatos antes de aumentar o grupo de participantes.

## P2 — Fora do primeiro beta

- Chat, feed público, presença online e notificações externas.
- Upload de fotos, loja, moedas e desbloqueios cosméticos.
- Equipes, novas economias competitivas ou integração automática de XP com pontos sociais.
- Expansão das sessões competitivas para outras matérias sem desenho pedagógico e validação no servidor.
- Novos efeitos ou funcionalidades que atrasem a validação do ciclo principal de estudo.

## Ordem de execução

1. Confirmar a configuração de produção e resolver o bloqueio do backend social.
2. Implementar o novo social com migração incremental compatível, sem alterar regras competitivas.
3. Validar estudo, conta, sincronização, tutor e comunidade de ponta a ponta.
4. Corrigir bloqueios de acesso, perda de dados, privacidade e uso móvel; concluir a verificação de acessibilidade.
5. Preparar suporte e acompanhamento; revisar os critérios de entrada e autorizar a abertura do beta fechado.

## Checklist da versão candidata

- [ ] Registrar commit, endereço publicado e migrações aplicadas.
- [ ] Executar `npm test` e `npm run build` com sucesso na versão candidata.
- [ ] Executar os testes de navegador de estudo guiado (`tests/browser/study-focus.cjs`), abertura (`tests/browser/splash.cjs`) e tutor (`tests/browser/tutor.cjs`), após preparar seus requisitos de execução.
- [ ] Conferir manualmente a abertura e o tutor em celular físico com teclado virtual, incluindo movimento reduzido.
- [ ] Validar conta e sincronização em dois aparelhos, sem perda de progresso.
- [ ] Validar personalização, convites, bloqueios, liga e sessão com duas contas de teste, sem dados fictícios em produção.
- [ ] Validar o provedor real do tutor, histórico e mensagens de falha ou limite.
- [ ] Conferir temas, teclado, privacidade e proteções da API.
- [ ] Registrar problemas conhecidos, canal de feedback e decisão de abertura do beta fechado.

Os itens continuam desmarcados até haver evidência na versão candidata. A existência de um teste no repositório não comprova sua execução atual.

## Regra de liberação

O beta fechado estará pronto quando todos os critérios P0 tiverem evidência de validação na versão candidata, sem falhas conhecidas de perda de progresso, acesso indevido ou bloqueio do ciclo principal. Funcionalidades apenas especificadas, testes com serviços simulados e deploys sem confirmação não contam como validação de produção.

Executar os testes automatizados pertinentes e o build na versão candidata, além dos testes manuais com duas contas e dois aparelhos. Registrar versão, data, ambiente, resultado e limitações. Não é necessário criar testes para a documentação de metas.

Publicação e migrações em produção dependem de autorização. Esta atualização apenas organiza o trabalho; não altera o app, o banco ou o deploy.
