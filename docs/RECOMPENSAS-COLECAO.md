# Ateliê de descobertas

Atualização de 11/11/2026. A área de recompensas passa a apresentar 18 itens ilustrados: nove personagens de jornada, cinco acessórios, três efeitos e o escudo de sequência. Mantém os quatro IDs anteriores e seus preços: freeze (80), cometa (100), astronauta (180) e violeta (120). Compras e saldo anteriores continuam válidos.

## Experiência

- Prévia grande de cada item antes do resgate, com custo e saldo explícitos. A prévia não gasta estrelas.
- Personagens especiais: Raposa da primeira luz, Guardião das raízes, Dragão do eclipse, Robô dos anéis, Capitão das neves, Fênix do amanhecer, Baleia das constelações, Cometa e Explorador lunar. Recebem detalhes próprios de traje, armadura, galhos, órbitas ou constelações; os 24 avatares do perfil social continuam livres.
- Acessórios: lanterna, mochila, luneta, livro e asas. Efeitos: nebulosa, folhas e halo solar. Todos podem ser visualizados e combinados com o personagem da jornada.
- Próxima conquista escolhida pelo aluno, mostrando o saldo atual em relação ao preço. Escolher uma meta não debita estrelas.
- Presente diário determinístico de 10 estrelas e 5 XP, uma vez ao dia, preservando a regra existente.
- Marcos visuais derivados do histórico real: primeiro estudo concluído, três estudos e segunda ilha. Não cobram nem concedem estrelas adicionais.
- Coleção permanente sem perda por pausas, sem dinheiro real, compra aleatória, prazo artificial ou vantagem nas ligas.

Os itens de jornada não substituem o avatar social salvo no Supabase. É possível voltar ao avatar do perfil, retirar acessórios e efeitos e equipar novamente itens já conquistados, sem nova cobrança. O viajante inicial continua disponível sem login.

## Persistência e compatibilidade

O motor Journey permanece responsável pelo saldo e pelas compras. Itens permanentes só podem ser comprados uma vez; acessórios e efeitos exigem posse. Escudos mantêm o limite de dois. Resgatar não gera XP. Ganhos dos estudos e pontos competitivos não foram alterados.

O snapshot de progresso versão 3 recebe `rewardLook` (origem, acessório e efeito) e `rewardGoal`. O carregador valida esses valores contra a coleção e ignora equipamentos não possuídos. Os dados seguem os fluxos existentes de salvamento local, cópia e sincronização da conta. Não há migração SQL, novo segredo ou serviço externo. Como o saldo já é local nesta arquitetura, essa coleção não é uma economia de competição validada no servidor.

`reward-look.js` compartilha a arte entre loja, prévias e mini viajante. `rewards-ui.js` preserva o botão e a ação original do presente diário. A versão portátil incorpora o módulo e seus recursos.

## Viajante articulado e efeitos animados

A revisão cartunesca de 11/11/2026 substitui as proporções humanoides por uma silhueta de mascote desenhada em `avatar-figure.js`. O desenho usa uma câmera de 232 × 360, com margem lateral para os gestos, com ombros, pescoço, tórax, quadril, braços, antebraços, mãos, coxas, joelhos, canelas e botas. As figuras terrestres agora têm proporções cartunescas próximas de três cabeças, com rostos maiores, pescoço curto, casacos arredondados, luvas e pernas curtas. O desenho não é alongado para simular anatomia humana. O rosto e os acessórios do perfil usam a arte original, em escala uniforme; os retratos sociais continuam compatíveis. Água-viva, mariposa, cometa e baleia mantêm a silhueta flutuante de sua espécie.

O destaque do ateliê, a janela de experimentar e o mini viajante da ilha compartilham esse corpo. O viajante inicial também usa o novo desenho na ilha, sem depender de login. O `viewBox` e `preserveAspectRatio` preservam as proporções e reservam espaço para mãos levantadas. Na ilha, as botas se apoiam na sombra existente; a oscilação vertical antiga fica restrita às criaturas flutuantes.

A respiração dura 4,1 segundos: só o tórax se expande levemente, ombros e cabeça compensam a postura; quadril e pés ficam estáveis. Cabeça, ombros, cotovelos e asas usam grupos SVG com encaixes fixos por `translate` e rotação local em (0,0). Os membros não dependem de uma origem CSS global em grupos aninhados. Tampas arredondadas nas articulações cobrem as emendas. O cumprimento dobra o antebraço antes de levantar o braço; personagens com objetos na mão esquerda usam uma comemoração que mantém esse item próximo ao corpo. Acessórios de mão acompanham o antebraço esquerdo, mochila acompanha as costas e asas acompanham o tronco. Roupas especiais foram redesenhadas no corpo novo. Os IDs, preços, compras, equipamento e campos de persistência não mudam.

`reward-motion.js` oferece uma máquina de estados extensível: `IDLE`, `LOOK_AROUND`, `ARM_GESTURE`, `GREETING`, `CELEBRATION` e `RETURN_TO_IDLE`. Gestos espontâneos aguardam intervalos variados de 8 a 18 segundos. Passar o mouse ou focar o botão do viajante chama sua atenção; clicar, tocar, Enter ou Espaço disparam um cumprimento. Resgatar um item dispara comemoração e equipar chama uma reação de observação. Interações têm prioridade sobre gestos espontâneos; a comemoração não é interrompida por novos cumprimentos. Ao trocar de estado, a pose atual de cada articulação é amostrada uma vez para suavizar a transição. Estados não modificam estrelas ou progresso.

As três auras mantêm movimentos próprios: órbitas da nebulosa, folhas oscilantes e raios solares girando lentamente. Olhos piscam, o visor recebe reflexos, asas se movem e a lanterna brilha. Nenhuma animação de respiração escala o personagem inteiro.

CSS interpola os movimentos; um único temporizador compartilhado agenda as mudanças de estado, sem laços de renderização por quadro. Cenas fora da tela, em abas ocultas ou atrás de uma janela aberta ficam pausadas. `prefers-reduced-motion` desativa as animações por padrão, inclusive quando alterado durante o uso no modo automático. O controle continua disponível como “Ativar animações”: uma escolha explícita do aluno pode ativar somente as prévias de avatar, sem mudar a preferência do sistema nem as outras animações do aplicativo. Os estados locais `auto`, `enabled` e `paused` persistem separadamente dos dados de estudo. O controle também aparece no modal; pausar sempre continua disponível. A inicialização mede a área visível e observa contêineres HTML. Nós removidos antes da entrega do MutationObserver são ignorados. Não há migração SQL, alteração de autenticação ou serviço novo.

## Acesso no celular

Os acessos a Personagens, Amigos e Conquistas ficam visíveis acima da navegação principal em todas as páginas no celular, inclusive após rolar. A regra anterior escondia `.mobile-tools`; a nova barra tem estilo próprio em `beta.css` e conserva os controles reais `data-page` do aplicativo. Não há novo roteador nem tela simulada. Sem login, Amigos continua explicando a necessidade de entrar na conta.

`mobile.js` mede as duas barras com `ResizeObserver`, reservando espaço real no conteúdo, nas mensagens e no Tutor. Isso considera texto ampliado e a área segura do aparelho. Durante o teclado do Tutor, as barras são ocultadas pelo comportamento existente. No desktop, a navegação lateral continua disponível.

## Verificações

- `npm test`: inclui `tests/rewards.test.mjs` para catálogo, saldo, duplicação, escudos, presente diário, compatibilidade, round-trip e equipamento sem posse.
- `npm run build`.
- `node tests/browser/avatar-joints.cjs`: 5.208 amostras de ombros/cotovelos/punhos durante quatro estados; 31 fases por movimento para verificar continuidade e 2.232 fases de enquadramento com quatro silhuetas e seis equipamentos. Verifica início automático no computador, ativação explícita com movimento reduzido no sistema, pausa persistente, controles do modal e retorno de uma página suspensa. Capturas em `work/avatar-joints/`.
- `node tests/browser/mobile-spaces.cjs`: acesso por toque aos três destinos em 320/360/390 px e orientação horizontal, dois temas, página rolada, alvos de 44 px, ausência de sobreposição, texto a 200%, teclado, recarga e retorno ao desktop. Galeria de arte local e capturas em `work/cartoon-mobile/`.
- `node tests/browser/rewards.cjs`: prévia sem débito, resgates, meta persistente, recarga, composição na ilha, filtros, escudos, presente único, foco do modal, teclado, texto a 200%, 360/768/1440 px nos dois temas. Usa dados locais de teste.
- `node tests/avatar-motion.test.mjs`: temporização, prioridades, transições e retorno ao repouso. `tests/rewards.test.mjs` também verifica todas as combinações dos 24 modelos, quatro paletas, quatro acessórios de cabeça e seis opções de equipamento.
- `node tests/browser/reward-motion.cjs`: pés estáveis durante a respiração, gestos automáticos e por interação, comemoração real de compra, reação ao equipar, pausa manual e por visibilidade, movimento reduzido, enquadramento de 25 figuras × seis equipamentos × três poses, interação com CPU simulada 4× mais lenta, ilha e 360/768/1440 px nos dois temas. As prévias não alteram o saldo. Capturas em `work/reward-motion/`.
- `node tests/browser/social.cjs`: regressão de perfil, mini viajante, amizades, bloqueios, ligas e sessões com banco local.
- `node tests/browser/progress-sync.cjs`: inclui restauração de lanterna equipada e meta de personagem em uma cópia da conta, além dos fluxos de sincronização existentes.
- `node scripts/build-portable-html.mjs work/rewards-portable.html` e `PORTABLE_HTML=work/rewards-portable.html node tests/browser/portable-html.cjs`.
- Capturas de teste em `work/rewards-captures/`.

Os testes não usam dados reais de alunos nem executam transações em produção. Dispositivos físicos e FPS em hardware real não foram medidos nesta validação; a condição de desempenho reduzido usa limitação de CPU do Chromium.

A correção de encaixes foi validada no Chromium com quadros intermediários, não apenas poses finais. Safari/WebKit não foi executado neste ambiente: a instalação do navegador de teste foi bloqueada pela política de rede (`403 Domain forbidden`). Isso não equivale a uma validação em iPhone físico.
