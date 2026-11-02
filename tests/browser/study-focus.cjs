const {chromium}=require('/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict'),http=require('http'),fs=require('fs'),path=require('path');
(async()=>{
 const root=path.resolve(__dirname,'../../dist');
 const server=http.createServer((req,res)=>{const f=path.join(root,req.url.split('?')[0]==='/'?'index.html':req.url.split('?')[0]);try{res.setHeader('Content-Type',/\.(js|mjs)$/.test(f)?'text/javascript':f.endsWith('.css')?'text/css':f.endsWith('.svg')?'image/svg+xml':'text/html');res.end(fs.readFileSync(f));}catch{res.writeHead(404);res.end();}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{
  browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:'+server.address().port);await page.locator('#app-splash').waitFor({state:'detached'});
  const before=await page.evaluate(()=>JSON.stringify({progress,learner}));
  await page.locator('.side-nav [data-page="aprendizagem"]').click();
  assert.equal(await page.locator('#learning-title').innerText(),'Seu estudo de hoje');
  assert.equal(await page.locator('#subject-select').isVisible(),false);assert.equal(await page.locator('#learning-library').isVisible(),false);
  assert.equal(await page.locator('#page-aprendizagem .study-backup-tools').count(),0);
  assert.equal(await page.evaluate(()=>JSON.stringify({progress,learner})),before,'Opening the page must not create plans, XP or observations');
  await page.locator('#study-begin').click();assert.ok(await page.locator('#tool-resumo').isVisible());
  const plan=await page.evaluate(()=>structuredClone(learner.plan));assert.ok(plan.started);assert.equal(plan.reviewed,false);
  const xp=await page.evaluate(()=>J.xp(progress));
  await page.evaluate(()=>navigate('inicio'));await page.evaluate(()=>navigate('aprendizagem'));
  await page.locator('#study-begin').click();assert.equal(await page.evaluate(()=>J.xp(progress)),xp,'Resuming must not award start XP twice');
  assert.deepEqual(await page.evaluate(()=>learner.plan.questionIds),plan.questionIds);
  await page.locator('#complete-summary').click();assert.ok(await page.locator('#tool-exercicios').isVisible());
  assert.equal(await page.evaluate(()=>state.currentQuestion.id),plan.questionIds[0]);
  await page.locator(`[data-answer-index="${await page.evaluate(()=>state.currentQuestion.correct)}"]`).click();
  await page.evaluate(()=>navigate('inicio'));await page.evaluate(()=>navigate('aprendizagem'));
  await page.locator('#study-begin').click();assert.equal(await page.evaluate(()=>state.currentQuestion.id),plan.questionIds[1]);
  console.log('PASS study starts immediately, review opens practice, resume preserves IDs and awards no duplicate XP');
  while(await page.evaluate(()=>learner.plan.questionIds.some(id=>!learner.plan.answeredIds.includes(id)))){
   const correct=await page.evaluate(()=>state.currentQuestion.correct);await page.locator(`[data-answer-index="${correct}"]`).click();if(await page.locator('#info-dialog').isVisible())await page.keyboard.press('Escape');await page.locator('#new-exercise').click();
  }
  assert.equal((await page.locator('#study-begin').textContent()).replace(/\s+/g,' ').trim(),'Concluir estudo →');await page.locator('#study-begin').click();assert.ok(await page.evaluate(()=>learner.plan.finished));if(await page.locator('#info-dialog').isVisible())await page.keyboard.press('Escape');
  assert.equal((await page.locator('#study-begin').textContent()).replace(/\s+/g,' ').trim(),'Começar novo estudo →');console.log('PASS completion remains explicit and preserves the original rewards flow');
  const persisted=await page.evaluate(()=>structuredClone(learner.plan));await page.reload();await page.locator('#app-splash').waitFor({state:'detached'});await page.evaluate(()=>navigate('aprendizagem'));
  assert.deepEqual(await page.evaluate(()=>structuredClone(learner.plan)),persisted);
  for(const [width,height] of [[1440,1000],[390,844],[320,700]]){
   await page.setViewportSize({width,height});
   for(const theme of ['light','dark']){
    if(await page.getAttribute('html','data-theme')!==theme)await page.locator('#theme-toggle').click();await page.evaluate(()=>window.scrollTo(0,0));
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    const b=await page.locator('#study-begin').boundingBox();assert.ok(b.y+b.height<height,`Primary action must be visible without scrolling: ${width}x${height}, y=${b.y}, height=${b.height}`);
    if(width!==320)await page.screenshot({path:`/tmp/study-focus-${width}-${theme}.png`});
   }
  }
  await page.locator('.study-option>summary').filter({hasText:'Trocar matéria'}).click();assert.ok(await page.locator('#subject-select').isVisible());
  const nextSubject=await page.locator('#subject-select option').nth(1).getAttribute('value');await page.locator('#subject-select').selectOption(nextSubject);assert.equal(await page.evaluate(()=>state.subject),nextSubject);
  assert.ok(await page.locator('#study-begin').isVisible());assert.deepEqual(errors,[]);
  console.log('PASS reload, alternate subjects, both themes and primary action visible at 320–1440px');
 }finally{await browser?.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
