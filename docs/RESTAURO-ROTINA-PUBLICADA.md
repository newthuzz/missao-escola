# Restauração da rotina completa

A pedido do usuário, a rotina de estudos retorna à apresentação completa anterior, com cartões de geração automática/montagem manual, horários, compromissos, configuração de matérias e calendário na mesma tela.

Esta correção substitui apenas a apresentação da rotina. As demais partes permanecem na versão do ZIP inicial publicada em `b340316`.

- Interface baseada na versão `cbfb166`; o markup original da rotina foi preservado.
- Removidos o script e os estilos exclusivos do fluxo em três etapas; o build limpa o script antigo de dist.
- Restaurada a navegação dos cartões para os formulários correspondentes.
- Motor Routine, formato e chave de armazenamento, rotinas salvas e integração com o estudo preservados.
- A comparação da build com a anterior confirma alterações apenas em `index.html` e `beta.css`, além da remoção de `routine-steps.js`.
- Build e suíte de navegador beta passaram com geração, salvamento, recarregamento, edição e os demais fluxos do site.
- Sem migração, limpeza de dados, alteração de secrets ou mudança de configuração do Tutor.

A implantação correspondente deve ser confirmada pelo check `Workers Builds: missao-escola` do commit publicado.
