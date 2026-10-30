# Central de estudos

A abertura foi reorganizada para responder a duas perguntas: por onde começar e onde encontrar cada sistema.

## O que fica na abertura

- Uma ação principal de estudo personalizado. Quando há um plano iniciado hoje, ela continua o mesmo plano, preservando a matéria, questões e etapas concluídas.
- Uma linha com a meta diária de estudo, atualizada pelo progresso existente.
- Três acessos identificados por nome e ícone: rotina, jornada e amigos/liga.
- Links discretos para missões, recompensas e apoio.
- Mascote/tutor e perfil nos acessos fixos existentes.

O cartão da rotina mostra o primeiro bloco ainda não concluído do dia, quando existir. Não tenta substituir a agenda completa.

## Como os demais conteúdos foram organizados

| Conteúdo | Destino |
| --- | --- |
| Mapa das ilhas, sequência, escudos e detalhes de XP/nível | Minha jornada, em `#jornada` |
| Lista completa de missões | Missões do dia |
| Baú diário e itens | Recompensas |
| Agenda e edição de horários | Rotina de estudos |
| Perfil, diagnóstico e opções de personalização | Perfil e estudo personalizado |
| Login, amigos e liga | Conta e comunidade, no sistema existente |

Foram removidas da abertura as repetições de missões, recomendações longas, prévia extensa da rotina, blocos grandes de progresso e frases motivacionais redundantes. As regras de XP, baú, sequência e sincronização continuam sendo as existentes.

A navegação lateral usa nomes curtos e destaque apenas no sistema ativo. A navegação móvel tem seis entradas, incluindo Conta. O mapa só é atualizado quando sua página é aberta; a ambientação continua suspensa fora da área visível. O fallback sem IntersectionObserver observa a página que contém o mapa, em vez de presumir que ele está no início.

## Verificação

Após `npm run build`:

```sh
node tests/browser/home.cjs
node tests/browser/island-life.cjs
node tests/browser/progress-sync.cjs
npm test
```

O teste da central cobre a continuidade real de um plano parcial, acesso aos sistemas, ausência dos painéis antigos na abertura, atualização da meta e as regras do baú após sua mudança de página. Também verifica teclado, temas claro/escuro, larguras de 320 a 1440 px e fonte ampliada. Os testes das ilhas comparam a geometria com a versão anterior e verificam animação e interação na nova página.

Não há alteração no esquema do Supabase nem necessidade de atualizar a Edge Function para esta reorganização visual. A ativação do tutor continua seguindo seu tutorial próprio.
