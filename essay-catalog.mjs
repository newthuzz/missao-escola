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

export const essayTopics = [
  { id: 'leitura', level: 'inicio', title: 'Como incentivar a leitura na escola?', guide: 'Defenda uma ideia simples, explique por que ela ajudaria e dê um exemplo do cotidiano escolar.' },
  { id: 'patio', level: 'inicio', title: 'Como melhorar o convívio no recreio?', guide: 'Escolha uma situação comum e proponha uma medida que alunos e escola possam colocar em prática.' },
  { id: 'celular', level: 'inicio', title: 'O celular ajuda ou atrapalha na hora de estudar?', guide: 'Escolha uma posição e explique em quais situações o celular pode ser útil ou prejudicial.' },
  { id: 'desperdicio', level: 'pratica', title: 'Como reduzir o desperdício de alimentos na escola?', guide: 'Apresente uma causa, explique uma consequência e sugira uma ação viável indicando quem poderia realizá-la.' },
  { id: 'internet', level: 'pratica', title: 'O papel da escola no combate à desinformação digital', guide: 'Formule uma tese e desenvolva dois argumentos. Pense em como ensinar a verificar fontes e em quais barreiras dificultam esse trabalho.' },
  { id: 'enem-2022', level: 'enem', year: 2022, source: prova(2022), title: 'Desafios para a valorização de comunidades e povos tradicionais no Brasil', guide: 'Leia os textos motivadores da prova e formule uma intervenção que respeite os direitos humanos e a autonomia das comunidades.' },
  { id: 'enem-2023', level: 'enem', year: 2023, source: 'https://download.inep.gov.br/enem/provas_e_gabaritos/tema_redacao_2023.pdf', title: 'Desafios para o enfrentamento da invisibilidade do trabalho de cuidado realizado pela mulher no Brasil', guide: 'Explore a relação entre a divisão do trabalho de cuidado e sua pouca visibilidade social. Use seus próprios argumentos.' },
  { id: 'enem-2024', level: 'enem', year: 2024, source: prova(2024), title: 'Desafios para a valorização da herança africana no Brasil', guide: 'Considere como diferentes instituições podem valorizar a herança africana. Evite afirmações genéricas sem explicação.' },
  { id: 'enem-2025', level: 'enem', year: 2025, source: prova(2025), title: 'Perspectivas acerca do envelhecimento na sociedade brasileira', guide: 'Delimite o aspecto do envelhecimento que sua tese vai defender. Relacione suas propostas aos obstáculos discutidos no texto.' }
];
