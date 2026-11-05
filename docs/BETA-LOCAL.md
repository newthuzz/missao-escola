# Preparação beta — versão local

## Diagnóstico anterior às alterações

- Arquitetura: HTML/CSS/JavaScript sem framework; catálogo e motores Journey/Routine no index.html; Adaptive e componentes progressivos em scripts separados. KaTeX carrega sob demanda; esbuild gera o bundle da Edge Function; PGlite valida SQL localmente.
- Navegação: seções `.page`, estado `state`, hash e `navigate`; os componentes study-ui/study-focus estendem as funções de renderização. Início usa recomendações enquanto Estudo inicia com matéria fixa. A retomada termina em uma segunda visão geral. Planos são limitados ao dia atual.
- Persistência: localStorage separado para Journey, Adaptive e Routine; backups autenticados sincronizam os três domínios com revisão otimista e cópia de segurança. Conflitos já são detectados, sem merge silencioso. Commit já salva o learner após registrar acertos; a lacuna encontrada está na falta de persistência das tentativas e pistas da questão ainda pendente.
- Ano: `profile.grade || 7` em Adaptive e UI. Exige perfil completo para informar o ano; não há seleção leve para visitantes.
- XP: cálculo central em Journey, eventos idempotentes por atividade/dia. Abrir a sequência concede XP de início e missão antes da prática. Modais e toast interrompem/cobrem conteúdo.
- Questões: títulos e metadados antecedem o enunciado; confiança vem antes das alternativas. Conclusão depende de outro botão depois da última questão.
- Autenticação: Supabase Auth com chave pública; renovação da sessão, verificação de usuário, sincronização por RPC e RLS existentes. Campo do Tutor permanece visível sem login e quando não disponível. Falta retorno ao contexto de estudo depois de autenticar.
- Backend: Worker com assets estáticos e rota `/api/social`, Pages Functions equivalentes; Tutor em Supabase Edge Function quick-endpoint. Segredos permanecem no servidor. Migrações e testes de autorização já existem. Não há backend de apoio; o formulário apenas simula um pedido.
- Rotina: motor local real com disponibilidade, compromissos, conflitos, prévia e confirmação; formulário longo deve ser reorganizado, preservando validações e edição.
- Mobile: correção compacta aplicada só a Início/Estudo; demais abas ainda disputam espaço com contadores. Manter fontes de controles com pelo menos 16px e zoom do usuário.

## Ordem de execução

1. Estado do ano, migração e continuidade; manter sincronização com revisão.
2. Questões, avanço e conclusão; persistir tentativas e pistas.
3. XP sem recompensa de abertura; Tutor e apoio transparente.
4. Cabeçalho, acessibilidade e rotina em três passos com motor atual.
5. Build, testes de regras/API/SQL, navegação no browser, evidências e pacote local.

## Limites da validação externa

Nenhuma alteração de configuração, migração em produção ou publicação está autorizada nesta entrega. Testes locais de API/SQL verificam regras com fixtures, sem declarar integrações de produção funcionando. Teste real de login/Tutor/Groq e amigos/ligas depende de conexão, conta de teste e secrets já configurados nos serviços. Servir os arquivos estáticos não executa o Worker social; a versão local deve informar esse limite.

## Preferência atual do usuário — rotina

A interface anterior da rotina foi restaurada, com configurações completas e calendário na mesma tela, conforme solicitado após os testes. A proposta inicial de três passos foi retirada. Veja ROTINA-RESTAURADA.md.
