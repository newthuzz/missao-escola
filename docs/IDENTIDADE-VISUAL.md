# Identidade visual — Missão Escola

- Tema claro padrão para novas visitas: branco, superfícies neutras levemente esverdeadas e verde principal `#197548`. Texto principal `#193b2c` e auxiliar `#526b5d`.
- Tema escuro: mantém o azul-marinho anterior `#101b30` e os painéis `#223650`, usando verde `#72d7ad` nos destaques e ações. A escolha de tema salva pelo usuário é preservada.
- Marca: fonte **Anton**, selecionada pela semelhança com a referência fornecida (letras fortes, altas e condensadas). Não há identificação garantida da fonte original a partir de uma imagem. O nome aparece como “Missão Escola” na navegação e no rodapé. A fonte do corpo e os tamanhos de 16/14 px foram preservados.
- A fonte é servida localmente em WOFF; o TTF original e a licença SIL Open Font License estão em `assets/fonts/`. Fonte oficial: https://github.com/google/fonts/tree/main/ofl/anton.

## Mascote

A ilustração foi adaptada a partir do esboço enviado: lâmpada sorridente, capelo e tablet. Capelo/tablet verdes, corpo claro e detalhes dourados preservam o conceito de uma ideia que se acende. O contorno azul-marinho funciona nos dois temas.

Aplicações: convite de boas-vindas/personalização, apresentação do perfil, diagnóstico e pistas de estudo. O mascote não substitui o avatar do aluno, não cobre exercícios e não interfere nas áreas de clique. Nessas aplicações, acompanha texto equivalente e é decorativo para leitores de tela.

O original gerado fica em `assets/mascot/mascot.png`. O site usa `mascot.webp`, convertido sem perda: a comparação pixel a pixel teve diferença zero. O build publica apenas WOFF, licença e WebP, deixando PNG e TTF de edição fora de `dist/assets/`. A transparência foi preservada. O WebP tem aproximadamente 528 KB e a fonte WOFF 78 KB; o recurso de imagem é reutilizado pelo cache entre as aplicações.

## Implementação e validação

`brand.css` aplica a identidade sem alterar o banco de questões, XP ou dados de conta. `brand.js` adiciona o mascote às regiões de boas-vindas e orientação, inclusive quando o conteúdo é redesenhado. `npm run build` inclui os novos estilos, script e assets.

Foram verificadas as telas de jornada, aprendizagem, perfil, rotina e conta em 1440, 390 e 320 px, nos dois temas: 30 combinações sem transbordamento horizontal e sem erros JavaScript capturados. O teste confirmou a fonte carregada do próprio site, os botões verdes e a preservação do azul do tema escuro. A suíte existente também passou.

Essa verificação não constitui auditoria completa de acessibilidade ou teste em aparelhos físicos. Os estilos novos respeitam foco, zoom, preferência por movimento reduzido e o papel decorativo do mascote.

As alterações foram preparadas localmente. A publicação no Cloudflare deve ser feita quando autorizada.
