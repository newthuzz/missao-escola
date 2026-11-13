# Minha conta e ligas

As ligas semanais ficam em **Ranks e conquistas → Ligas semanais**. A segunda aba mantém os ranks pessoais, as conquistas e as atividades existentes. Os pontos competitivos continuam separados do XP de estudo.

**Minha conta** aparece em destaque como primeiro item da seção **Seu espaço** no menu lateral. No celular, o botão inferior mostra “Minha conta” e o atalho superior mostra “Ranks e ligas”. Perfil, amigos e sincronização permanecem em Minha conta, com um atalho para as ligas.

`community-navigation.js` coordena os destinos e mantém uma única instância social por conta. A instância é transferida entre os painéis para preservar sessões e respostas pendentes. Sair ou trocar de conta descarta a instância anterior; respostas atrasadas não voltam a exibir seus dados. A navegação institucional mantém as permissões existentes.

Não há migração de banco nem mudança nas regras de pontuação. O build deve incluir `community-navigation.js`.

## Validação

- `npm test` e `npm run build`.
- `node tests/browser/social.cjs`: duas contas com SQL local, personalização, convites, bloqueios, ligas, retomada de desafio, navegação por teclado, logout com resposta atrasada e três larguras nos dois temas.
- `node tests/browser/progress-sync.cjs`: sincronização, conflitos e isolamento entre contas.
- `node tests/browser/mobile-spaces.cjs`: acesso por toque e teclado, alvos de toque e texto ampliado.
- `node tests/browser/owner-workspaces.cjs`: alternância de painéis e permissões institucionais.
- `node tests/browser/beta.cjs`: estudo, rotina e regressão visual responsiva.
- Build portátil e `tests/browser/portable-html.cjs`: navegação offline, progresso, assets incorporados e ausência de chamadas online no modo arquivo.

As verificações de conta usam fixtures locais identificadas nos testes. Capturas locais da interface real desconectada, sem dados fictícios, foram geradas em `work/navigation-captures/` nos tamanhos 360, 768 e 1440 px e nos dois temas.
