# Estudo com escolhas visíveis

Atualização de 11/11/2026. A entrada da área de estudo apresenta matérias, recomendação e tempo de forma direta, sem abrir painéis para descobrir as ações principais.

## Organização

1. Matérias disponíveis para o ano escolhido em botões com indicação da seleção atual.
2. Estudo recomendado com assunto real, objetivo, estimativa de duração e ação Começar/Continuar.
3. Tempo de 5, 10 ou 15 minutos, respeitando as opções já suportadas pelo motor. Salva automaticamente; não reinicia uma sequência em andamento.
4. Até três assuntos reais da matéria, com estudar e ver explicação. Quando só há um assunto adequado ao ano, a tela diz Conhecer este assunto e não inventa alternativas. O acervo completo e a busca continuam em Ver todos os assuntos.
5. Praticar questões, Ver exemplos e Revisar o que aprendi como ações visíveis. Revisão fica disponível quando existe um plano. Prática livre permanece separada da sequência dirigida.
6. Prova/tema e explicação sobre as sugestões ficam em acessos secundários. Dados do ano, histórico e salvamento continuam nos componentes existentes.

Ao entrar em uma atividade, o app concentra a tela nela e oferece Escolher outro estudo. O caminho de exemplo, questões e resultado usa as ações e recompensas existentes. Escolher um assunto inicia seu exemplo diretamente. Voltar às escolhas não apaga o plano. Trocar de matéria com sequência em andamento pede confirmação e arquiva o histórico antes de preparar outra.

## Verificação

- `npm test` e `npm run build`.
- `node tests/browser/study-visible.cjs`: seleção de matéria, persistência de tempo, preservação de IDs em plano iniciado, cancelamento de troca, preferências opcionais, busca, início direto por assunto, prática livre, exemplo, revisão, conclusão, teclado, texto ampliado e layouts em 360/768/1440 px nos dois temas.
- `BETA_EVIDENCE_DIR=work/study-beta-final node tests/browser/beta.cjs`: início/retomada, recompensas sem duplicação, conclusão, rotina, navegação, conta e tutor com respostas controladas, 320/360/390/768/1366 px e texto a 200%.
- Capturas locais em `work/study-visible/` e `work/study-beta-final/`.

Não há migração SQL, nova biblioteca ou mudança das regras de XP. A alteração da biblioteca de conteúdos em `index.html` mantém a criação e o arquivamento do plano e encaminha ao fluxo guiado existente. Os testes de navegador usam dados locais e serviços controlados; não representam teste em aparelho físico.
