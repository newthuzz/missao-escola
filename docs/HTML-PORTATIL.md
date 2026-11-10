# HTML portátil para avaliação

Geração: `npm run build` e `npm run build:html`. O segundo comando gera `../previews/missao-escola-beta-portatil.html`; um caminho de saída pode ser passado a `node scripts/build-portable-html.mjs`.

O gerador incorpora CSS, imagens e fontes como data URLs, substitui scripts externos por scripts inline e reúne os módulos de conta/Tutor em um bundle IIFE com o esbuild já presente. Chat e painel continuam sendo montados ao abrir; KaTeX e suas fontes são incorporados ao arquivo e ativados quando há fórmula. Licenças de KaTeX e Anton ficam preservadas nos comentários do HTML.

Adaptações exclusivas do arquivo gerado:

- Conta, sincronização e Tutor são bloqueados com explicação quando `location.protocol === 'file:'`; nenhuma sessão salva é utilizada para chamar serviços a partir desse modo.
- Quando servido por HTTP, o bundle mantém as integrações reais existentes. Autenticação, autorização do backend e CORS não são contornados.
- A exportação dos estudos usa listener que alcança os botões movidos para o perfil, inclusive quando o clique ocorre sobre o ícone.
- O modo de arquivo identifica que os dados ficam no navegador; não grava dados pessoais dentro do HTML.

Validação: `node tests/browser/portable-html.cjs`. O Chromium gerenciado bloqueia navegação file:// por política. O teste serve uma resposta controlada que ativa o ramo de arquivo apenas para validação; o HTML distribuído não tem essa substituição. Uma segunda resposta serve o HTML original para verificar o ramo HTTP com fixtures de conta/Tutor e fórmulas. Não se afirma que o duplo clique foi testado nativamente neste ambiente.

Não é feita publicação por esses comandos.
