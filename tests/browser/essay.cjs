const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const {chromium, devices} = require('/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');

const dist = path.resolve(__dirname, '../../dist');
const captures = path.resolve(__dirname, '../../work/essay-captures');
const types = {'.html':'text/html', '.css':'text/css', '.js':'text/javascript', '.mjs':'text/javascript', '.svg':'image/svg+xml', '.webp':'image/webp', '.woff':'font/woff'};
const server = http.createServer((request, response) => {
  const pathname = new URL(request.url, 'http://localhost').pathname;
  const file = path.join(dist, pathname === '/' ? 'index.html' : pathname);
  try {
    response.setHeader('Content-Type', types[path.extname(file)] || 'application/octet-stream');
    response.end(fs.readFileSync(file));
  } catch {
    response.writeHead(404);
    response.end();
  }
});

(async () => {
  const {essayCompetencies, essayTopicsForGrade} = await import('../../essay-catalog.mjs');
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = 'http://127.0.0.1:' + server.address().port;
  const user = {id:'essay-student', email:'essay@example.test'};
  const previousDraft = 'O clube de leitura da escola pode aproximar os estudantes dos livros.';
  const draft = 'O dever de casa ajuda quando dá para aplicar o que aprendemos na aula. Uma tarefa que repete as mesmas perguntas, porém, pode tomar tempo sem ajudar a entender o assunto.';
  const enemDraft = 'Muitas pessoas precisam do SUS perto de casa. Os posto de saúde podem ajudar quando os moradores conseguem marcar consultas e receber atendimento.\n\nA prefeitura deve informar os horários de forma acessível.';
  const excerpt = 'repete as mesmas perguntas';
  const review = {
    summary:'A ideia principal fica clara.',
    strengths:['Uma proposta específica.'],
    priorities:['Explique quem organizaria os encontros.'],
    competencies:Object.keys(essayCompetencies).map(id => ({id, score:null, feedback:'Explique a relação com seu argumento.', tip:'Use um exemplo.'})),
    issues:[
      {competency:'argumentacao', type:'melhoria', paragraph:1, excerpt, start:draft.indexOf(excerpt), end:draft.indexOf(excerpt) + excerpt.length,
        explanation:'O argumento identifica um problema sem um exemplo de atividade repetitiva.', suggestion:'Compare duas atividades que você conhece.', rewrite:'<img src=x onerror=alert(1)>'},
      {competency:'tema', type:'melhoria', explanation:'A conclusão pode retomar a ideia principal.', suggestion:'Finalize respondendo à pergunta sobre o dever de casa.'}
    ],
    estimate:null,
    nextStep:'Reescreva a conclusão.'
  };
  const enemExcerpt = 'Os posto';
  const scoredReview = {
    ...review,
    summary:'A redação apresenta uma ideia sobre o acesso ao SUS.',
    estimate:{total:640, assessment:'regular', reason:''},
    competencies:review.competencies.map((item, i) => ({...item, score:[160, 120, 120, 160, 80][i]})),
    issues:[
      {competency:'linguagem', type:'erro', paragraph:1, excerpt:enemExcerpt, start:enemDraft.indexOf(enemExcerpt), end:enemDraft.indexOf(enemExcerpt) + enemExcerpt.length,
        explanation:'O substantivo deve concordar com o artigo no plural.', suggestion:'Escreva o substantivo no plural.', rewrite:'Os postos'},
      {competency:'argumentacao', type:'melhoria', paragraph:1, excerpt:'Os posto de saúde', start:enemDraft.indexOf(enemExcerpt), end:enemDraft.indexOf(enemExcerpt) + 'Os posto de saúde'.length,
        explanation:'O exemplo ainda não mostra uma dificuldade de atendimento.', suggestion:'Mostre quem enfrenta essa dificuldade.'}
    ]
  };
  const browser = await chromium.launch({executablePath:'/usr/bin/chromium', args:['--no-sandbox']});
  try {
    fs.mkdirSync(captures, {recursive:true});
    const {defaultBrowserType, ...mobile} = devices['iPhone 13'];
    for (const [name, options] of [['desktop',{viewport:{width:1440,height:1050}}], ['mobile',mobile]]) {
      const context = await browser.newContext({...options, reducedMotion:'reduce'});
      await context.addInitScript(() => {
        const random = Math.random;
        Math.random = () => window.essayTestRandom ?? random();
        localStorage.setItem('missao-escola-essay-v1:visitante:ultimo-tema', 'leitura');
      });
      let sent = 0;
      let unavailable = true;
      await context.route('**/*.supabase.co/**', async route => {
        const request = route.request();
        const url = new URL(request.url());
        if (url.pathname === '/functions/v1/essay-review') {
          assert.equal(request.headers().authorization, 'Bearer student-token');
          const body = request.postDataJSON();
          const scored = body.topicId === 'enem-2026';
          assert.deepEqual(body, scored ? {topicId:'enem-2026', essay:enemDraft, grade:12} : {topicId:'dever-de-casa', essay:draft, grade:7});
          sent++;
          return route.fulfill(unavailable
            ? {status:503,json:{error:'A correção está indisponível no momento.'}}
            : {json:{review:scored ? scoredReview : review}});
        }
        if (url.pathname === '/auth/v1/token') return route.fulfill({json:{access_token:'student-token', refresh_token:'student-refresh', expires_in:3600, user}});
        if (url.pathname === '/auth/v1/user') return route.fulfill({json:user});
        if (url.pathname === '/auth/v1/logout') return route.fulfill({status:204});
        if (url.pathname === '/rest/v1/learner_backups') return route.fulfill({json:[]});
        if (url.pathname === '/rest/v1/rpc/save_learner_backup') {
          return route.fulfill({json:[{revision:1,snapshot:request.postDataJSON().p_snapshot,updated_at:new Date().toISOString()}]});
        }
        return route.fulfill({status:503,json:{error:'Unavailable in this test'}});
      });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(origin + '/#redacao');
      await page.locator('#app-splash').waitFor({state:'detached'});
      const section = page.locator('#page-redacao');
      const essayEntry = page.getByRole('button',{name:'Redação',exact:true});
      const editor = section.getByRole('textbox',{name:'Sua redação'});
      const send = section.getByRole('button',{name:'Corrigir com IA'});
      const saveGrade = async grade => {
        await page.locator('#quick-grade').selectOption(String(grade));
        await page.locator('#grade-save').click();
      };
      await section.getByRole('heading',{name:'Redação',exact:true}).waitFor();
      await section.getByRole('heading',{name:'Redação a partir do 7º ano'}).waitFor();
      assert.ok(await section.getByRole('button',{name:'Iniciar treino'}).isHidden());
      await section.getByRole('button',{name:'Informar meu ano escolar'}).click();
      await saveGrade(6);
      assert.ok(await essayEntry.isHidden());
      await page.goto(origin + '/#redacao');
      await section.getByText(/Seu perfil está no 6º ano/).waitFor();
      assert.ok(await editor.isHidden());
      await section.getByRole('button',{name:/Voltar ao estudo/}).click();
      await page.getByRole('button',{name:'Trocar ano'}).click();
      await saveGrade(12);
      await essayEntry.click();
      await section.getByText(/Temas para o 3º ano do Ensino Médio/).waitFor();
      await section.getByText('Dicas para escrever e revisar',{exact:true}).click();
      assert.ok(await section.getByRole('heading',{name:'Desenvolvimento',exact:true}).isVisible());
      await section.getByText('Dicas para escrever e revisar',{exact:true}).click();
      assert.equal(await section.getByRole('button',{name:'Todas as dificuldades'}).getAttribute('aria-pressed'), 'true');
      assert.equal(await section.locator('#essay-topic-title').textContent(), '');
      assert.ok(await editor.isHidden());
      await section.screenshot({path:path.join(captures,name + '-before-draw.png'),scale:'css'});
      await section.getByRole('button',{name:'Temas do Enem',exact:true}).click();
      assert.equal(await section.locator('#essay-topic-title').textContent(), '');
      assert.ok(await section.locator('#essay-topic-source').isHidden());
      await section.getByRole('button',{name:'Todas as dificuldades'}).click();
      await page.evaluate(() => { window.essayTestRandom = .9999; });
      await section.getByRole('button',{name:'Iniciar treino'}).click();
      assert.match(await section.getByRole('link',{name:/Ver proposta/}).getAttribute('href'), /2026/);
      assert.equal(await editor.inputValue(), '');
      await editor.fill('Rascunho independente de outro tema.');
      await page.reload();
      await page.locator('#app-splash').waitFor({state:'detached'});
      assert.equal(await editor.inputValue(), 'Rascunho independente de outro tema.');
      assert.match(await section.locator('#essay-topic-level').innerText(), /^Enem 2026/);
      await section.getByRole('button',{name:'Temas do Enem',exact:true}).click();
      const draw = section.getByRole('button',{name:'Sortear outro tema'});
      const seen = new Set([await section.locator('#essay-topic-level').innerText()]);
      await page.evaluate(() => { window.essayTestRandom = 0; });
      for (let i = 1; i < essayTopicsForGrade(12).filter(topic => topic.year).length; i++) {
        await draw.click();
        const year = await section.locator('#essay-topic-level').innerText();
        assert.match(year, /^Enem /);
        assert.ok(!seen.has(year), year + ' repetiu antes de concluir o ciclo');
        seen.add(year);
      }
      const previous = await section.locator('#essay-topic-level').innerText();
      await draw.click();
      assert.notEqual(await section.locator('#essay-topic-level').innerText(), previous);
      await section.getByRole('button',{name:/Voltar ao estudo/}).click();
      await page.getByRole('button',{name:'Trocar ano'}).click();
      await saveGrade(7);
      await essayEntry.click();
      await section.getByText(/Temas para o 7º ano do Fundamental/).waitFor();
      assert.ok(await section.getByRole('button',{name:'Temas do Enem',exact:true}).isHidden());
      assert.ok(await editor.isHidden());
      await section.getByRole('button',{name:'Para começar',exact:true}).click();
      await section.getByRole('button',{name:'Iniciar treino'}).click();
      assert.equal(await section.locator('#essay-topic-title').innerText(), 'Toda aula precisa ter dever de casa?');
      assert.equal(await editor.inputValue(), '');
      await editor.fill(draft);
      for (const topic of essayTopicsForGrade(7).filter(topic => topic.level === 'inicio').slice(1)) {
        await draw.click();
        assert.equal(await section.locator('#essay-topic-title').innerText(), topic.title);
      }
      await draw.click();
      assert.equal(await section.locator('#essay-topic-title').innerText(), 'Toda aula precisa ter dever de casa?');
      await section.getByRole('button',{name:'Prática guiada',exact:true}).click();
      await draw.click();
      await draw.click();
      assert.equal(await section.locator('#essay-topic-title').innerText(), 'As redes sociais aproximam os amigos?');
      assert.match(await section.locator('#essay-topic-level').innerText(), /Carta do leitor/);
      assert.match(await section.getByRole('link',{name:/Ver atividade de referência/}).getAttribute('href'), /sme\.goiania/);
      await page.evaluate(value => localStorage.setItem('missao-escola-essay-v1:visitante:leitura', value), previousDraft);
      await page.reload();
      await page.locator('#app-splash').waitFor({state:'detached'});
      await section.getByText('Meus rascunhos',{exact:true}).click();
      await section.getByRole('button',{name:/^Enem 2026/}).click();
      assert.equal(await editor.inputValue(), 'Rascunho independente de outro tema.');
      await page.reload();
      await page.locator('#app-splash').waitFor({state:'detached'});
      assert.equal(await editor.inputValue(), 'Rascunho independente de outro tema.');
      await section.getByText('Meus rascunhos',{exact:true}).click();
      await section.getByRole('button',{name:'Como incentivar a leitura na escola?',exact:true}).click();
      assert.equal(await editor.inputValue(), previousDraft);
      await section.getByRole('button',{name:'Toda aula precisa ter dever de casa?',exact:true}).click();
      assert.equal(await editor.inputValue(), draft);
      await page.reload();
      await page.locator('#app-splash').waitFor({state:'detached'});
      assert.equal(await editor.inputValue(), draft);
      assert.equal(sent, 0);

      for (const theme of ['light','dark']) {
        await page.evaluate(value => document.documentElement.dataset.theme = value, theme);
        assert.ok(await section.evaluate(el => el.scrollWidth <= el.clientWidth + 1));
        await page.screenshot({path:path.join(captures,name + '-' + theme + '.png'), fullPage:true, scale:'css'});
      }
      await section.getByRole('button',{name:'Entrar para corrigir'}).click();
      await page.locator('#account-form input[name=email]').fill(user.email);
      await page.locator('#account-form input[name=password]').fill('fixture-password');
      await page.locator('#account-form button[value=login]').click();
      await send.waitFor();
      assert.equal(await editor.inputValue(), draft);

      await send.click();
      await section.getByText('A correção está indisponível no momento.',{exact:true}).waitFor();
      assert.equal(await editor.inputValue(), draft);
      unavailable = false;
      await send.click();
      await section.getByRole('heading',{name:'Correção e próximos passos'}).waitFor();
      assert.equal(await section.locator('.essay-rubric details').count(), 5);
      await section.getByText('Linguagem formal',{exact:true}).click();
      assert.equal(await section.locator('#essay-feedback img').count(), 0);
      assert.match(await section.locator('.essay-rewrite').first().textContent(), /<img src=x onerror=alert\(1\)>/);
      assert.equal(await section.locator('.essay-estimate').count(), 0);
      await section.getByRole('button',{name:'Localizar apontamento 1 no texto'}).click();
      assert.equal(await section.locator('.essay-mark-active').textContent(), excerpt);
      assert.equal(await section.locator('.essay-reviewed-text').textContent(), draft);
      assert.equal(await section.getByRole('button',{name:'Localizar apontamento 2 no texto'}).count(), 0);
      assert.equal(sent, 2);
      assert.ok(await send.isDisabled());
      await editor.fill(draft + ' Acrescentei uma ideia.');
      assert.ok(await send.isEnabled());
      assert.equal(await section.locator('.essay-reviewed-text').textContent(), draft);
      await section.getByRole('button',{name:/Voltar ao estudo/}).click();
      await page.getByRole('button',{name:'Trocar ano'}).click();
      await saveGrade(12);
      await essayEntry.click();
      await section.getByRole('button',{name:'Temas do Enem',exact:true}).click();
      await page.evaluate(() => { window.essayTestRandom = .9999; });
      await section.getByRole('button',{name:'Iniciar treino'}).click();
      await editor.fill(enemDraft);
      await send.click();
      await section.getByRole('heading',{name:'Nota estimada no formato Enem'}).waitFor();
      assert.equal(await section.locator('.essay-estimate > strong').textContent(), '640 de 1.000');
      assert.deepEqual(await section.locator('.essay-competency-score').allTextContents(), ['160 / 200','120 / 200','120 / 200','160 / 200','80 / 200']);
      await section.getByRole('button',{name:'Localizar apontamento 2 no texto'}).click();
      assert.deepEqual(await section.locator('.essay-mark-active').allTextContents(), ['Os posto', ' de saúde']);
      assert.equal(await section.locator('.essay-reviewed-text').textContent(), enemDraft);
      assert.ok(await section.evaluate(el => el.scrollWidth <= el.clientWidth + 1));
      await section.screenshot({path:path.join(captures,name + '-detailed-review.png'),scale:'css'});
      assert.equal(sent, 3);
      await section.getByRole('button',{name:/Voltar ao estudo/}).click();
      await page.getByRole('button',{name:'Trocar ano'}).click();
      await saveGrade(7);
      await page.evaluate(()=>navigate('social'));
      await page.locator('.account-tools > summary').click();
      await page.getByRole('button',{name:'Sair',exact:true}).click();
      await page.evaluate(()=>navigate('redacao'));
      assert.equal(await section.locator('#essay-feedback').innerText(), '');
      assert.equal(await editor.inputValue(), draft);
      assert.deepEqual(errors, []);
      await context.close();
      console.log('PASS',name,'grade gate, source links, draft recovery, detailed feedback, highlights and estimated Enem score');
    }
  } finally {
    await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => {console.error(error);process.exitCode=1;});
