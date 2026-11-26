const {chromium}=require('/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict'),http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../../dist');
(async()=>{
 const server=http.createServer((req,res)=>{const file=path.join(root,req.url.split('?')[0]==='/'?'index.html':req.url.split('?')[0]);try{res.setHeader('Content-Type',/\.(js|mjs)$/.test(file)?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.woff')?'font/woff':file.endsWith('.webp')?'image/webp':file.endsWith('.svg')?'image/svg+xml':'text/html');res.end(fs.readFileSync(file));}catch{res.writeHead(404);res.end();}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{
  browser=await chromium.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
  const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'}),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(15000);
  await page.addInitScript(()=>localStorage.setItem('missao-escola-personal-v1',JSON.stringify({version:2,selectedGrade:7})));
  await page.goto('http://127.0.0.1:'+server.address().port);await page.waitForFunction(()=>document.querySelector('.mobile-nav [data-page="social"]'));
  await page.locator('#app-splash').waitFor({state:'detached'});
  const home=page.locator('#page-inicio');
  assert.ok(await home.isVisible());assert.equal(await home.locator('.home-study .primary-button').count(),1);
  assert.equal(await home.locator('.home-shortcuts button').count(),2);
  assert.equal(await home.locator('.home-disclosure').count(),3);
  assert.equal(await home.locator('.home-disclosure[open]').count(),0);
  assert.ok(await home.locator('.home-progress').isVisible());
  for(const selector of ['.journey-map','.streak-card','.level-card','.daily-chest','.mission-card'])assert.equal(await home.locator(selector).count(),0);
  assert.equal(await home.locator('[data-go="inicio"]').count(),0);
  assert.equal(await page.locator('.mobile-nav button').count(),8);assert.ok(await page.locator('.mobile-tools').isHidden());
  assert.equal(await home.locator('h1').innerText(),'Nenhum aluno deve ficar para trás.');
  assert.match(await home.locator('.home-mission-purpose').innerText(),/seguir na escola/);

  const snapshot=await page.evaluate(()=>JSON.stringify({progress,profile:learner.profile,routine}));
  const beforeCheckin=await page.evaluate(()=>JSON.stringify({local:{...localStorage},session:{...sessionStorage}}));
  const checkin=home.locator('#home-checkin');
  const journey=home.locator('#home-journey-details');
  await journey.locator('summary').focus();
  await page.keyboard.press('Enter');
  assert.ok(await home.locator('#home-weekly-progress').isVisible());
  assert.equal(await home.locator('#home-weekly-value').innerText(),'Sem meta');
  assert.match(await home.locator('#home-help-progress').innerText(),/Entre na sua conta/);
  assert.match(await home.locator('#home-weekly-progress').innerText(),/Monte sua rotina/);
  assert.equal(await checkin.locator('[data-home-checkin]:visible').count(),4);
  await checkin.locator('summary').click();
  assert.equal(await checkin.locator('[data-home-checkin]').count(),6);
  for(const choice of await checkin.locator('[data-home-checkin]').all()){
   await choice.click();
   assert.equal(await choice.getAttribute('aria-pressed'),'true',await choice.innerText());
   assert.ok(await checkin.locator('#home-checkin-links button').count()>0);
  }
  assert.equal(await page.evaluate(()=>JSON.stringify({local:{...localStorage},session:{...sessionStorage}})),beforeCheckin);
  await checkin.getByRole('button',{name:'Abrir Central de Oportunidades'}).click();
  const opportunities=page.locator('#page-oportunidades');
  assert.ok(await opportunities.isVisible());
  assert.equal(await opportunities.locator('a[href^="https://"]').count(),3);
  await page.locator('.side-nav [data-page="inicio"]').click();
  assert.equal(await home.locator('.home-disclosure[open]').count(),0);
  assert.ok(await checkin.locator('#home-checkin-result').isHidden());
  await page.locator('.side-nav [data-page="impacto"]').click();
  assert.ok(await page.locator('#page-impacto').isVisible());
  assert.equal(await page.locator('#page-impacto .home-resource').count(),4);
  await page.locator('.side-nav [data-page="inicio"]').click();
  const extraOption=checkin.locator('[data-home-checkin="frequencia"]');
  await checkin.locator('summary').click();
  await extraOption.click();
  await checkin.locator('summary').click();
  await page.waitForFunction(()=>document.querySelector('#home-checkin-result').hidden);
  assert.equal(await extraOption.getAttribute('aria-pressed'),'false');
  await checkin.locator('[data-home-checkin="materias"]').click();
  await checkin.getByRole('button',{name:'Ver conteúdos de recuperação'}).click();
  assert.ok(await page.locator('#library-search').isVisible());
  await page.locator('.side-nav [data-page="inicio"]').click();
  await home.locator('#home-support summary').click();
  await home.locator('[data-home-support="requests"]').click();
  assert.ok(await page.locator('#pedagogy-support').getByRole('button',{name:'Entrar ou criar conta'}).isVisible());
  await page.locator('.side-nav [data-page="inicio"]').click();
  await page.emulateMedia({reducedMotion:'no-preference'});
  await journey.locator('summary').click();
  await home.getByRole('button',{name:'Abrir Minha Jornada',exact:true}).focus();await page.keyboard.press('Enter');
  await page.waitForFunction(()=>state.page==='jornada');await page.locator('#map-art').scrollIntoViewIfNeeded();
  await page.waitForFunction(()=>document.querySelector('.journey-map').dataset.lifeState==='running');
  assert.ok(await page.locator('#journey-title').isVisible());assert.ok(await page.locator('.world-prop').count()>5);assert.equal(await page.locator('.map-checkpoint').count(),7);
  await page.locator('.map-checkpoint').nth(2).focus();await page.keyboard.press('Enter');assert.match(await page.locator('#dialog-content').innerText(),/100 XP/);await page.keyboard.press('Escape');
  await page.locator('.side-nav [data-page="inicio"]').click();
  await page.waitForFunction(()=>document.querySelector('.journey-map').dataset.lifeState==='hidden');
  await home.locator('[data-go="rotina"]').click();assert.ok(await page.locator('#page-rotina').isVisible());
  await page.locator('.side-nav [data-page="inicio"]').click();await home.locator('.home-shortcuts [data-go="oportunidades"]').click();assert.ok(await opportunities.isVisible());
  await page.locator('.side-nav [data-page="social"]').click();assert.ok(await page.locator('#account-form').isVisible());
  await page.locator('.side-nav [data-page="missoes"]').click();assert.equal(await page.locator('#all-missions .mission-card').count(),8);
  assert.equal(await page.evaluate(()=>JSON.stringify({progress,profile:learner.profile,routine})),snapshot);
  console.log('PASS institutional purpose, private optional check-in, support, opportunities and impact, plus existing journey and shortcuts');

  // Resuming must preserve a partially completed plan, even when the next recommendation differs.
  const plan=await page.evaluate(()=>{
    learner.profile=A.profileInput({name:'Ana Teste',age:13,grade:7,difficulties:[]});
    learner.plan=A.makePlan(learner,'matematica',today);learner.plan.started=true;learner.plan.reviewed=true;learner.plan.answeredIds=[learner.plan.questionIds[0]];
    saveLearner();navigate('inicio');return structuredClone(learner.plan);
  });
  await page.setViewportSize({width:390,height:844});
  await home.getByRole('button',{name:'Continuar estudo'}).click();
  assert.equal(await page.evaluate(()=>state.page),'aprendizagem');assert.deepEqual(await page.evaluate(()=>learner.plan.questionIds),plan.questionIds);assert.deepEqual(await page.evaluate(()=>learner.plan.answeredIds),plan.answeredIds);
  assert.equal(await page.locator('#tool-exercicios').isVisible(),true);assert.equal(await page.evaluate(()=>state.currentQuestion.id),plan.questionIds[1]);
  console.log('PASS current study resumes with the same subject, exercise IDs and completed steps');

  await page.setViewportSize({width:1440,height:950});
  await page.evaluate(()=>{J.award(progress,{id:'home-ui-test',date:today,xp:20,coins:0,label:'Teste',kind:'questao'});save();render();navigate('inicio');});
  assert.equal(await page.locator('#home-meta-value').innerText(),'20/20 XP');
  const goal=home.getByRole('progressbar',{name:'Meta diária de pontos de estudo'});
  assert.equal(await goal.getAttribute('aria-valuenow'),'20');
  assert.equal(await goal.getAttribute('aria-valuetext'),'Meta diária atingida');
  const beforeRewards=await page.evaluate(()=>({xp:J.xp(progress),coins:J.coins(progress)}));
  await home.locator('#home-rewards summary').click();
  await home.locator('[data-go="recompensas"]').click();
  assert.ok(await page.getByRole('heading',{name:'Missão Rewards',exact:true}).isVisible());
  assert.equal(await page.locator('#claim-chest').count(),0);
  assert.deepEqual(await page.evaluate(()=>({xp:J.xp(progress),coins:J.coins(progress)})),beforeRewards);
  await page.evaluate(()=>{
   const example=A.question(learner.plan.exampleId);
   A.observe(learner,example,false,J.shiftDay(today,-1));
   learner.planHistory=[{...learner.plan,finished:true}];
   const day=(new Date(today+'T12:00:00').getDay()+6)%7;
   const block={id:'test-block',day,start:960,end:980,subject:'matematica',level:'auto',source:'manual'};
   routine=R.load({...routine,savedAt:new Date().toISOString(),sessions:[block,{...block,id:'test-block-two',day:(day+1)%7}]});
   R.setCompleted(routine,'test-block',today);
   navigate('inicio');
  });
  await journey.locator('summary').click();
  assert.match(await home.locator('#home-study-progress').innerText(),/1 de .* questões do plano resolvidas/);
  assert.equal(await home.locator('#home-weekly-progress').innerText(),'1 de 2 blocos concluídos');
  assert.equal(await home.locator('#home-weekly-value').innerText(),'50%');
  assert.equal(await home.locator('#home-completed-value').innerText(),'1');
  assert.match(await home.locator('#home-recovery-progress').innerText(),/1 questão com revisão sugerida/);
  assert.equal(await home.locator('#home-mission-points').innerText(),'—');
  await journey.locator('summary').click();
  console.log('PASS study progress, weekly plan, content completion, recovery evidence and real rewards balance');

  await page.emulateMedia({reducedMotion:'reduce'});
  for(const width of [1440,1024,768,390,320]){
    await page.setViewportSize({width,height:950});
    for(const theme of ['light','dark']){
      if(await page.getAttribute('html','data-theme')!==theme)await page.locator('#theme-toggle').click();
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${width} ${theme} overflow`);
      const summary=home.locator('.home-progress');
      assert.ok(await summary.isVisible());
      assert.deepEqual(await summary.locator('dt').allTextContents(),['Meta diária','Sequência','XP total']);
      const displayed=await summary.locator('dd strong').allTextContents();
      const expected=await page.evaluate(()=>{
        const count=J.streak(progress,today).count;
        return ['20/20 XP',count+(count===1?' dia':' dias'),J.xp(progress)+' XP'];
      });
      assert.deepEqual(displayed,expected);
      assert.ok(await home.getByRole('button',{name:'Continuar estudo'}).isVisible());
      for(const card of await home.locator('.home-shortcuts,.home-study,.home-progress,.home-welcome,.home-details,.home-highlight,#home-checkin').all()){
        const b=await card.boundingBox();assert.ok(b.x>=0&&b.x+b.width<=width+1);
      }
      if([1440,390].includes(width)){await page.evaluate(()=>document.querySelector('#toast').classList.remove('show'));await page.screenshot({path:`/tmp/missao-home-${width}-${theme}.png`,fullPage:true});}
    }
  }
  await page.setViewportSize({width:390,height:950});await page.evaluate(()=>document.documentElement.style.fontSize='125%');
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.equal(await page.locator('.mobile-nav [data-page="social"]').getAttribute('aria-label'),'Minha conta, perfil e amigos');
  await page.locator('.mobile-menu-toggle').click();await page.locator('.mobile-nav [data-page="social"]').click();assert.ok(await page.locator('#account-form').isVisible());
  await page.setViewportSize({width:320,height:844});
  await page.evaluate(()=>document.documentElement.style.fontSize='200%');
  for(const route of ['inicio','oportunidades','impacto']){
   await page.evaluate(route=>navigate(route),route);
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),route+' overflow at 200%');
   if(route==='inicio'){
    await checkin.locator('summary').click();
    assert.equal(await checkin.locator('[data-home-checkin]:visible').count(),6);
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'check-in overflows at 200%');
    for(const disclosure of await home.locator('.home-disclosure summary').all()){
     await disclosure.click();
     assert.equal(await home.locator('.home-disclosure[open]').count(),1);
     assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'open disclosure overflows at 200%');
    }
   }
  }
  const guest=await browser.newPage({viewport:{width:390,height:844}});
  guest.on('pageerror',error=>errors.push(error.message));
  await guest.goto('http://127.0.0.1:'+server.address().port);
  await guest.locator('#app-splash').waitFor({state:'detached'});
  const welcome=await guest.locator('#home-welcome').boundingBox(),onboarding=await guest.locator('#grade-onboarding').boundingBox();
  assert.ok(welcome.y+welcome.height<=onboarding.y, 'the mission precedes the grade form for a first-time visitor');
  assert.deepEqual(errors,[]);console.log('PASS both themes, 320–1440px, 200% text, first visit, keyboard and mobile account navigation; no browser errors');
 }finally{await browser?.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
