export const essayLimits = { min: 120, max: 5000 };

export const essayLevels = {
  inicio: 'Para começar',
  pratica: 'Prática guiada',
  enem: 'Temas do Enem'
};

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
    id: 'dever-de-casa', level: 'inicio',
    title: 'Toda aula precisa ter dever de casa?',
    guide: 'Diga quando o dever ajuda a aprender e quando pode virar só mais uma tarefa. Use um exemplo para defender sua opinião.'
  },
  {
    id: 'trabalho-em-grupo', level: 'inicio',
    title: 'Como dividir um trabalho em grupo de um jeito justo?',
    guide: 'Imagine que cada colega tem uma habilidade diferente. Explique como você dividiria as tarefas e o que faria se alguém tivesse dificuldade de participar.'
  },
  {
    id: 'errar-em-aula', level: 'inicio',
    title: 'O que a turma pode fazer para que ninguém tenha medo de errar?',
    guide: 'Pense em alguém que quer responder a uma pergunta, mas fica calado por medo de virar piada. Explique o que poderia mudar nessa situação e por quê.'
  },
  {
    id: 'notificacao-no-estudo', level: 'inicio',
    title: 'Vale a pena silenciar o celular na hora de estudar?',
    guide: 'Compare duas situações: receber mensagens enquanto estuda e conferir tudo depois. Defenda a escolha que faria e explique quando abriria uma exceção.'
  },
  {
    id: 'comida-no-prato', level: 'inicio',
    title: 'Escolher quanto colocar no prato ajuda a evitar desperdício?',
    guide: 'Imagine a hora da merenda. Pense no que pode acontecer se todos receberem a mesma porção ou puderem escolher o quanto querem comer.'
  },
  {
    id: 'lugares-do-bairro', level: 'inicio',
    title: 'O que faria mais diferença para os jovens no seu bairro?',
    guide: 'Pense em algo que você gostaria de ter por perto, como uma praça, uma quadra ou uma biblioteca. Escolha uma ideia e explique quem se beneficiaria e por quê.'
  },
  {
    id: 'nota-e-aprendizado', level: 'inicio',
    title: 'Uma nota mostra tudo o que um aluno aprendeu?',
    guide: 'Imagine dois alunos com a mesma nota que aprenderam coisas diferentes. Use um exemplo para explicar o que a nota mostra e o que pode ficar de fora.'
  },
  {
    id: 'mensagens-de-grupo', level: 'pratica',
    title: 'De quem é a responsabilidade quando um boato se espalha em um grupo de mensagens?',
    guide: 'Compare o papel de quem criou o boato com o de quem compartilhou a mensagem. Explique como os participantes do grupo poderiam evitar que ela se espalhasse.'
  },
  {
    id: 'ia-no-trabalho-escolar', level: 'pratica',
    title: 'Até onde vale usar inteligência artificial nos trabalhos da escola?',
    guide: 'Compare pedir ajuda para entender um assunto e entregar uma resposta pronta. Defenda um limite para o uso da ferramenta e explique como ele ajudaria a turma a aprender.'
  },
  {
    id: 'uniforme-escolar', level: 'pratica',
    title: 'O uniforme escolar deveria ser obrigatório?',
    guide: 'Considere o custo para as famílias e a liberdade de escolher a roupa. Defenda sua posição e responda a um argumento de quem pensa diferente.'
  },
  {
    id: 'transporte-escolar', level: 'pratica',
    title: 'Como o caminho até a escola pode atrapalhar os estudos?',
    guide: 'Compare a rotina de quem mora perto com a de quem demora para chegar. Explique como o deslocamento afeta o dia do aluno e proponha uma medida indicando quem poderia realizá-la.'
  },
  {
    id: 'esporte-para-todos', level: 'pratica',
    title: 'Como fazer mais alunos participarem dos esportes na escola?',
    guide: 'Considere por que alunos com experiências ou habilidades diferentes podem participar menos. Proponha uma mudança que ajude a incluí-los e explique como ela funcionaria.'
  },
  { id: 'enem-2022', level: 'enem', year: 2022, source: prova(2022), title: 'Desafios para a valorização de comunidades e povos tradicionais no Brasil', guide: 'Leia os textos motivadores da prova e formule uma intervenção que respeite os direitos humanos e a autonomia das comunidades.' },
  { id: 'enem-2023', level: 'enem', year: 2023, source: 'https://download.inep.gov.br/enem/provas_e_gabaritos/tema_redacao_2023.pdf', title: 'Desafios para o enfrentamento da invisibilidade do trabalho de cuidado realizado pela mulher no Brasil', guide: 'Explore a relação entre a divisão do trabalho de cuidado e sua pouca visibilidade social. Use seus próprios argumentos.' },
  { id: 'enem-2024', level: 'enem', year: 2024, source: prova(2024), title: 'Desafios para a valorização da herança africana no Brasil', guide: 'Considere como diferentes instituições podem valorizar a herança africana. Evite afirmações genéricas sem explicação.' },
  { id: 'enem-2025', level: 'enem', year: 2025, source: prova(2025), title: 'Perspectivas acerca do envelhecimento na sociedade brasileira', guide: 'Delimite o aspecto do envelhecimento que sua tese vai defender. Relacione suas propostas aos obstáculos discutidos no texto.' }
];

export const allEssayTopics = [...essayTopics, ...previousEssayTopics];
