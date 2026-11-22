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
  const {essayCompetencies} = await import('../../essay-catalog.mjs');
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = 'http://127.0.0.1:' + server.address().port;
  const user = {id:'essay-student', email:'essay@example.test'};
  const draft = 'O clube de leitura da escola pode aproximar os estudantes dos livros. No recreio, os participantes podem compartilhar histórias e ajudar os colegas a escolher novas leituras.';
  const review = {
    summary:'A ideia principal fica clara.',
    strengths:['Uma proposta específica.'],
    priorities:['Explique quem organizaria os encontros.'],
    competencies:Object.keys(essayCompetencies).map(id => ({id, feedback:'Explique a relação com seu argumento.', tip:'Use um exemplo.', excerpt:'<img src=x onerror=alert(1)>'})),
    nextStep:'Reescreva a conclusão.'
  };
  const browser = await chromium.launch({executablePath:'/usr/bin/chromium', args:['--no-sandbox']});
  try {
    fs.mkdirSync(captures, {recursive:true});
    const {defaultBrowserType, ...mobile} = devices['iPhone 13'];
    for (const [name, options] of [['desktop',{viewport:{width:1440,height:1050}}], ['mobile',mobile]]) {
      const context = await browser.newContext({...options, reducedMotion:'reduce'});
      let sent = 0;
      let unavailable = true;
      await context.route('**/*.supabase.co/**', async route => {
        const request = route.request();
        const url = new URL(request.url());
        if (url.pathname === '/functions/v1/essay-review') {
          assert.equal(request.headers().authorization, 'Bearer student-token');
          assert.deepEqual(request.postDataJSON(), {topicId:'leitura', essay:draft});
          sent++;
          return route.fulfill(unavailable
            ? {status:503,json:{error:'A correção está indisponível no momento.'}}
            : {json:{review}});
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
      await page.goto(origin + '/#aprendizagem');
      await page.locator('#app-splash').waitFor({state:'detached'});
      await page.getByRole('button',{name:'Redação',exact:true}).click();
      const section = page.locator('#page-redacao');
      const editor = section.getByRole('textbox',{name:'Sua redação'});
      const send = section.getByRole('button',{name:'Corrigir com IA'});
      await section.getByRole('heading',{name:'Redação',exact:true}).waitFor();
      await section.getByText('Dicas para escrever e revisar',{exact:true}).click();
      assert.ok(await section.getByRole('heading',{name:'Desenvolvimento',exact:true}).isVisible());
      await section.getByText('Dicas para escrever e revisar',{exact:true}).click();
      await editor.fill(draft);
      await section.getByRole('button',{name:'Temas do Enem',exact:true}).click();
      await section.getByRole('button',{name:/^Enem 2025/}).click();
      assert.match(await section.getByRole('link',{name:/Ver proposta/}).getAttribute('href'), /2025/);
      assert.equal(await editor.inputValue(), '');
      await editor.fill('Rascunho independente de outro tema.');
      await page.reload();
      await page.locator('#app-splash').waitFor({state:'detached'});
      assert.equal(await editor.inputValue(), 'Rascunho independente de outro tema.');
      assert.equal(await section.locator('#essay-topic-level').innerText(), 'Enem 2025');
      await section.getByRole('button',{name:'Para começar',exact:true}).click();
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
      assert.equal(await section.locator('.essay-rubric img').count(), 0);
      assert.equal(await section.locator('.essay-rubric blockquote').first().textContent(), '<img src=x onerror=alert(1)>');
      assert.equal(sent, 2);
      assert.ok(await send.isDisabled());
      await editor.fill(draft + ' Acrescentei uma ideia.');
      assert.ok(await send.isEnabled());
      await page.evaluate(()=>navigate('social'));
      await page.locator('.account-tools summary').click();
      await page.getByRole('button',{name:'Sair',exact:true}).click();
      await page.evaluate(()=>navigate('redacao'));
      assert.equal(await section.locator('#essay-feedback').innerText(), '');
      assert.equal(await editor.inputValue(), draft);
      assert.deepEqual(errors, []);
      await context.close();
      console.log('PASS',name,'entry point, guide, Enem links, draft, login, correction, safe feedback, retry and account isolation');
    }
  } finally {
    await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => {console.error(error);process.exitCode=1;});
