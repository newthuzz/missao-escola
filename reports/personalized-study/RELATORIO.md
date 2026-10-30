# Relatório de avaliação do estudo personalizado — Missão Escola

Data: 30/10/2026. Versão analisada: `a6d18cbb54d00e8d8027b1e71d667da474f619c3`.

## Resultado principal

A base do estudo personalizado funciona nos cenários testados. O fluxo completo foi concluído no navegador e o motor respeitou os limites de ano/ciclo. As melhorias mais importantes são **variar os planos, reforçar pré-requisitos e ampliar o banco por nível**. Há oportunidades de otimização para históricos grandes, mas não encontrei evidência de um gargalo que justifique reescrever o aplicativo inteiro.

Esta avaliação não alterou código de produção, dados do Supabase nem configurações do Cloudflare. Os únicos arquivos novos são os artefatos desta auditoria.

## Como os testes foram feitos

- Extração e execução dos próprios módulos `Curriculum` e `Adaptive` presentes no HTML, sem reimplementar o algoritmo.
- Inspeção estrutural das 558 questões, 47 unidades e 12 matérias.
- 108 combinações de ano escolar e matéria, cobrindo do 1º ano do Fundamental ao 3º do Médio.
- 370 seleções válidas de questões em diferentes níveis, verificando ano mínimo e ciclo.
- 324 combinações de ano/matéria/nível fixo: 262 têm questões disponíveis.
- Simulações de acertos, erros, ajuda, revisão espaçada, repetições diárias e histórico crescente.
- Chromium local: cadastro de perfil, diagnóstico, estudo dirigido, respostas erradas, dicas e persistência.
- Nove verificações de largura: perfil, aprendizagem e diagnóstico em 1280, 390 e 320 px.
- Desempenho com 0, 500, 2.000 e 5.000 tentativas no navegador. CPU normal e desaceleração de 4×. O motor também foi medido isoladamente com 10.000 tentativas, como estresse.

Os dados são sintéticos. A desaceleração de CPU aproxima uma condição de menor capacidade, mas não equivale a um celular específico. Não houve teste com alunos reais, rede móvel, leitor de tela ou validação clínica/psicométrica. A qualidade dos 558 gabaritos não foi certificada: verificar estrutura e índices das alternativas não prova correção pedagógica de todo o conteúdo.

## O que funcionou

| Teste | Resultado |
|---|---|
| Geração de plano nas 108 combinações disponíveis | Todos geraram plano com exemplo e prática |
| Ano mínimo e ciclo na seleção padrão | Respeitados nas 370 seleções válidas |
| IDs, índices das alternativas e vínculo questão/unidade | Consistentes nas 558 questões |
| Primeira tentativa da mesma questão no mesmo dia | Não é sobrescrita por nova resposta |
| Diagnóstico com pergunta pulada | Pergunta pulada não vira erro no histórico |
| Adaptação após sequências de acertos/erros | Sobe com acertos independentes; permanece fácil com erros |
| Acertos feitos com ajuda | Não promovem sozinhos para o nível difícil |
| Intervalos de revisão | 1, 3, 7 e 14 dias; erro reinicia em 1 dia |
| Critério de consolidação de unidade | Alcançável nas 47 unidades com prática independente distribuída |
| Perfil salvo e página recarregada | Perfil restaurado |
| Fluxo dirigido completo | Início, exemplo, três práticas e conclusão passaram |
| Erro seguido de acerto | Primeiro erro permanece como evidência do modelo |
| Dica antes de responder | Tentativa registrada como estudo com ajuda |
| Telas avaliadas | Sem transbordamento horizontal nos nove casos |
| Erros JavaScript nos fluxos finais | Nenhum capturado |

O diagnóstico do 7º ano testado teve oito perguntas; uma foi pulada e sete observações foram registradas. As oito verificações agrupadas do motor e as 14 verificações finais do navegador passaram. Isso descreve o escopo executado; não significa que todo cenário possível foi validado.

## Achados e melhorias prioritárias

### 1. “Preparar outro caminho” pode repetir exatamente o plano — prioridade alta

**Evidência:** com perfil e histórico inalterados, o botão gerou o mesmo exemplo e as mesmas práticas. Confirmado no motor e no navegador. A ordenação termina por ID, sem memória dos planos já apresentados.

**Impacto:** o aluno pode interpretar a ação como uma nova sequência, mas receber conteúdo idêntico. Isso favorece memorização da resposta e reduz a sensação de avanço.

**Proposta:** registrar questões apresentadas em planos, variar dentro de uma faixa de adequação e reservar uma questão inédita ou de transferência. Separar claramente “repetir este estudo” de “gerar nova sequência”. Não excluir automaticamente uma revisão vencida que seja importante.

**Aceitação:** ao pedir outro plano sem mudar o nível, trocar pelo menos uma prática quando houver alternativas adequadas. Informar quando o acervo disponível foi esgotado.

### 2. Acervo pequeno por nível limita a prática — prioridade alta

**Evidência:** cada uma das 47 unidades tem seis questões: duas fáceis, duas médias e duas difíceis. Nos 262 casos de nível fixo com questões disponíveis, o plano teve apenas **uma prática**, porque a outra questão daquele nível foi usada como exemplo. No adaptativo, 84 das 108 combinações tiveram três práticas e 24 tiveram uma.

O adaptativo pode recorrer a outros níveis quando esgota o nível inicial. Portanto, o plano não necessariamente contém três questões com a mesma dificuldade sugerida.

**Impacto:** pouca variedade para consolidar uma habilidade, risco de decorar alternativas e duração pouco relacionada ao tamanho real do plano.

**Proposta:** ampliar primeiro as unidades mais acessadas, com variantes de contexto e representações. Uma meta editorial inicial pode ser pelo menos quatro práticas além do exemplo por nível; é uma meta de produto, não um número cientificamente obrigatório. Mostrar a dificuldade de cada etapa e explicar eventuais mudanças.

### 3. Pré-requisitos existem no conteúdo, mas não orientam suficientemente a prioridade — prioridade alta

**Evidência reproduzida:** perfil do 8º ano com três erros em razões/porcentagens. `learningPath` colocou equações em primeiro lugar, prioridade 4, e razões em segundo, prioridade 3,8, com status “Reforçar”. Equações declara razões como pré-requisito. O campo `prerequisites` não participa diretamente da pontuação da trilha.

**Impacto:** o caminho pode avançar para uma unidade dependente mesmo diante de sinais de dificuldade na base.

**Proposta:** sugerir uma checagem curta do pré-requisito e uma ponte de revisão antes da nova unidade. Evitar bloqueio absoluto: o aluno deve poder avançar ou informar que já conhece o conteúdo.

**Aceitação:** com erros recentes em um pré-requisito, exibir o motivo e oferecer uma revisão de base antes da unidade dependente.

### 4. Recomendações podem concentrar demais a mesma matéria — prioridade média/alta

**Evidência:** simulações com uma matéria marcada como dificuldade e uma primeira tentativa errada por dia. Para cada uma das oito matérias disponíveis no 7º ano, a matéria marcada ficou em primeiro lugar nos 120 dias simulados.

Isso é coerente com a preferência e os erros; não é uma falha de execução. Contudo, o algoritmo não demonstra uma política explícita de equilíbrio entre matérias, objetivos ou carga recente.

**Proposta:** combinar reforço com revisões e variedade. Exibir duas ou três opções com motivos: “reforçar uma base”, “revisão do dia” e “continuar outra matéria”. Usar tempo disponível e provas próximas como preferências opcionais.

### 5. Diagnóstico é curto e restrito a questões fáceis — prioridade média

**Evidência:** `startDiagnostic` seleciona uma questão fácil por matéria disponível. Isso é adequado para uma entrada breve, mas pouco informa sobre domínio de tópicos diferentes ou níveis intermediários.

**Proposta:** manter o teste inicial opcional e curto; acrescentar checagens por habilidade durante o uso. Depois de um acerto, uma questão de aplicação; depois de um erro, uma checagem de pré-requisito. Mostrar “ainda temos poucas evidências” em vez de transmitir precisão excessiva.

O site já avisa que o teste não é nota nem diagnóstico definitivo. Essa transparência deve permanecer.

### 6. Tempo sugerido usa faixas fixas de idade — prioridade média

**Evidência:** `minutes()` retorna 5 minutos até 10 anos, 10 até 14 anos e 15 a partir daí. Não utiliza tempo real de resolução nem a quantidade de práticas do plano.

**Proposta:** perguntar “quanto tempo você tem hoje?” e, após uso suficiente, sugerir a duração com base na mediana de sessões comparáveis. Permitir pausas e ignorar períodos em que a aba fica inativa. Tempo rápido não deve valer mais pontos nem ser tratado automaticamente como maior aprendizagem.

### 7. Histórico muda de tamanho ao recarregar — prioridade média

**Evidência:** o estado em memória aceita mais de 5.000 observações; `load()` preserva somente as últimas 5.000. No teste, um histórico com 10.000 registros passou a 5.000 após serializar e carregar.

**Impacto:** em uso prolongado, evidências antigas deixam de participar da recomendação após recarga. O limite pode ser uma decisão razoável, mas precisa ser consistente e preservar o resumo necessário.

**Proposta:** aplicar uma política única de retenção, guardar resumos por habilidade e avisar quando houver limite. Para uma etapa futura, histórico paginado no Supabase com acesso privado por usuário; não é necessário migrar tudo para o servidor para melhorar o algoritmo local.

### 8. Datas inválidas e enunciado duplicado — prioridade baixa

**Evidência:** `observe()` aceitou `2026-02-31`. O validador aceita o formato e uma data normalizada pelo JavaScript, sem conferir se o dia existe no mês. É principalmente um problema de importação/estado externo; o aluno não digita essa data no fluxo normal.

Também encontrei o mesmo enunciado de resistores de 6 Ω em paralelo em dois IDs: `fisica-em-gw157w` e `learn-f-eletricidade-6`. A deduplicação por ID permite que sejam tratados como evidências distintas. Isso não prova que todos os caminhos os apresentarão juntos.

**Proposta:** validar calendário por comparação com a data original e identificar duplicatas por texto normalizado/conceito, mantendo rastreabilidade editorial.

## Desempenho medido

Medianas no Chromium local, em milissegundos. Cada operação foi aquecida e repetida dez vezes por condição. O painel inclui manipulação do DOM; os números não incluem o tempo completo até a pintura na tela, rede ou interação humana. Valores próximos de zero estão abaixo da resolução útil dessa amostragem.

| Operação | Sem histórico, CPU normal | 5.000 tentativas, CPU normal | 5.000 tentativas, CPU 4× mais lenta |
|---|---:|---:|---:|
| Atualizar painel personalizado | 0,6 | 3,9 | 19,9 |
| Preparar plano e redesenhar etapas | 0,1 | 2,6 | 12,5 |
| Selecionar e montar questão | ≈0 | 0,8 | 4,7 |
| Salvar histórico local | ≈0 | 2,5 | 11,6 |

Não são tempos de carregamento da página nem resultados de Core Web Vitals. Operações individuais não demonstraram travamentos grandes nesses testes. Redesenhar e salvar várias vezes na mesma interação pode, porém, somar atraso, sobretudo em aparelhos modestos.

**Causas observadas no código:**

- `model()` percorre o histórico para cada matéria; `recommend()` chama esse cálculo por matéria. O painel volta a calcular recomendações e evidências no mesmo ciclo de atualização.
- `learningPath`, `unitStats` e `reviewInfo` repetem filtros e buscas no histórico para unidades e questões.
- `saveLearner()` serializa o estado inteiro e usa `localStorage`, que é síncrono.
- O HTML tem 612.481 bytes sem compressão, dos quais 312.232 são do bloco de currículo. Inclui CSS, dados e lógica na mesma página. Isso sugere investigar custo inicial, mas não foi medido como gargalo de rede nesta auditoria.

**Ordem recomendada de otimização:**

1. Calcular recomendações uma vez por atualização e reutilizar os resultados no painel e nos cartões.
2. Indexar observações por matéria, questão, unidade e dia; manter agregados incrementais. Invalidar o cache quando mudar perfil, data ou observações.
3. Redesenhar somente os blocos afetados, em vez de substituir painéis inteiros após cada resposta.
4. Agrupar gravações próximas e preservar o salvamento na saída. Avaliar IndexedDB se o histórico realmente crescer; não adiar gravações de modo que respostas sejam perdidas.
5. Separar dados, estilos e lógica em recursos cacheáveis. Medir rede e inicialização antes de introduzir carregamento por matéria.

Após otimizar, repetir exatamente os mesmos cenários e comparar mediana e piores amostras. Não há ganho percentual prometido sem implementar e medir.

## Informações que acrescentariam valor ao estudo

| Informação/conteúdo | Benefício | Como incluir |
|---|---|---|
| Objetivo da sessão e critério de sucesso | O aluno entende o que vai aprender | “Ao terminar, você conseguirá calcular descontos simples e explicar o resultado” |
| Conteúdo atual e avaliação próxima | Torna o plano relevante à escola | Tema, data e objetivo opcionais, sem exigir nome da escola |
| Tempo disponível e preferência de sessão | Ajusta carga e pausas | Escolha rápida: 5, 10, 15 minutos ou personalizada |
| Confiança na resposta | Ajuda a distinguir dúvida de segurança | “Chutei / fiquei em dúvida / consegui explicar”, de forma opcional |
| Explicação de cada alternativa errada | Corrige o raciocínio específico | Distrator associado a um erro comum, não só gabarito geral |
| Dicas graduais por questão | Ajuda sem revelar imediatamente | Pista conceitual → passo intermediário → solução comentada |
| Exemplo e problema de transferência | Testa compreensão além de reconhecimento | Outra situação, desenho, tabela ou resposta curta |
| Pré-requisitos e mapa de habilidades | Mostra por que revisar uma base | Reaproveitar os campos já existentes e torná-los acionáveis |
| Próxima revisão e evidências de consolidação | Dá direção após a sessão | Data prevista, tentativas independentes e evolução por habilidade |
| Opções de acessibilidade | Apoia formas diferentes de estudar | Leitura em voz alta opcional, teclado, contraste, reduzir movimento e pausas |

O acervo já possui objetivos, resumos, fontes e pré-requisitos nas unidades; a proposta é aproveitar melhor esses campos, não cadastrar tudo novamente. As fontes e o aviso de cobertura parcial da BNCC já existem. Vincular habilidades da BNCC deve envolver revisão editorial real, sem sugerir que o acervo atual cobre todo o currículo.

Para instrumentação futura, registrar ID da questão/unidade, versão do conteúdo, primeira resposta, ajuda solicitada, tempo ativo aproximado e revisões posteriores. O app hoje já registra questão, dia, acerto, ajuda, ano e origem. Não é necessário coletar endereço, nome completo, laudos ou dados de saúde para melhorar as sugestões. Confiança e tempo não devem, isoladamente, classificar capacidade do aluno.

## Plano de ação sugerido

1. **Primeiro:** corrigir repetição dos planos, explicitar esgotamento do acervo e acrescentar checagem de pré-requisitos.
2. **Depois:** ampliar questões por nível, dicas graduais e explicações dos erros nas unidades mais utilizadas.
3. **Em paralelo:** reaproveitar cálculos do painel e tornar consistente a retenção do histórico.
4. **Após isso:** introduzir tempo disponível, objetivos escolares e revisão por habilidade; medir com alunos e responsáveis pela orientação pedagógica.

O resultado deve ser avaliado por acerto independente em revisão posterior, resolução de problemas novos, clareza das explicações e continuidade das sessões — não somente por XP, tempo conectado ou cliques.

## Evidências e reprodução

- `audit.cjs`: análise estrutural, simulações do motor, exemplos e medidas isoladas. Executar `node reports/personalized-study/audit.cjs` na raiz do repositório.
- `results.json`: resultados completos dessa execução.
- `browser-audit.cjs`: cenários e medições no Chromium. O caminho do Playwright e do Chromium está configurado para este ambiente; em outra máquina deve ser ajustado.
- `browser-results.json`: resultado final: 14 verificações passaram, sem erros JavaScript capturados.

Na primeira execução do navegador, um diálogo normal de conquista bloqueou a continuação automática. O roteiro foi ajustado para fechar esse diálogo pelo botão visível e os cenários foram reexecutados. Essa interrupção não foi classificada como defeito do site.
