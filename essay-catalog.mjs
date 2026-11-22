export const essayLimits = { min: 120, max: 5000 };

export const essayLevels = {
  inicio: 'Para começar',
  pratica: 'Prática guiada',
  enem: 'Temas do Enem'
};

export function canUseEssay(grade) {
  return Number.isInteger(grade) && grade >= 7 && grade <= 12;
}

export const essayCompetencies = {
  linguagem: 'Linguagem formal',
  tema: 'Tema e tipo de texto',
  argumentacao: 'Argumentação',
  coesao: 'Coesão',
  intervencao: 'Proposta de intervenção'
};

const prova = year => 'https://www.gov.br/inep/pt-br/areas-de-atuacao/avaliacao-e-exames-educacionais/enem/provas-e-gabaritos/' + year;

// Keep the original wording and IDs for students whose drafts already use these prompts.
const previousEssayTopics = [
  { id: 'leitura', level: 'inicio', title: 'Como incentivar a leitura na escola?', guide: 'Defenda uma ideia simples, explique por que ela ajudaria e dê um exemplo do cotidiano escolar.' },
  { id: 'patio', level: 'inicio', title: 'Como melhorar o convívio no recreio?', guide: 'Escolha uma situação comum e proponha uma medida que alunos e escola possam colocar em prática.' },
  { id: 'celular', level: 'inicio', title: 'O celular ajuda ou atrapalha na hora de estudar?', guide: 'Escolha uma posição e explique em quais situações o celular pode ser útil ou prejudicial.' },
  { id: 'desperdicio', level: 'pratica', title: 'Como reduzir o desperdício de alimentos na escola?', guide: 'Apresente uma causa, explique uma consequência e sugira uma ação viável indicando quem poderia realizá-la.' },
  { id: 'internet', level: 'pratica', title: 'O papel da escola no combate à desinformação digital', guide: 'Formule uma tese e desenvolva dois argumentos. Pense em como ensinar a verificar fontes e em quais barreiras dificultam esse trabalho.' }
];

export const essayTopics = [
  {
    id: 'dever-de-casa', level: 'inicio', grades: [7, 8],
    title: 'Toda aula precisa ter dever de casa?',
    guide: 'Diga quando o dever ajuda a aprender e quando pode virar só mais uma tarefa. Use um exemplo para defender sua opinião.'
  },
  {
    id: 'trabalho-em-grupo', level: 'inicio', grades: [7, 8],
    title: 'Como dividir um trabalho em grupo de um jeito justo?',
    guide: 'Imagine que cada colega tem uma habilidade diferente. Explique como você dividiria as tarefas e o que faria se alguém tivesse dificuldade de participar.'
  },
  {
    id: 'errar-em-aula', level: 'inicio', grades: [7],
    title: 'O que a turma pode fazer para que ninguém tenha medo de errar?',
    guide: 'Pense em alguém que quer responder a uma pergunta, mas fica calado por medo de virar piada. Explique o que poderia mudar nessa situação e por quê.'
  },
  {
    id: 'notificacao-no-estudo', level: 'inicio', grades: [8, 9],
    title: 'Vale a pena silenciar o celular na hora de estudar?',
    guide: 'Compare duas situações: receber mensagens enquanto estuda e conferir tudo depois. Defenda a escolha que faria e explique quando abriria uma exceção.'
  },
  {
    id: 'comida-no-prato', level: 'inicio', grades: [7, 8],
    title: 'Escolher quanto colocar no prato ajuda a evitar desperdício?',
    guide: 'Imagine a hora da merenda. Pense no que pode acontecer se todos receberem a mesma porção ou puderem escolher o quanto querem comer.'
  },
  {
    id: 'lugares-do-bairro', level: 'inicio', grades: [7, 8],
    title: 'O que faria mais diferença para os jovens no seu bairro?',
    guide: 'Pense em algo que você gostaria de ter por perto, como uma praça, uma quadra ou uma biblioteca. Escolha uma ideia e explique quem se beneficiaria e por quê.'
  },
  {
    id: 'nota-e-aprendizado', level: 'inicio', grades: [9, 10],
    title: 'Uma nota mostra tudo o que um aluno aprendeu?',
    guide: 'Imagine dois alunos com a mesma nota que aprenderam coisas diferentes. Use um exemplo para explicar o que a nota mostra e o que pode ficar de fora.'
  },
  {
    id: 'mensagens-de-grupo', level: 'pratica', grades: [8, 9],
    title: 'De quem é a responsabilidade quando um boato se espalha em um grupo de mensagens?',
    guide: 'Compare o papel de quem criou o boato com o de quem compartilhou a mensagem. Explique como os participantes do grupo poderiam evitar que ela se espalhasse.'
  },
  {
    id: 'ia-no-trabalho-escolar', level: 'pratica', grades: [9, 10],
    title: 'Até onde vale usar inteligência artificial nos trabalhos da escola?',
    guide: 'Compare pedir ajuda para entender um assunto e entregar uma resposta pronta. Defenda um limite para o uso da ferramenta e explique como ele ajudaria a turma a aprender.'
  },
  {
    id: 'uniforme-escolar', level: 'pratica', grades: [8, 9],
    title: 'O uniforme escolar deveria ser obrigatório?',
    guide: 'Considere o custo para as famílias e a liberdade de escolher a roupa. Defenda sua posição e responda a um argumento de quem pensa diferente.'
  },
  {
    id: 'transporte-escolar', level: 'pratica', grades: [9, 10],
    title: 'Como o caminho até a escola pode atrapalhar os estudos?',
    guide: 'Compare a rotina de quem mora perto com a de quem demora para chegar. Explique como o deslocamento afeta o dia do aluno e proponha uma medida indicando quem poderia realizá-la.'
  },
  {
    id: 'esporte-para-todos', level: 'pratica', grades: [7, 8],
    title: 'Como fazer mais alunos participarem dos esportes na escola?',
    guide: 'Considere por que alunos com experiências ou habilidades diferentes podem participar menos. Proponha uma mudança que ajude a incluí-los e explique como ela funcionaria.'
  },
  {
    id: 'carta-redes', level: 'pratica', grades: [7], genre: 'Carta do leitor',
    source: 'https://sme.goiania.go.gov.br/conexaoescola/ensino_fundamental/lingua-portuguesa-producao-de-texto-em-rede/',
    title: 'As redes sociais aproximam os amigos?',
    guide: 'Imagine que o jornal da escola publicou uma matéria sobre jovens e redes sociais. Escreva à redação do jornal, diga como você vê o assunto e use um exemplo para explicar sua opinião. Termine com uma despedida.'
  },
  {
    id: 'carta-biblioteca', level: 'pratica', grades: [7], genre: 'Carta de solicitação',
    source: 'https://novaescola.org.br/planos-de-aula/fundamental/7ano/lingua-portuguesa/carta-e-outros-textos-de-solicitacao/3184',
    title: 'A biblioteca da escola deveria abrir no recreio?',
    guide: 'Escreva para a direção. Faça um pedido sobre o horário da biblioteca, explique como ele ajudaria a turma e diga como a escola poderia colocá-lo em prática.'
  },
  {
    id: 'telas-e-caderno', level: 'pratica', grades: [8], genre: 'Artigo de opinião',
    source: 'https://sme.goiania.go.gov.br/conexaoescola/ensino_fundamental/lingua-portuguesa-2/',
    title: 'Quando vale trocar o caderno por uma tela?',
    guide: 'Escreva para o jornal da escola. Defenda quando usar telas em sala faz sentido, dê um exemplo e responda a uma objeção de quem discorda.'
  },
  {
    id: 'lixo-no-bairro', level: 'pratica', grades: [9], genre: 'Artigo de opinião',
    source: 'https://goias.gov.br/educacao/wp-content/uploads/sites/40/2024/MaterialDidatico/MarcoAbril/PortuguesMatematica/REVISAGOIAS9ANOLPEMATMARCO_ABRIL_ESTUDANTE.pdf',
    title: 'De quem é a responsabilidade pelo lixo no bairro?',
    guide: 'Escreva para um jornal local. Defenda como moradores e prefeitura deveriam dividir a responsabilidade, explique um obstáculo e sustente sua posição com um exemplo.'
  },
  {
    id: 'celular-como-ferramenta', level: 'pratica', grades: [10], genre: 'Artigo de opinião',
    source: 'https://goias.gov.br/educacao/wp-content/uploads/sites/40/2026/02/REVISA-GOIAS-1a-SERIE-LP-E-MAT-1o-BIMESTRE-2026_ESTUDANTE.pdf',
    title: 'Qual deve ser o papel do celular nas aulas?',
    guide: 'Escreva para o mural da escola. Defenda uma regra de uso pedagógico, sustente a ideia com um exemplo e responda a uma objeção sobre distração ou acesso aos aparelhos.'
  },
  {
    id: 'livros-para-jovens', level: 'inicio', grades: [10, 11], genre: 'Texto argumentativo',
    title: 'O que faria mais jovens usarem a biblioteca do bairro?',
    guide: 'Escolha uma mudança e defenda sua prioridade. Considere o que hoje pode afastar os jovens e explique como o público seria alcançado.'
  },
  {
    id: 'noticias-no-feed', level: 'inicio', grades: [11, 12], genre: 'Texto argumentativo',
    title: 'O que muda quando recebemos notícias só pelas redes sociais?',
    guide: 'Defenda uma tese sobre como o feed afeta o que sabemos. Compare duas formas de se informar e explique uma consequência dessa diferença.'
  },
  {
    id: 'escolha-profissional', level: 'inicio', grades: [12], genre: 'Texto argumentativo',
    title: 'Todo jovem tem as mesmas chances de escolher uma profissão?',
    guide: 'Compare as possibilidades de dois jovens com condições diferentes de tempo, renda ou acesso a orientação. Explique como essas condições influenciam a escolha.'
  },
  {
    id: 'trabalho-por-aplicativo', level: 'pratica', grades: [11, 12], genre: 'Texto dissertativo-argumentativo',
    title: 'Trabalhar por aplicativo dá mais liberdade?',
    guide: 'Defenda uma tese considerando flexibilidade, renda e proteção no trabalho. Compare a perspectiva de quem oferece o serviço com a de quem usa o aplicativo.'
  },
  {
    id: 'pressao-para-crescer', level: 'pratica', grades: [11], genre: 'Texto dissertativo-argumentativo',
    source: 'https://goias.gov.br/educacao/wp-content/uploads/sites/40/2025/10/REDACAO-NOTA-1000_ESTUDANTE_SETEMBRO-2025.pdf',
    title: 'Quem pode reduzir a pressão para que crianças pareçam adultas nas redes?',
    guide: 'Explique como conteúdos e publicidade podem alimentar essa pressão. Discuta responsabilidades de famílias e plataformas e proponha uma medida coerente com seu argumento.'
  },
  {
    id: 'situacao-de-rua', level: 'pratica', grades: [12], genre: 'Texto dissertativo-argumentativo',
    source: 'https://goias.gov.br/educacao/wp-content/uploads/sites/40/2025/10/REDACAO-NOTA-1000_ESTUDANTE_OUTUBRO-2025.pdf',
    title: 'O que dificulta a saída da situação de rua no Brasil?',
    guide: 'Defenda uma tese relacionando o acesso à moradia a outro obstáculo, como emprego ou documentação. Proponha uma ação, indique quem a executaria e explique como ela ajudaria.'
  },
  // 7º ano
  {
    id: 'recreio-com-chuva', level: 'inicio', grades: [7], genre: 'Parágrafo de opinião',
    title: 'O que fazer no recreio quando chove?',
    guide: 'Escolha uma atividade que caiba em um espaço coberto. Explique sua escolha e dê um exemplo de como colegas com gostos diferentes poderiam participar.'
  },
  {
    id: 'livro-de-escolha', level: 'inicio', grades: [7], genre: 'Parágrafo de opinião',
    title: 'Cada aluno deveria poder escolher seu livro de leitura?',
    guide: 'Compare ler o mesmo livro que a turma e escolher um título por conta própria. Defenda uma opção com um exemplo.'
  },
  {
    id: 'dividir-quadra', level: 'inicio', grades: [7], genre: 'Parágrafo de opinião',
    title: 'Como dividir a quadra no recreio de um jeito justo?',
    guide: 'Imagine que duas turmas querem usar a quadra no mesmo horário. Proponha um combinado e explique como ele funcionaria em um dia comum.'
  },
  {
    id: 'plantas-na-escola', level: 'inicio', grades: [7], genre: 'Parágrafo de opinião',
    title: 'Onde faria mais diferença plantar uma árvore na escola?',
    guide: 'Escolha um lugar, diga o que mudaria ali e explique quem poderia aproveitar essa mudança.'
  },
  {
    id: 'carta-faixa-escola', level: 'pratica', grades: [7], genre: 'Carta de solicitação',
    title: 'Como deixar a travessia em frente à escola mais segura?',
    guide: 'Escreva ao órgão de trânsito do município. Descreva uma situação da entrada ou da saída, faça um pedido claro e explique a quem ele ajudaria.'
  },
  {
    id: 'troca-de-materiais', level: 'pratica', grades: [7], genre: 'Texto de proposta',
    title: 'Uma feira de trocas de materiais escolares funcionaria na sua turma?',
    guide: 'Escreva uma proposta para a turma. Explique o que poderia ser trocado, como organizar a participação e o que fazer com os materiais que sobrarem.'
  },
  {
    id: 'carta-brinquedos-praca', level: 'pratica', grades: [7], genre: 'Carta do leitor',
    title: 'O que uma praça precisa para acolher crianças de idades diferentes?',
    guide: 'Responda a uma notícia de jornal fictícia sobre a reforma da praça. Apresente uma prioridade, dê um exemplo e encerre a carta com uma sugestão.'
  },
  {
    id: 'economizar-agua-escola', level: 'pratica', grades: [7], genre: 'Texto de proposta',
    title: 'Qual seria o primeiro passo para economizar água na escola?',
    guide: 'Escolha um lugar em que a água é usada, como a cozinha ou o banheiro. Explique uma causa do desperdício e apresente uma medida que a comunidade escolar consiga testar.'
  },
  // 8º ano
  {
    id: 'torcida-e-respeito', level: 'inicio', grades: [8], genre: 'Texto de opinião',
    title: 'Como torcer sem desrespeitar quem joga?',
    guide: 'Use um exemplo de jogo na escola ou no bairro. Explique quando uma brincadeira deixa de animar a partida e começa a prejudicá-la.'
  },
  {
    id: 'passeio-escolar', level: 'inicio', grades: [8], genre: 'Texto de opinião',
    title: 'O que faz um passeio escolar valer a pena?',
    guide: 'Escolha um destino que a turma poderia visitar. Explique o que se aprende lá e mencione uma dificuldade que a escola precisaria considerar.'
  },
  {
    id: 'memoria-do-bairro', level: 'inicio', grades: [8], genre: 'Texto de opinião',
    title: 'Vale a pena guardar fotos antigas do bairro?',
    guide: 'Imagine comparar uma rua de hoje com uma foto de muitos anos atrás. Dê um exemplo do que a comparação poderia ensinar e defenda sua opinião.'
  },
  {
    id: 'animais-na-praca', level: 'inicio', grades: [8], genre: 'Texto de opinião',
    title: 'Praças deveriam ter um espaço para cães correrem soltos?',
    guide: 'Considere os donos de cães e as pessoas que usam a praça para brincar ou caminhar. Defenda sua posição com uma situação concreta.'
  },
  {
    id: 'musica-na-escola', level: 'pratica', grades: [8], genre: 'Artigo de opinião',
    title: 'A escola deveria ter mais espaço para atividades de música?',
    guide: 'Escreva para o jornal da turma. Apresente um benefício, responda a uma objeção sobre tempo ou custo e explique como a escola poderia começar.'
  },
  {
    id: 'rampa-e-acesso', level: 'pratica', grades: [8], genre: 'Carta de solicitação',
    title: 'Como tornar a escola mais fácil de circular?',
    guide: 'Escolha um obstáculo em um espaço da escola, como uma entrada ou corredor. Escreva à direção explicando quem é afetado e que mudança deveria vir primeiro.'
  },
  {
    id: 'resenha-filme-convivio', level: 'pratica', grades: [8], genre: 'Resenha crítica',
    title: 'Que filme vale recomendar para conversar sobre amizade?',
    guide: 'Escolha um filme que você conhece. Apresente a história sem contar o final, comente uma cena que mostra como os personagens lidam com uma amizade e justifique sua recomendação.'
  },
  {
    id: 'emprestar-em-vez-de-comprar', level: 'pratica', grades: [8], genre: 'Artigo de opinião',
    title: 'O que poderia ser emprestado em vez de comprado?',
    guide: 'Escolha algo que as pessoas usam pouco, como uma ferramenta ou um jogo. Compare vantagens e dificuldades de compartilhar esse objeto e defenda uma regra para o empréstimo.'
  },
  // 9º ano
  {
    id: 'noticia-e-fonte', level: 'inicio', grades: [9], genre: 'Texto de opinião',
    title: 'O que faz uma notícia parecer confiável?',
    guide: 'Imagine duas publicações sobre o mesmo fato. Explique quais pistas você usaria para decidir em qual confiar e por que elas importam.'
  },
  {
    id: 'consertar-ou-trocar', level: 'inicio', grades: [9], genre: 'Texto de opinião',
    title: 'Quando vale consertar algo em vez de comprar outro?',
    guide: 'Escolha um objeto comum e compare o que pesaria na decisão. Considere custo, tempo ou vida útil para defender sua escolha.'
  },
  {
    id: 'feira-de-ciencias-aberta', level: 'inicio', grades: [9], genre: 'Texto de opinião',
    title: 'A feira de ciências da escola deveria ser aberta ao bairro?',
    guide: 'Imagine o que mudaria para quem apresenta e para quem visita. Defenda sua posição com um benefício e uma dificuldade.'
  },
  {
    id: 'opinioes-em-publico', level: 'inicio', grades: [9], genre: 'Texto de opinião',
    title: 'É mais fácil mudar de ideia numa conversa ou numa discussão online?',
    guide: 'Compare as duas situações. Use um exemplo para mostrar como a reação das outras pessoas pode tornar mais fácil ou difícil rever uma opinião.'
  },
  {
    id: 'compras-com-influenciadores', level: 'pratica', grades: [9], genre: 'Artigo de opinião',
    title: 'Como saber se uma recomendação de influenciador é propaganda?',
    guide: 'Defenda o que deveria ficar claro em uma publicação patrocinada. Considere a responsabilidade de quem anuncia e explique como um consumidor pode checar a recomendação.'
  },
  {
    id: 'descarte-de-eletronicos', level: 'pratica', grades: [9], genre: 'Artigo de opinião',
    title: 'Quem deve facilitar o descarte de eletrônicos usados?',
    guide: 'Compare o papel de consumidores, lojas e prefeitura. Defenda a medida que resolveria primeiro um obstáculo, como a distância até um ponto de coleta.'
  },
  {
    id: 'transporte-e-bicicleta', level: 'pratica', grades: [9], genre: 'Artigo de opinião',
    title: 'O que faria mais pessoas irem de bicicleta à escola?',
    guide: 'Imagine o caminho de dois estudantes com trajetos diferentes. Defenda uma mudança na escola ou na rua e explique a quem ela beneficiaria e quais limites teria.'
  },
  {
    id: 'alunos-e-regras', level: 'pratica', grades: [9], genre: 'Artigo de opinião',
    title: 'Os alunos deveriam decidir parte das regras da escola?',
    guide: 'Escolha uma regra do cotidiano escolar. Defenda como os alunos deveriam participar da decisão e responda a uma objeção sobre responsabilidade ou segurança.'
  },
  // 1º ano do Ensino Médio
  {
    id: 'planejar-gastos', level: 'inicio', grades: [10], genre: 'Texto argumentativo',
    title: 'A escola deveria ensinar os alunos a planejar seus gastos?',
    guide: 'Defenda uma posição e use um exemplo de decisão que um adolescente pode tomar. Explique o que a escola poderia ensinar nessa situação.'
  },
  {
    id: 'jovens-museus', level: 'inicio', grades: [10], genre: 'Texto argumentativo',
    title: 'O que faria mais jovens visitarem museus?',
    guide: 'Escolha uma barreira, como o preço, o trajeto ou a sensação de que o museu não fala com esse público. Defenda uma mudança e explique como ela ajudaria.'
  },
  {
    id: 'trabalho-e-tempo-de-estudo', level: 'inicio', grades: [10], genre: 'Texto argumentativo',
    title: 'Como estudar e trabalhar pode mudar a rotina de um jovem?',
    guide: 'Compare duas rotinas possíveis. Explique um efeito sobre a aprendizagem e defenda um apoio que faria diferença.'
  },
  {
    id: 'estudo-em-lugar-publico', level: 'inicio', grades: [10], genre: 'Texto argumentativo',
    title: 'Ter um lugar tranquilo para estudar é só uma questão de organização?',
    guide: 'Compare as condições de dois estudantes, como ruído, acesso à internet e tempo. Explique por que uma dessas condições pesa mais em seu argumento.'
  },
  {
    id: 'legenda-e-acesso', level: 'pratica', grades: [10], genre: 'Artigo de opinião',
    title: 'Por que incluir legendas nos vídeos da escola e da prefeitura?',
    guide: 'Defenda uma posição para um jornal local. Explique quem se beneficia das legendas, responda a uma objeção prática e indique por onde começar.'
  },
  {
    id: 'centro-bairro-cultura', level: 'pratica', grades: [10], genre: 'Artigo de opinião',
    title: 'Os eventos culturais da cidade deveriam circular pelos bairros?',
    guide: 'Compare o acesso de quem mora perto e de quem mora longe dos espaços culturais. Defenda um modelo de programação e responda a uma objeção sobre estrutura ou custo.'
  },
  {
    id: 'roupa-barata', level: 'pratica', grades: [10], genre: 'Texto dissertativo-argumentativo',
    title: 'Que custos ficam fora da etiqueta de uma roupa muito barata?',
    guide: 'Explique como preço, duração da peça, descarte ou condições de trabalho podem afetar a decisão de compra. Defenda uma medida que considere o orçamento das famílias.'
  },
  {
    id: 'tempo-sem-barulho', level: 'pratica', grades: [10], genre: 'Artigo de opinião',
    title: 'Como conciliar festas de bairro com o descanso dos moradores?',
    guide: 'Defenda uma regra de convivência. Considere o papel das festas para a comunidade e o efeito do barulho sobre quem mora perto.'
  },
  // 2º ano do Ensino Médio
  {
    id: 'fila-e-agendamento', level: 'inicio', grades: [11], genre: 'Texto argumentativo',
    title: 'Todo serviço público deveria poder ser agendado pela internet?',
    guide: 'Compare as necessidades de quem ganha tempo com o agendamento digital e de quem tem dificuldade para usá-lo. Defenda uma forma de atender os dois públicos.'
  },
  {
    id: 'calor-e-sombra', level: 'inicio', grades: [11], genre: 'Texto argumentativo',
    title: 'Por que alguns bairros sentem mais calor do que outros?',
    guide: 'Compare duas ruas com quantidades diferentes de sombra, vegetação ou asfalto. Explique um efeito sobre a vida dos moradores e defenda uma prioridade para melhorar o bairro.'
  },
  {
    id: 'preco-e-comida', level: 'inicio', grades: [11], genre: 'Texto argumentativo',
    title: 'O que pesa mais na escolha do que comer?',
    guide: 'Compare dois fatores, como preço, tempo de preparo e o que se encontra perto de casa. Use um exemplo para defender qual pesa mais em uma situação específica.'
  },
  {
    id: 'memoria-e-nomes', level: 'inicio', grades: [11], genre: 'Texto argumentativo',
    title: 'O que os nomes das ruas contam sobre a história de uma cidade?',
    guide: 'Escolha um exemplo real ou imaginado. Explique o que o nome permite lembrar e defenda um critério para escolher novos homenageados.'
  },
  {
    id: 'dados-em-aplicativos', level: 'pratica', grades: [11], genre: 'Texto dissertativo-argumentativo',
    title: 'De quais dados um aplicativo realmente precisa para funcionar?',
    guide: 'Escolha um tipo de aplicativo e compare dados necessários ao serviço com informações coletadas para outras finalidades. Defenda um limite e explique como comunicá-lo ao usuário.'
  },
  {
    id: 'aluguel-e-vida-no-bairro', level: 'pratica', grades: [11], genre: 'Texto dissertativo-argumentativo',
    title: 'Como a alta dos aluguéis muda a vida de um bairro?',
    guide: 'Relacione a mudança no preço à permanência de moradores ou comércios. Considere interesses diferentes e avalie uma medida para reduzir um dos efeitos que você discutiu.'
  },
  {
    id: 'feiras-e-alimentos', level: 'pratica', grades: [11], genre: 'Texto dissertativo-argumentativo',
    title: 'Feiras de bairro podem melhorar o acesso a alimentos frescos?',
    guide: 'Explique como localização, preços e horários afetam quem consegue comprar. Defenda uma ação de apoio e indique o que ela resolveria e qual dificuldade ainda precisaria ser enfrentada.'
  },
  {
    id: 'voto-na-escola', level: 'pratica', grades: [11], genre: 'Artigo de opinião',
    title: 'O que faz uma eleição de grêmio representar bem os alunos?',
    guide: 'Compare duas formas de ampliar a participação, como debates ou horários de votação mais acessíveis. Defenda uma prioridade e explique como avaliar se funcionou.'
  },
  // 3º ano do Ensino Médio
  {
    id: 'caminho-ate-faculdade', level: 'inicio', grades: [12], genre: 'Texto argumentativo',
    title: 'O que ajuda um estudante a permanecer na faculdade depois de entrar?',
    guide: 'Escolha uma dificuldade, como deslocamento, custo ou adaptação acadêmica. Explique por que ela pode pesar e defenda uma forma de apoio.'
  },
  {
    id: 'criadores-e-cultura-local', level: 'inicio', grades: [12], genre: 'Texto argumentativo',
    title: 'O que ajuda artistas locais a chegar a novos públicos?',
    guide: 'Compare dois caminhos, como eventos públicos ou divulgação pela internet. Defenda qual funcionaria melhor em uma situação e explique o alcance e os limites dele.'
  },
  {
    id: 'tempo-de-deslocamento', level: 'inicio', grades: [12], genre: 'Texto argumentativo',
    title: 'Como o tempo no transporte muda o que uma pessoa pode fazer no dia?',
    guide: 'Compare rotinas com tempos de deslocamento diferentes. Defenda uma tese sobre como a distância afeta o acesso ao trabalho, ao lazer ou à educação.'
  },
  {
    id: 'consumo-e-publicidade', level: 'inicio', grades: [12], genre: 'Texto argumentativo',
    title: 'Por que algumas compras parecem urgentes?',
    guide: 'Escolha um exemplo de anúncio, como uma promoção com contagem regressiva. Explique o que a estratégia provoca e defenda um critério para avaliar a compra.'
  },
  {
    id: 'alertas-de-enchente', level: 'pratica', grades: [12], genre: 'Texto dissertativo-argumentativo',
    title: 'Como fazer alertas de enchente chegarem a quem precisa?',
    guide: 'Discuta duas barreiras à comunicação de risco, como sinal de celular, horário ou clareza da mensagem. Defenda uma medida com responsáveis e meios adequados ao público.'
  },
  {
    id: 'golpes-digitais-acesso', level: 'pratica', grades: [12], genre: 'Texto dissertativo-argumentativo',
    title: 'Como prevenir golpes digitais sem dificultar o acesso a serviços online?',
    guide: 'Compare duas medidas de proteção, como alertas ou verificação adicional. Explique como cada medida afetaria públicos diferentes e proponha uma ação que equilibre segurança e acesso.'
  },
  {
    id: 'esporte-feminino-visibilidade', level: 'pratica', grades: [12], genre: 'Texto dissertativo-argumentativo',
    title: 'O que pode ampliar a visibilidade do esporte feminino no Brasil?',
    guide: 'Relacione cobertura da imprensa, oportunidades de formação ou patrocínio. Articule uma proposta de ação coerente com a causa que você considerar central.'
  },
  {
    id: 'acesso-a-documentos-digitais', level: 'pratica', grades: [12], genre: 'Texto dissertativo-argumentativo',
    title: 'Quando digitalizar um serviço torna mais difícil exercer um direito?',
    guide: 'Escolha um serviço e analise como conexão, acesso a aparelhos ou letramento digital afetam quem depende dele. Proponha uma forma de atendimento e indique quem a implementaria.'
  },
  {
    id: 'enem-2015', level: 'enem', year: 2015, genre: 'Texto dissertativo-argumentativo',
    source: 'https://download.inep.gov.br/educacao_basica/enem/provas/2015/2015_PV_impresso_D2_CD6.pdf',
    title: 'A persistência da violência contra a mulher na sociedade brasileira',
    guide: 'Explique por que a violência persiste. Relacione suas causas a obstáculos à prevenção ou ao atendimento e proponha uma intervenção que enfrente um deles.'
  },
  {
    id: 'enem-2016', level: 'enem', year: 2016, genre: 'Texto dissertativo-argumentativo',
    source: prova(2016),
    title: 'Caminhos para combater a intolerância religiosa no Brasil',
    guide: 'Abra um caderno do segundo dia da aplicação regular. Discuta por que o direito à liberdade religiosa nem sempre é respeitado e proponha uma medida ligada às causas analisadas.'
  },
  {
    id: 'enem-2017', level: 'enem', year: 2017, genre: 'Texto dissertativo-argumentativo',
    source: 'https://download.inep.gov.br/educacao_basica/enem/provas/2017/2017_PV_impresso_D1_CD3.pdf',
    title: 'Desafios para a formação educacional de surdos no Brasil',
    guide: 'Discuta barreiras que afetam o acesso à educação e a aprendizagem de estudantes surdos. Proponha uma ação que respeite suas necessidades linguísticas.'
  },
  {
    id: 'enem-2018', level: 'enem', year: 2018, genre: 'Texto dissertativo-argumentativo',
    source: 'https://download.inep.gov.br/educacao_basica/enem/provas/2018/2018_PV_impresso_D1_CD3.pdf',
    title: 'Manipulação do comportamento do usuário pelo controle de dados na internet',
    guide: 'Explique como o uso de dados pode influenciar o que as pessoas veem e fazem online. Discuta um efeito sobre a autonomia e proponha uma forma de enfrentá-lo.'
  },
  {
    id: 'enem-2019', level: 'enem', year: 2019, genre: 'Texto dissertativo-argumentativo',
    source: 'https://download.inep.gov.br/educacao_basica/enem/provas/2019/caderno_de_questoes_1_dia_caderno_1_azul_aplicacao_regular.pdf',
    title: 'Democratização do acesso ao cinema no Brasil',
    guide: 'Discuta quais barreiras, como preço ou distância, limitam o acesso ao cinema. Proponha uma intervenção para o público mais afetado pela barreira que você analisou.'
  },
  {
    id: 'enem-2020', level: 'enem', year: 2020, genre: 'Texto dissertativo-argumentativo',
    source: 'https://download.inep.gov.br/enem/provas_e_gabaritos/2020_PV_impresso_D1_CD1.pdf',
    title: 'O estigma associado às doenças mentais na sociedade brasileira',
    guide: 'Analise como preconceitos sobre saúde mental afetam a convivência ou a busca por apoio. Proponha uma intervenção que combata o estigma e respeite a dignidade das pessoas.'
  },
  {
    id: 'enem-2021', level: 'enem', year: 2021, genre: 'Texto dissertativo-argumentativo',
    source: 'https://download.inep.gov.br/enem/provas_e_gabaritos/2021_PV_impresso_D1_CD2.pdf',
    title: 'Invisibilidade e registro civil: garantia de acesso à cidadania no Brasil',
    guide: 'Relacione a falta de registro civil a dificuldades no acesso a direitos. Analise um obstáculo à obtenção do documento e proponha uma intervenção com responsáveis e meios claros.'
  },
  { id: 'enem-2022', level: 'enem', year: 2022, source: prova(2022), title: 'Desafios para a valorização de comunidades e povos tradicionais no Brasil', guide: 'Leia os textos motivadores da prova e formule uma intervenção que respeite os direitos humanos e a autonomia das comunidades.' },
  { id: 'enem-2023', level: 'enem', year: 2023, source: 'https://download.inep.gov.br/enem/provas_e_gabaritos/tema_redacao_2023.pdf', title: 'Desafios para o enfrentamento da invisibilidade do trabalho de cuidado realizado pela mulher no Brasil', guide: 'Explore a relação entre a divisão do trabalho de cuidado e sua pouca visibilidade social. Use seus próprios argumentos.' },
  { id: 'enem-2024', level: 'enem', year: 2024, source: prova(2024), title: 'Desafios para a valorização da herança africana no Brasil', guide: 'Considere como diferentes instituições podem valorizar a herança africana. Evite afirmações genéricas sem explicação.' },
  { id: 'enem-2025', level: 'enem', year: 2025, source: prova(2025), title: 'Perspectivas acerca do envelhecimento na sociedade brasileira', guide: 'Delimite o aspecto do envelhecimento que sua tese vai defender. Relacione suas propostas aos obstáculos discutidos no texto.' },
  { id: 'enem-2026', level: 'enem', year: 2026, genre: 'Texto dissertativo-argumentativo', source: prova(2026), title: 'A valorização do Sistema Único de Saúde (SUS) como direito universal', guide: 'Leia os textos motivadores do primeiro dia de prova. Defenda uma tese sobre a valorização do SUS e proponha uma ação ligada aos obstáculos que você discutiu.' }
];

export const allEssayTopics = [...essayTopics, ...previousEssayTopics];

export function essayTopicsForGrade(grade) {
  if (!canUseEssay(grade)) return [];
  return essayTopics.filter(topic => topic.year ? grade >= 10 : topic.grades.includes(grade));
}
