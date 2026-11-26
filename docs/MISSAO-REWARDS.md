# Missão Rewards

A carteira de Mission Points usa a conta existente do Supabase. O XP continua medindo a evolução na jornada. As estrelas históricas e os itens já adquiridos podem ser usados no **Ateliê de itens digitais**, disponível na página de recompensas. O Ateliê e os backups do navegador não alimentam o saldo de MP.

## Como os pontos são registrados

| Atividade | Valor inicial | Evidência |
| --- | --- | --- |
| Atividade educacional | 20 MP | Atividade corrigida no servidor ou prática das ligas concluída e gravada no servidor |
| Recuperação | 40 MP | Atividade de revisão corrigida no servidor, com novas tentativas |
| Meta personalizada | 50 MP | Atividades verificadas e concluídas após a escolha da meta |
| Projeto escolar | 30 MP | Vínculo escolar ativo e participação registrada pela administração |
| Missão especial | 50 MP | Atividade de campanha validada no servidor |

Uma atividade verificada rende crédito uma vez por conta, por ambiente. Uma prática das ligas pode ser registrada por dia de conclusão nos últimos sete dias, independentemente do placar. A meta é semanal, mede atividades concluídas após sua definição e tem crédito único. A administração pode publicar novas atividades elegíveis por campanha, ajustar valores, definir o mínimo da meta e configurar limites diários.

## Benefícios e operação

- **Programa** usa os registros operacionais. A migração inicial instala atividades, mas começa com um catálogo operacional vazio.
- **Demonstração** usa saldo, regras, campanhas, estoque, pedidos e auditoria separados. Os exemplos simulam o fluxo e não correspondem a ofertas ou parcerias reais.

O painel fica em **Administração institucional → Missão Rewards → Administrar programa** e usa a permissão da conta proprietária já cadastrada. Para disponibilizar um benefício real, cadastre e confirme a instituição, documente a disponibilidade, informe estoque e condições de entrega e publique o item. O programa admite apenas incentivos complementares. O acesso à assistência escolar essencial independe de MP.

A escola pode vincular a elegibilidade a uma turma ativa da instituição escolhida. Cada item admite uma entrega por conta. Organize aprovação, entrega e eventuais cancelamentos com a instituição parceira. A carteira utiliza o identificador da conta. Endereços, documentos e dados de pagamento ficam fora do fluxo do aplicativo.

## Dados e verificação

A migração adiciona o esquema privado `mission_rewards` e o RPC autenticado `public.mission_rewards_action`. O papel do navegador não escreve nas tabelas. O RPC verifica a sessão, utiliza os vínculos institucionais existentes e limita operações administrativas à conta proprietária. Saldo, estoque e movimentação de resgate são gravados na mesma transação. O painel compara saldos e estoque com os registros de movimentação.

```sh
npm run build
npm test
bash tests/mission-rewards-concurrency.sh
node tests/browser/mission-rewards.cjs
node tests/browser/rewards.cjs
```

O teste de concorrência inicia um PostgreSQL isolado no Docker. Os testes de navegador usam contas fictícias e não fazem resgates no banco de produção.
