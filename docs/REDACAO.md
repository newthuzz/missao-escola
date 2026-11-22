# Redação

A área fica em **Estudo → Redação**. As propostas autorais cobrem escrita inicial e prática guiada. Os temas oficiais do Enem de 2022 a 2025 têm links para o Inep, onde estão as propostas e os textos motivadores. A correção produz comentários para treino por competência e uma prioridade de revisão.

Os rascunhos ficam no navegador, separados por tema e conta. O texto é enviado ao provedor de IA apenas ao solicitar a correção. A função verifica a sessão no Supabase Auth e reserva uma chamada no mesmo orçamento do Tutor. A tabela de uso registra a conta e o horário da chamada sem guardar o texto da redação. A correção fica na tela durante a revisão.

## Publicação

1. Aplique a migração `reserve_essay_review` depois de configurar o SQL do Tutor. A operação fica disponível apenas ao papel de serviço.
2. Execute `npm run build` e publique `supabase/functions/essay-review/index.ts` como a função `essay-review`. O código é gerado a partir de `server/essay-edge.mjs` e verifica o token do usuário com o Auth. A configuração de JWT legado segue a usada no Tutor.
3. A função usa os mesmos secrets do Tutor para ativação, provedor, modelo e origens permitidas. Publique a build do site com o novo acesso de Redação.

A verificação local usa `npm run test:tutor` e `node tests/browser/essay.cjs`. Os testes controlam as respostas da IA e do login. Um teste com uma conta autenticada na versão publicada é necessário para confirmar a resposta do provedor configurado.
