# Ateliê de avatares — 11/11/2026

A coleção social passa a ter 24 personagens vetoriais originais, quatro por ilha. Os oito identificadores anteriores continuam válidos e recebem desenhos mais detalhados. A coleção amplia silhuetas, expressões, trajes, acessórios, reflexos e detalhes ligados aos cenários; os modelos novos incluem capivara, espírito da semente, cogumelo, dragão, axolote, geodo, água-viva, visitante de Saturno, gato lunar, pinguim, raposa das neves, iaque, fênix, mariposa, cometa e baleia cósmica.

O editor oferece filtro por ilha, quatro paletas (original, turquesa, ametista e pôr do sol) e quatro escolhas de acessórios (traje original, óculos, coroa de cristal e fones). São 384 combinações de catálogo, todas livres. A identidade escolhida aparece no perfil, amigos e ranking. A prévia permanece visível ao rolar o editor; salvar e cancelar preservam seus comportamentos anteriores.

## Atualização manual do Supabase

Não é necessário conectar o Supabase ao chat. No SQL Editor do projeto, execute os arquivos nessa ordem, pulando os que já tiver aplicado:

1. `supabase/social.sql` — estrutura social inicial.
2. `supabase/social-personalization.sql` — capas, molduras, títulos e retorno dos cosméticos públicos.
3. **`supabase/social-avatar-studio.sql`** — amplia a restrição do avatar para os novos modelos e suas combinações. Reaplicável, sem remover dados nem mudar regras de pontuação.

Se os dois primeiros já estiverem aplicados, basta executar o terceiro. Não execute uma migração anterior depois da última sem reaplicar as seguintes, pois as anteriores contêm versões anteriores das restrições e da função.

O terceiro arquivo só substitui a restrição de valores permitidos de `social_profiles.avatar`. Usa o campo existente; não cria tabelas nem colunas e não muda autenticação, amizades, pontos ou progresso. Valores simples, como `fox`, e os quatro símbolos antigos permanecem aceitos. Combinações são identificadores do catálogo, como `dragon~violet~crown`. Nenhuma marcação SVG enviada pelo navegador é salva.

O Worker e a interface compartilham `avatar-catalog.mjs`; a API rejeita identificadores ou combinações desconhecidas. A restrição SQL foi testada contra todas as 384 combinações. Cada SVG usa referências internas únicas, para não misturar gradientes entre retratos na mesma página.

## Validação

- `npm test`: catálogo, API, SQL e suítes existentes. Inclui valores inválidos, compatibilidade, todas as combinações e restrições.
- `npm run build`: inclui catálogo e ateliê nos arquivos públicos.
- `node tests/browser/social.cjs`: duas contas com banco local, persistência de `dragon~violet~crown` após recarregar, cancelar sem salvar, filtro de coleção, convites, bloqueio, ligas e desafios. Confere três larguras (360/768/1440) em dois temas.
- Capturas locais em `work/social-captures/`; a prancha `avatar-collection.png` apresenta os 24 modelos e quatro variações do dragão. Não contém dados de produção.

Validação de produção e execução do SQL real permanecem dependentes da configuração do projeto. O personagem na trilha da jornada agora acompanha o avatar social salvo, incluindo paleta e acessório. A versão da ilha tem corpo e não usa o fundo circular do retrato. O mapa recebe apenas a identidade visual; a ponte não grava XP, rotina ou recompensas. Respostas antigas e de outra conta são ignoradas. Sem perfil social e após sair, o viajante da coleção local continua sendo usado. Não é necessária migração adicional para essa integração.


## Mini viajante da ilha

`island-avatar.js` recebe o perfil autorizado carregado por `account.js`/`social.js`. O renderizador do mapa usa a figura somente na ilha atual e mantém as coordenadas de XP, rótulo, aura e animação existentes. O modelo é a mesma ilustração do catálogo, com referências SVG próprias para cada instância.

Verificações: teste unitário de troca de conta e respostas atrasadas, catálogo completo nas versões retrato e figura, integração de navegador nas seis ilhas e em tela de 360 px, saída da conta com retorno ao viajante local e suíte existente `tests/browser/island-life.cjs` para movimentos, marcos e acessibilidade. Capturas locais: `work/social-captures/island-avatar-*.png`.
