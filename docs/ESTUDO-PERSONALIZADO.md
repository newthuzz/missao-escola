# Melhorias do estudo personalizado

Implementação local de 30/10/2026. Base: `a6d18cbb54d00e8d8027b1e71d667da474f619c3`. A implementação foi validada localmente; o envio posterior ao GitHub foi autorizado pelo usuário. A publicação no Cloudflare exige confirmação separada. As regras e os arquivos de backend social, login, autenticação e pontuação competitiva não foram alterados.

## Mudanças entregues

| Área | Comportamento implementado | Verificação |
|---|---|---|
| Outro caminho | Memoriza apresentações recentes, distingue exemplo/práticas e muda uma prática quando existe alternativa adequada | Matriz de anos/matérias, regeneração e banco pequeno |
| Repetir | Reinicia as etapas da mesma sequência; preserva histórico e regras de XP existentes | Motor e navegador, com confirmação |
| Acervo esgotado | Oferece sessão menor com quantidade/duração reais e aviso; revisões continuam disponíveis | 120 regenerações em banco limitado |
| Pré-requisitos | Erros recentes na base elevam a prioridade da revisão; detalhe oferece checagem opcional antes da unidade dependente | Caso razões/equações, ausência de evidências, IDs ausentes e ciclos |
| Matérias | Combina revisão, dificuldade, prática em dias recentes e avaliação próxima; oferece três alternativas com motivos | Simulação longitudinal e interface |
| Diagnóstico | Mantém teste inicial curto e opcional, com primeiras práticas identificadas como checagens de pouca evidência | Diagnóstico com pergunta pulada e práticas de apoio |
| Conteúdo | 18 atividades novas de matemática em somas, frações e razões; contextos de comparação, inversa, proporções, descontos e frações | Gabaritos conhecidos e estrutura das alternativas |
| Dicas | Pista conceitual, passo intermediário e solução completa identificada como apoio | Navegador e registro de ajuda |
| Feedback | Novas atividades explicam o erro de cada distrator; questões antigas preservam suas explicações | Resposta errada, ajuda e primeira tentativa |
| Objetivo/conclusão | Mostra objetivo da unidade, critério de reflexão, acertos independentes, apoio e próxima revisão | Conclusão da sequência no navegador |
| Preferências | Tempo, tema, matéria e data de avaliação opcionais influenciam duração, unidades e recomendações | Motor, interface e recarga |
| Confiança | Registro opcional; chute correto oferece sugestão de verificar compreensão, sem mudar pontuação ou definir nível sozinho | Histórico e interface |
| Desempenho | Índices por matéria/unidade/questão, cache por estado/data, reaproveitamento de resultados e supressão de redesenhos/gravações idênticos | Invalidação após resposta, perfil, restauração e mudança do dia |
| Histórico | Estado v2 aceita v1, preserva observações além de 5.000, sem truncamento silencioso | Importação de 6.000 registros e recarga estável |
| Recuperação | Guarda cópia v1 antes do primeiro salvamento v2; permite baixar cópia atual/anterior; falha de armazenamento mantém estado em memória | Quota simulada, recuperação, exportação e migração no navegador |
| Integridade | Valida calendário e trata enunciados equivalentes como uma evidência por dia, preservando IDs históricos | Data inexistente, duplicatas de resistores e importações inválidas |
| Acessibilidade | Preserva fontes de 16/14 px, zoom, foco e estados; novas preferências são acessíveis por teclado e feedback usa texto/status | 320/390/1280 px, teclado e ausência de transbordamento |

### Limites importantes do que foi implementado

- O diagnóstico inicial não virou um novo teste adaptativo multinível. A progressão continua pelo motor já existente, agora com revisão de bases, checagens no uso e indicações de pouca evidência. Um diagnóstico adaptativo por habilidade mais sofisticado permanece uma evolução futura.
- As 18 questões novas estão marcadas como `pending-pedagogical-review`, com aviso na interface. Foram conferidas tecnicamente e por raciocínio matemático, mas não revisadas por educador externo nem testadas com alunos.
- As outras 44 unidades não receberam expansão editorial. Planos pequenos continuam possíveis, agora explicitados. Não há promessa de três práticas em toda combinação.
- As dicas específicas e feedback por distrator foram acrescentados ao conteúdo novo. O restante do acervo tem uma sequência de apoio baseada na habilidade/unidade e preserva as soluções existentes; não recebeu 558 revisões editoriais individuais.
- Confiança gera orientação ao aluno e é preservada como contexto; não altera sozinha o modelo de domínio. Não foi adicionada coleta de tempo ativo, pontuação por rapidez ou classificação de capacidade.
- O campo de explicação pessoal é um espaço temporário de reflexão. A interface informa que não é salvo nem corrigido automaticamente.
- O tempo de sessão limita o tamanho do plano; a estimativa considera exemplo e quantidade de práticas. Não é uma previsão individual calibrada com alunos, nem uma garantia de duração.
- Conservar o histórico completo evita perda silenciosa, mas pode atingir a quota do navegador em uso muito prolongado. Ao falhar, o app informa o problema e permite exportar. Paginação/arquivamento no servidor e IndexedDB não foram introduzidos sem necessidade medida.
- As relações de pré-requisito são recomendações suaves; não são um diagnóstico pedagógico. Relações cíclicas não provocam recursão, mas o conteúdo desses ciclos merece revisão editorial.
- Não houve certificação WCAG, teste com leitor de tela, prova em celular físico ou validação de produção.

## Dados, migração e segurança

A chave local `missao-escola-personal-v1` foi mantida para localizar os estudos existentes; o campo interno `version` passa a 2. `load()` aceita as versões 1 e 2, normaliza campos adicionais e não modifica o objeto original recebido.

No primeiro salvamento de um estado anterior v1, a versão bruta fica em `missao-escola-personal-before-v2`, sem sobrescrever uma cópia já existente. Em **Ajustar meu estudo de hoje**, os botões permitem baixar os estudos atuais ou essa cópia anterior. Se não houver cópia anterior, o app informa isso. O arquivo exportado contém dados privados de estudo: deve ficar com o usuário.

Não há migração SQL nem novas credenciais necessárias. O backup existente pode guardar o novo estado dentro de `snapshot.learner`. A publicação futura deve incluir os três novos arquivos JavaScript; `npm run build` já os copia para `dist/`.

Antes de um eventual rollback para o código antigo, preserve/exporte a cópia v1: a versão antiga não entende o estado v2. Não há importador de arquivos JSON novo nesta entrega; a cópia anterior permite recuperação por manutenção ou migração assistida. O fluxo de restauração do backup da conta foi preservado.

Quando a quota impede criar a cópia da migração, o novo estado não substitui silenciosamente o original. As respostas continuam em memória e o usuário pode exportá-las antes de fechar.

As duas questões equivalentes de resistores mantêm seus IDs e referências para compatibilidade; o índice agrupa sua evidência. As regras de XP existentes não foram reescritas por essa correção, e os pontos competitivos continuam exclusivamente no backend social.

## Resultados dos testes

- `npm test`: quatro testes do transporte do backup, cinco da API social, suíte SQL social e **14 testes do motor personalizado** passaram.
- Auditoria do motor: oito verificações agrupadas passaram, com 108 combinações de ano/matéria, 370 seleções válidas e consistência estrutural das **576 questões**.
- Navegador: **23 verificações passaram**, incluindo fluxo dirigido completo, preferências, regeneração/repetição, base opcional, ajuda/confiança, quota, edição do ano, recarga, cópia v1, exportação, teclado e nove verificações de largura.
- Nenhum erro JavaScript foi capturado na execução final.
- `npm run build`: concluído; os arquivos novos estão no diretório de saída.
- Banco de produção, Cloudflare e Supabase reais não foram alterados nem usados para afirmar prontidão de publicação.

### Como repetir

Na raiz do checkout:

```sh
npm ci
npm test
npm run build
node reports/personalized-study/implementation/compare.cjs
```

Os roteiros de navegador usam o Chromium e o Playwright instalados neste ambiente. Em outra máquina, ajuste os caminhos no início de `reports/personalized-study/browser-audit.cjs` e `implementation/startup.cjs`.

Para preservar a auditoria original, direcione os novos resultados para outra pasta:

```sh
STUDY_AUDIT_OUTPUT_DIR=reports/personalized-study/implementation node reports/personalized-study/audit.cjs
STUDY_AUDIT_OUTPUT_DIR=reports/personalized-study/implementation node reports/personalized-study/browser-audit.cjs
```

O benchmark de inicialização usa `/tmp/study-baseline.html` e `/tmp/study-before.css`. Para reproduzi-los, extraia `index.html` e `accessibility.css` do commit base com `git show` antes de executar `startup.cjs`. A porta local precisa estar disponível.

## Desempenho antes e depois

### Cálculo isolado com conjunto idêntico

`implementation/compare.cjs` executa os dois motores sobre as mesmas 558 questões anteriores e históricos sintéticos idênticos, com 0, 500, 2.000 e 5.000 registros. São quatro aquecimentos e 12 amostras úteis por operação. Não há DOM nem rede.

Medianas com 5.000 registros, em milissegundos:

| Operação | Antes | Depois |
|---|---:|---:|
| Recomendações, sem mudança no estado | 7,628 | 0,001 |
| Recomendações, índice reconstruído | 7,473 | 8,040 |
| Novo plano, índice reaproveitado | 9,371 | 0,106 |
| Novo plano, índice reconstruído | 9,059 | 3,385 |

O ganho maior vem de evitar recálculos redundantes e acelerar a seleção do plano. **O primeiro cálculo completo de recomendações não ficou mais rápido**: agora também considera revisões e mais contexto. Essa diferença foi mantida explícita; os resultados de cache não representam o custo de toda resposta nova.

### Interface e armazenamento

O roteiro do Chromium mede painel, plano, questão e salvamento separadamente, com e sem desaceleração de CPU de 4×. Os JSONs `before-browser.json` e `browser-results.json` mantêm os resultados completos.

Chamadas repetidas sem mudança de estado deixam de reconstruir o painel ou regravar o mesmo histórico. Valores arredondados a zero indicam trabalho evitado/abaixo da resolução útil, não armazenamento instantâneo de dados novos. A invalidação após novas respostas é verificada pelos testes; os tempos da UI não são Core Web Vitals nem latência ponta a ponta.

### Inicialização e tamanho

Medição durante a implementação, anterior à última ampliação textual das dicas: doze contextos limpos do Chromium, seis por versão, viewport de 390 px, CPU 4×, servidor local sem compressão e rede externa bloqueada:

| Mediana | Antes | Depois |
|---|---:|---:|
| DOMContentLoaded | 964,4 ms | 942,1 ms |
| Evento load | 989,65 ms | 963,55 ms |
| Corpos dos recursos transferidos | 630.413 bytes | 660.001 bytes |

A diferença de tempo é pequena e sujeita a variação; não demonstra melhora no site real. O total transferido aumentou cerca de 30 KB com conteúdo e interface novos. A extração do motor facilita cache e manutenção, mas **não reduziu o peso total**. Compressão, rede real, cache do CDN e aparelhos físicos permanecem fora desse teste.

## Próximos passos priorizados

1. Revisão pedagógica externa das 18 questões novas, suas faixas escolares, dicas e feedback.
2. Ampliar progressivamente as outras unidades e acrescentar representações visuais acessíveis, com revisão editorial.
3. Observar sessões reais e avaliar retenção e resolução em contexto novo, não apenas XP ou velocidade.
4. Se uso prolongado demonstrar necessidade, implementar armazenamento assíncrono/arquivamento privado com política clara.
5. Evoluir as checagens por habilidade e a estimativa de duração com dados adequados, sem impor um teste inicial longo.

Os arquivos foram preparados e testados localmente. O envio ao GitHub foi autorizado posteriormente para alimentar a integração do Cloudflare. Um push confirmado não comprova que o deploy terminou; confira o histórico de publicação do projeto.
