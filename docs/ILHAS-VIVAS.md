# Ilhas vivas

Ambientação adicional dos seis cenários vetoriais existentes. As ilhas representam etapas de XP compartilhadas por todas as matérias; nenhuma foi associada a uma disciplina nova. O terreno, a trilha, os sete marcos, os nomes, o mascote e a progressão foram preservados.

## Análise de cada cenário

| Ilha e intenção educativa existente | Ambiente e elementos preservados | Paleta original do cenário | Ambientação adicionada e espaço usado |
| --- | --- | --- | --- |
| Ilha da Aurora — dar o primeiro passo | Jardim, arco florido, árvores, lago e cascata | Verde `#74d699` / `#32a884`, amarelo e flores rosas | Uma borboleta no jardim inferior direito, brisa em uma árvore e ondulação do lago, afastados da trilha |
| Bosque Celeste — cultivar a curiosidade | Árvore central, copas, flores, lago e cascata | Verde `#3abf91` / `#147e74`, luz `#ffe583` | Um pássaro acima das copas, um vaga-lume na borda inferior e brisa em até duas árvores |
| Vale dos Cristais — descobrir novas ideias | Geodo central, pequenos cristais e lago turquesa | Violeta `#ae83e7` / `#6b64bb`, turquesa | Um peixe pequeno dentro do lago existente e brilho em até dois cristais |
| Arquipélago Lunar — explorar ideias | Crateras, antena e estação com painel | Azul `#8aafdb` / `#5e78b2`, luz dourada | Um drone próximo à estação e luz lenta na antena; sem animais ou nova vegetação |
| Picos do Saber — avançar aos poucos | Cumes nevados, rochas e vegetação decorativa já existente | Azul acinzentado `#a1cdd0` / `#588da3`, neve clara | Uma ave junto aos cumes e névoa discreta na borda inferior |
| Observatório Estelar — ampliar horizontes | Observatório, planeta com anel e cristais cósmicos | Violeta `#9c8ce1` / `#6151ac`, dourado | Um satélite acima do observatório, luz na construção e brilho suave nas estrelas existentes |

As nuvens existentes ganham deslocamento lento nos ambientes apropriados, exceto no lunar. Os dois pássaros genéricos antes repetidos em todos os cenários foram substituídos pela ambientação de cada ilha. Nenhuma silhueta de ilha foi redesenhada.

## Movimento e interação

- `world-island` agrupa terreno, vegetação, construções, cascata, viajante e marcos clicáveis. A flutuação inteira usa um único `transform` CSS.
- Ciclos de 6 a 8,15 segundos e amplitude de 4 a 5,2 unidades do SVG, proporcionais à escala do desenho; no modo compacto, 3,2. As seis ilhas têm durações e fases diferentes, derivadas do índice da ilha e não sorteadas a cada renderização.
- Nuvens, sombra e halo permanecem no fundo, separados da ilha, criando profundidade. O aviso de bloqueio fica fixo e legível fora do grupo flutuante.
- Novos animais e objetos usam grupos próprios, com deslocamentos locais curtos. As decorações não recebem cliques, foco ou anúncio por leitor de tela.
- Os controles, nomes, trilha e lógica educacional continuam os mesmos. Não há áudio.

## Acessibilidade e desempenho

O mapa não apresenta controle manual de animações. A antiga preferência local `missao-escola-island-motion` é ignorada, evitando que uma pausa antiga mantenha o mapa parado após a remoção do botão. Nenhum dado educacional é alterado.

`prefers-reduced-motion: reduce` desativa todas as animações do mapa automaticamente. Mudanças dessa preferência durante o uso também são respeitadas. Não se força o usuário a reativar movimentos.

Um `IntersectionObserver` suspende o mapa fora da área visível ou ao sair da jornada. `visibilitychange` e os eventos de restauração suspendem e retomam a animação conforme a visibilidade da aba. Em navegadores sem `IntersectionObserver`, uma observação da classe da página garante ao menos a suspensão ao navegar para outra seção.

Telas de até 760 px, indicação de até quatro processadores lógicos, memória informada de até 4 GB ou economia de dados ativam o modo compacto: mantém a ilha e um elemento característico, ocultando os efeitos secundários. São sinais conservadores, não uma medição da capacidade real do aparelho.

A implementação acrescenta aproximadamente 14 KB de JS e CSS sem compressão, sem bibliotecas, imagens extras, partículas ou ciclo de animação em JavaScript. Há no máximo dois animais por ilha no modo completo e um no compacto. Todos os novos efeitos usam `transform` e/ou `opacity`; o efeito anterior de traços da cascata foi substituído por variação de luminosidade.

Durante a investigação, a animação anterior do viajante, baseada na propriedade individual `translate`, provocava recálculos internos de SVG a cada quadro no Chromium. Ela foi substituída por `transform`, mantendo um movimento suave do mesmo viajante. Na amostra posterior de dois segundos com CPU limitada a 4×, o mapa ativo registrou zero recálculos de layout e aproximadamente 10,4 ms de trabalho na thread principal; na comparação anterior com o mapa pausado, aproximadamente 1,3 ms. Isso não inclui todo o custo de composição gráfica nem constitui uma medição de bateria.

## Validação

Executar após `npm run build`:

```sh
node tests/browser/island-life.cjs
```

O teste utiliza o Chromium e o Playwright disponíveis neste ambiente. Compara a versão construída com o HTML do commit `c725abc` anterior à ambientação. Verifica nos seis cenários:

- Mesmos nomes, caminhos do terreno e da trilha, quantidade de objetos, posições e identificações dos marcos e estado educacional.
- Flutuação compartilhada, fases diferentes, ciclos entre 5 e 9 segundos, até dois animais e quantidade limitada de animações.
- Deslocamento real idêntico do terreno, objetos, viajante e ponto clicável usando suas matrizes na tela.
- Clique por coordenadas durante o movimento e ativação dos marcos por Enter e Espaço.
- Ausência do controle manual, preferência de pausa antiga ignorada após recarregar, suspensão ao navegar ou sair da tela e retomada ao retornar.
- Mudança de movimento reduzido durante o uso e ausência de qualquer animação no mapa nessa configuração.
- Layout de 390 × 844 sem rolagem horizontal, temas claro e escuro e simplificação automática.
- Indicação de CPU limitada, armazenamento bloqueado e navegação sem `IntersectionObserver`.

O teste também registra amostras de dois segundos com CPU do Chromium limitada a 4×, comparando mapa ativo e movimento reduzido. Exige zero recálculos de layout durante a amostra ativa e salva métricas em `/tmp/missao-islands/performance.json`. As capturas dos cenários ficam na mesma pasta. Essa medição é uma comparação controlada no navegador; não representa um teste em celular básico físico nem uma garantia de taxa de quadros em todos os aparelhos.

Além disso, `npm test` valida a API, banco social, estudo adaptativo, Worker e sincronização de progresso. Não foram usados dados de contas reais. Opera GX nativo, Firefox, Safari e dispositivos físicos não foram executados neste ambiente.
