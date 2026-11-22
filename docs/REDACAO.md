# Redação

A área fica em **Estudo → Redação** e usa o ano escolar informado no estudo ou no perfil. A partir do 7º ano, o aluno pode iniciar o treino e sortear um tema adequado ao seu ano, entre todas as dificuldades ou no nível escolhido. O sorteio prioriza temas ainda não vistos. Cada ano tem atividades de escrita inicial, prática guiada e pelo menos uma adaptação de material público com link no enunciado. No Ensino Médio, também entram no sorteio 12 temas oficiais do Enem, de 2015 a 2026, com acesso aos textos motivadores do Inep.

A correção explica o que funcionou, aponta erros ou oportunidades de melhoria e sugere ações específicas. Os trechos citados são conferidos no texto enviado e aparecem com o número do parágrafo. As sugestões podem incluir uma reescrita curta. As observações sobre elementos ausentes ficam indicadas para o texto inteiro.

Nas propostas dissertativo-argumentativas, o corretor usa as cinco competências da [Cartilha de Redação do Enem 2026](https://www.gov.br/inep/pt-br/centrais-de-conteudo/acervo-linha-editorial/publicacoes-institucionais/avaliacoes-e-exames-da-educacao-basica/a-redacao-do-enem-2026-cartilha-do-a-participante). Cada competência recebe uma estimativa em intervalos de 40 pontos, até 200. O servidor soma as cinco notas e aplica o limite definido pelo Inep em caso de abordagem parcial do tema. A estimativa considera o texto digitado e o enunciado. Cartas, resenhas e os demais gêneros recebem feedback formativo adequado à tarefa e ao ano escolar.

Os rascunhos ficam no navegador, separados por tema e conta, e mantêm a proposta original quando o aluno muda de ano. O texto é enviado ao provedor de IA apenas ao solicitar a correção. A função verifica a sessão no Supabase Auth e reserva uma chamada no mesmo orçamento do Tutor. A tabela de uso registra a conta e o horário da chamada sem guardar o texto da redação. A correção fica na tela durante a revisão.

## Publicação

1. Aplique a migração `reserve_essay_review` depois de configurar o SQL do Tutor. A operação fica disponível apenas ao papel de serviço.
2. Execute `npm run build` e publique `supabase/functions/essay-review/index.ts` como a função `essay-review`. O código é gerado a partir de `server/essay-edge.mjs` e verifica o token do usuário com o Auth. A configuração de JWT legado segue a usada no Tutor.
3. A função usa os mesmos secrets do Tutor para ativação, provedor, modelo e origens permitidas. Publique a build do site com o novo acesso de Redação.

A verificação local usa `npm run test:tutor` e `node tests/browser/essay.cjs`. Os testes controlam as respostas da IA e do login. Um teste com uma conta autenticada na versão publicada é necessário para confirmar a resposta do provedor configurado.
