# Compatibilidade da alternância de tema

O tema agora é controlado por `theme.js`, carregado no head antes do aplicativo e sem dependência dos módulos de estudo, marca ou conta. O inicializador e o listener antigos foram removidos para evitar dois controles aplicando estados diferentes.

A escolha atualiza em conjunto `data-theme`, `color-scheme` do elemento raiz, os metadados `color-scheme`/`theme-color` e o texto/estado acessível do botão. A propriedade usa `only light` ou `only dark` quando suportada, sinalizando ao navegador que o site controla a paleta e reduzindo interferência do escurecimento automático. Navegadores sem esse suporte recebem o valor simples `light`/`dark`.

A preferência continua usando `missao-escola-theme` no localStorage. Se a gravação local for bloqueada, tenta sessionStorage; se ambos forem bloqueados, o botão continua funcionando na página atual, mas não há garantia de preservar a preferência após fechar/recarregar. Valores inválidos são ignorados. A alternância acompanha outras abas e a restauração da página pelo histórico. O estado inicial sem preferência permanece claro.

Não é usado `forced-color-adjust: none`: modos de alto contraste e outras preferências de acessibilidade do usuário não são desativados. Há fallbacks visuais para navegadores que não suportem `color-mix`.

## Validação

`node tests/browser/theme.cjs` exercita Chromium com preferência de sistema escura e o flag `WebContentsForceDark`, além de:

- cliques repetidos, incluindo no texto interno do botão;
- preferência preservada após recarga;
- armazenamento local bloqueado;
- armazenamento local somente para leitura com preferência antiga;
- armazenamento local e de sessão indisponíveis;
- sincronização de preferência entre abas;
- script de estudo/marca bloqueado sem impedir o controle de tema;
- teclado e retorno pelo histórico.

O roteiro utiliza os caminhos do Playwright e do Chromium disponíveis neste ambiente. Em outras máquinas, ajuste esses caminhos ou configure o navegador equivalente. O build inclui `theme.js`.

Não foi executado o Opera GX nativo, nem uma extensão de alteração de cores. A validação em Chromium cobre a base compartilhada e o cenário de escurecimento automático, mas não garante controle sobre extensões, estilos do usuário ou implementações próprias do Opera GX. Caso essas ferramentas continuem impondo cores após a atualização, a configuração por site de “Forçar páginas escuras” deve ser verificada no navegador.

Não há migração de dados nem mudanças no Supabase. As alterações foram testadas localmente; disponibilização no site requer publicação.
