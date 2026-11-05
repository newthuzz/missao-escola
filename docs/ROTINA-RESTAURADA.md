# Rotina com a interface anterior

Alteração solicitada pelo usuário após testar o beta: restaurar a aparência e a apresentação completa da rotina anterior. As demais melhorias do beta continuam na versão local. Nenhuma publicação foi feita.

## Implementação

- A seção `#page-rotina` mantém exatamente o markup da versão `fc7d925`.
- Removida a transformação que separava a rotina em três passos, sua inclusão no HTML/build e o CSS exclusivo desse fluxo. O build também limpa o arquivo gerado antigo.
- Restaurada a rolagem dos cartões de geração automática/montagem manual para os respectivos formulários.
- Voltaram a apresentação original, cartões, horários de cada dia, duração dos blocos/intervalos, matérias, compromissos, edição manual e calendário de revisão.
- Motor Routine, chave de armazenamento, formato dos dados, integração com o estudo e confirmação de salvamento preservados. Não há migração ou limpeza das rotinas salvas.
- HTML portátil regenerado com os mesmos limites dos serviços online já documentados.

## Validação executada

- Build e geração do HTML portátil passaram.
- Suíte de navegador beta passou com a rotina original e as demais funções de estudo, retomada, conclusão, XP, ano, autenticação controlada e temas.
- Suíte do HTML portátil passou: estudo, persistência, rotina, exportação, imagens/fontes incorporadas, layout e Tutor por HTTP com fixtures.
- Verificação específica comparou o markup com `fc7d925`; testou compromissos respeitados na geração, salvamento e recarregamento sem mudança nos dados, adição manual e rejeição de blocos sobrepostos.
- Layout validado em 320, 390, 768 e 1440 px, nos dois temas, sem exceções JavaScript ou rolagem horizontal.
- Prints e resultados específicos estão no pacote local, em evidencias-rotina-restaurada.

A navegação file:// continua bloqueada no Chromium gerenciado. O ramo de arquivo foi validado com resposta HTTP controlada; a abertura direta no PC deve ser conferida pelo usuário. Nenhum serviço de produção foi acessado nesta validação.
