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
