# Ateliê de descobertas

Atualização de 11/11/2026. A área de recompensas passa a apresentar 18 itens ilustrados: nove personagens de jornada, cinco acessórios, três efeitos e o escudo de sequência. Mantém os quatro IDs anteriores e seus preços: freeze (80), cometa (100), astronauta (180) e violeta (120). Compras e saldo anteriores continuam válidos.

## Experiência

- Prévia grande de cada item antes do resgate, com custo e saldo explícitos. A prévia não gasta estrelas.
- Personagens especiais: Raposa da primeira luz, Guardião das raízes, Dragão do eclipse, Robô dos anéis, Capitão das neves, Fênix do amanhecer, Baleia das constelações, Cometa e Explorador lunar. Recebem detalhes próprios de traje, armadura, galhos, órbitas ou constelações; os 24 avatares do perfil social continuam livres.
- Acessórios: lanterna, mochila, luneta, livro e asas. Efeitos: nebulosa, folhas e halo solar. Todos podem ser visualizados e combinados com o personagem da jornada.
- Próxima conquista escolhida pelo aluno, mostrando o saldo atual em relação ao preço. Escolher uma meta não debita estrelas.
- Presente diário determinístico de 10 estrelas e 5 XP, uma vez ao dia, preservando a regra existente.
- Marcos visuais derivados do histórico real: primeiro estudo concluído, três estudos e segunda ilha. Não cobram nem concedem estrelas adicionais.
- Coleção permanente sem perda por pausas, sem dinheiro real, compra aleatória, prazo artificial ou vantagem nas ligas.

Os itens de jornada não substituem o avatar social salvo no Supabase. É possível voltar ao avatar do perfil, retirar acessórios e efeitos e equipar novamente itens já conquistados, sem nova cobrança. O viajante inicial continua disponível sem login.

## Persistência e compatibilidade

O motor Journey permanece responsável pelo saldo e pelas compras. Itens permanentes só podem ser comprados uma vez; acessórios e efeitos exigem posse. Escudos mantêm o limite de dois. Resgatar não gera XP. Ganhos dos estudos e pontos competitivos não foram alterados.

O snapshot de progresso versão 3 recebe `rewardLook` (origem, acessório e efeito) e `rewardGoal`. O carregador valida esses valores contra a coleção e ignora equipamentos não possuídos. Os dados seguem os fluxos existentes de salvamento local, cópia e sincronização da conta. Não há migração SQL, novo segredo ou serviço externo. Como o saldo já é local nesta arquitetura, essa coleção não é uma economia de competição validada no servidor.

`reward-look.js` compartilha a arte entre loja, prévias e mini viajante. `rewards-ui.js` preserva o botão e a ação original do presente diário. A versão portátil incorpora o módulo e seus recursos.

## Verificações

- `npm test`: inclui `tests/rewards.test.mjs` para catálogo, saldo, duplicação, escudos, presente diário, compatibilidade, round-trip e equipamento sem posse.
- `npm run build`.
- `node tests/browser/rewards.cjs`: prévia sem débito, resgates, meta persistente, recarga, composição na ilha, filtros, escudos, presente único, foco do modal, teclado, texto a 200%, 360/768/1440 px nos dois temas. Usa dados locais de teste.
- `node tests/browser/social.cjs`: regressão de perfil, mini viajante, amizades, bloqueios, ligas e sessões com banco local.
- `node tests/browser/progress-sync.cjs`: inclui restauração de lanterna equipada e meta de personagem em uma cópia da conta, além dos fluxos de sincronização existentes.
- `node scripts/build-portable-html.mjs work/rewards-portable.html` e `PORTABLE_HTML=work/rewards-portable.html node tests/browser/portable-html.cjs`.
- Capturas de teste em `work/rewards-captures/`.

Os testes não usam dados reais de alunos nem executam transações em produção. Dispositivos físicos não foram utilizados nesta validação.
