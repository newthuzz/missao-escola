const {chromium}=require('/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict'),http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../../dist');
(async()=>{
 const server=http.createServer((req,res)=>{const file=path.join(root,req.url.split('?')[0]==='/'?'index.html':req.url.split('?')[0]);try{res.setHeader('Content-Type',/\.(js|mjs)$/.test(file)?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.woff')?'font/woff':file.endsWith('.webp')?'image/webp':'text/html');res.end(fs.readFileSync(file));}catch{res.writeHead(404);res.end();}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{
  browser=await chromium.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(15000);
  await page.goto('http://127.0.0.1:'+server.address().port);await page.waitForFunction(()=>document.querySelector('.mobile-nav [data-page="social"]'));
  const home=page.locator('#page-inicio');
  assert.ok(await home.isVisible());assert.equal(await home.locator('.primary-button').count(),1);assert.equal(await home.locator('.central-system-card').count(),3);
  for(const selector of ['.journey-map','.streak-card','.level-card','.daily-chest','.mission-card'])assert.equal(await home.locator(selector).count(),0);
  assert.equal(await home.locator('[data-go="inicio"]').count(),0);
  assert.equal(await page.locator('.mobile-nav button').count(),6);assert.ok(await page.locator('.mobile-tools').isHidden());
  const snapshot=await page.evaluate(()=>JSON.stringify({progress,profile:learner.profile,routine}));
  await home.locator('[data-go="jornada"]').focus();await page.keyboard.press('Enter');
  await page.waitForFunction(()=>state.page==='jornada');await page.locator('#map-art').scrollIntoViewIfNeeded();
  await page.waitForFunction(()=>document.querySelector('.journey-map').dataset.lifeState==='running');
  assert.ok(await page.locator('#journey-title').isVisible());assert.ok(await page.locator('.world-prop').count()>5);assert.equal(await page.locator('.map-checkpoint').count(),7);
  await page.locator('.map-checkpoint').nth(2).focus();await page.keyboard.press('Enter');assert.match(await page.locator('#dialog-content').innerText(),/100 XP/);await page.keyboard.press('Escape');
  await page.locator('.side-nav [data-page="inicio"]').click();
  await page.waitForFunction(()=>document.querySelector('.journey-map').dataset.lifeState==='hidden');
  await home.locator('[data-go="rotina"]').click();assert.ok(await page.locator('#page-rotina').isVisible());
  await page.locator('.side-nav [data-page="inicio"]').click();await home.locator('[data-go="social"]').click();assert.ok(await page.locator('#account-form').isVisible());
  await page.locator('.side-nav [data-page="inicio"]').click();await home.locator('[data-go="missoes"]').click();assert.equal(await page.locator('#all-missions .mission-card').count(),8);
  assert.equal(await page.evaluate(()=>JSON.stringify({progress,profile:learner.profile,routine})),snapshot);
  console.log('PASS quiet home, one study action, three systems, account access and no progress mutation from navigation');

  // Resuming must preserve a partially completed plan, even when the next recommendation differs.
  const plan=await page.evaluate(()=>{
    learner.profile=A.profileInput({name:'Ana Teste',age:13,grade:7,difficulties:[]});
    learner.plan=A.makePlan(learner,'matematica',today);learner.plan.started=true;learner.plan.answeredIds=[learner.plan.questionIds[0]];
    saveLearner();navigate('inicio');return structuredClone(learner.plan);
  });
  await home.getByRole('button',{name:'Continuar estudo'}).click();
  assert.equal(await page.evaluate(()=>state.page),'aprendizagem');assert.deepEqual(await page.evaluate(()=>learner.plan),plan);
  assert.equal(await page.locator('#tool-recuperacao').isVisible(),true);
  console.log('PASS current study resumes with the same subject, exercise IDs and completed steps');

  await page.evaluate(()=>{J.award(progress,{id:'home-ui-test',date:today,xp:20,coins:0,label:'Teste',kind:'questao'});save();render();navigate('inicio');});
  assert.match(await page.locator('#home-daily-summary').innerText(),/Meta de hoje concluída/);assert.equal(await page.locator('#home-daily-progress').getAttribute('aria-valuenow'),'20');
  const beforeChest=await page.evaluate(()=>({xp:J.xp(progress),coins:J.coins(progress),day:J.dayXP(progress,today)}));
  await home.locator('[data-go="recompensas"]').click();assert.ok(await page.locator('#claim-chest').isVisible());await page.locator('#claim-chest').click();assert.ok(await page.locator('#claim-chest').isDisabled());
  const afterChest=await page.evaluate(()=>({xp:J.xp(progress),coins:J.coins(progress),day:J.dayXP(progress,today)}));
  assert.equal(afterChest.xp,beforeChest.xp+5);assert.equal(afterChest.coins,beforeChest.coins+10);assert.equal(afterChest.day,beforeChest.day);
  await page.evaluate(()=>navigate('inicio'));console.log('PASS daily goal stays current and the relocated chest keeps its original reward rules');

  for(const width of [1440,1024,768,390,320]){
    await page.setViewportSize({width,height:950});
    for(const theme of ['light','dark']){
      if(await page.getAttribute('html','data-theme')!==theme)await page.locator('#theme-toggle').click();
      await page.evaluate(()=>Promise.allSettled(document.querySelector('#page-inicio').getAnimations({subtree:true}).filter(a=>a.effect.getTiming().iterations!==Infinity).map(a=>a.finished)));
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${width} ${theme} overflow`);
      for(const card of await home.locator('.central-system-card,.home-study').all()){
        const b=await card.boundingBox();assert.ok(b.x>=0&&b.x+b.width<=width+1);
      }
      if([1440,390].includes(width)){await page.evaluate(()=>document.querySelector('#toast').classList.remove('show'));await page.screenshot({path:`/tmp/missao-home-${width}-${theme}.png`,fullPage:true});}
    }
  }
  await page.setViewportSize({width:390,height:950});await page.evaluate(()=>document.documentElement.style.fontSize='125%');
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.equal(await page.locator('.mobile-nav [data-page="social"]').getAttribute('aria-label'),'Conta, amigos e liga');
  await page.locator('.mobile-nav [data-page="social"]').click();assert.ok(await page.locator('#account-form').isVisible());
  assert.deepEqual(errors,[]);console.log('PASS both themes, 320–1440px, larger type, keyboard and mobile account navigation; no browser errors');
 }finally{await browser?.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
