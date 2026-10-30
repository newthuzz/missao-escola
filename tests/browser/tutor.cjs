const {chromium}=require('/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict'),http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../../dist');
const A='00000000-0000-4000-8000-000000000001',B='00000000-0000-4000-8000-000000000002',C='00000000-0000-4000-8000-000000000010';
(async()=>{
 const server=http.createServer((req,res)=>{const file=path.join(root,req.url.split('?')[0]==='/'?'index.html':req.url.split('?')[0]);try{res.setHeader('Content-Type',/\.(js|mjs)$/.test(file)?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.woff2')?'font/woff2':file.endsWith('.woff')?'font/woff':'text/html');res.end(fs.readFileSync(file));}catch{res.writeHead(404);res.end();}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;let browser;
 try{
  browser=await chromium.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
  const context=await browser.newContext({viewport:{width:1440,height:1000}});
  await context.addInitScript(({id})=>localStorage.setItem('missao-escola-supabase-session',JSON.stringify({access_token:'token-a',refresh_token:'refresh-a',expires_at:Date.now()/1000+3600,user:{id,email:'a@example.test'}})),{id:A});
  await context.route('https://pxnvttqsgjnakeukttdr.supabase.co/**',async route=>{
   const req=route.request(),url=req.url();
   if(url.includes('/learner_backups'))return route.fulfill({json:[]});
   if(url.includes('/save_learner_backup'))return route.fulfill({json:[{revision:1,snapshot:req.postDataJSON().p_snapshot,updated_at:new Date().toISOString()}]});
   if(url.includes('/social_action'))return route.fulfill({json:{registered:false}});
   return route.fulfill({json:{}});
  });
  const calls=[],state={delay:false,fail:false,release:null,history:false,legacy:false};
  await context.route('**/functions/v1/quick-endpoint',async route=>{
   const req=route.request();if(req.method()==='OPTIONS')return route.fulfill({status:204,headers:{'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'authorization,apikey,content-type','Access-Control-Allow-Methods':'POST,OPTIONS'}});
   const body=req.postDataJSON();calls.push({body,auth:req.headers().authorization});
   if(body.op==='state'&&state.legacy)return route.fulfill({headers:{'Access-Control-Allow-Origin':origin},status:400,json:{error:'Mensagem inválida'}});
   if(body.op==='state')return route.fulfill({headers:{'Access-Control-Allow-Origin':origin},json:{conversation:state.history&&body.conversationId?{id:C,context:{title:'Conversa anterior'}}:null,messages:state.history&&body.conversationId?[{seq:body.beforeSeq?1:41,role:'assistant',content:body.beforeSeq?'Mensagem mais antiga':'Explicação anterior privada'}]:[],hasMore:Boolean(state.history&&body.conversationId&&!body.beforeSeq),conversations:state.history?[{id:C,title:'Conversa anterior',updated_at:new Date().toISOString()}]:[],available:true,protocol:2}});
   if(body.op==='delete')return route.fulfill({headers:{'Access-Control-Allow-Origin':origin},json:{deleted:true}});
   if(state.delay)await new Promise(resolve=>state.release=resolve);
   try{
    if(state.fail)return await route.fulfill({headers:{'Access-Control-Allow-Origin':origin},status:503,json:{error:'Modelo indisponível. Tente novamente.'}});
    return await route.fulfill({headers:{'Access-Control-Allow-Origin':origin},contentType:'text/event-stream',body:'event: start\ndata: '+JSON.stringify({conversationId:C,requestId:body.requestId,context:body.context})+'\n\nevent: delta\ndata: '+JSON.stringify({text:'Explicação da IA: '})+'\n\nevent: done\ndata: '+JSON.stringify({conversationId:C,requestId:body.requestId,context:body.context,text:'Explicação da IA: \\(\\frac{1}{2} + \\frac{1}{2} = 1\\). <img src=x onerror=alert(1)>',checks:[]})+'\n\n'});
   }catch{} // An intentionally cancelled old context must never render.
  });
  const page=await context.newPage(),errors=[],assets=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>assets.push(r.url()));page.setDefaultTimeout(15000);
  await page.goto(origin);await page.waitForFunction(()=>document.querySelector('#page-social'));
  assert.ok(!assets.some(u=>u.endsWith('/tutor-ui.js')||u.includes('/katex/')));
  await page.locator('#tutor-launcher').click();await page.locator('#tutor-message').waitFor({state:'visible'});
  await page.waitForFunction(()=>document.querySelector('#tutor-status').textContent.includes('sem escolher'));
  assert.ok(assets.some(u=>u.endsWith('/tutor-ui.js')));assert.ok(!assets.some(u=>u.includes('/katex/')));
  const field=page.locator('#tutor-message');await field.fill('Se um poema tivesse apenas pausas, ainda poderia ter ritmo?');await field.press('Shift+Enter');await field.type('Quero entender.');
  assert.match(await field.inputValue(),/\n/);await field.press('Enter');
  await page.waitForFunction(()=>document.querySelector('#tutor-status').textContent.includes('Resposta disponível'));
  await page.locator('.tutor-message-body .katex').waitFor();
  assert.equal(await page.locator('.tutor-message img').count(),0);
  assert.ok(calls.some(c=>c.body.op==='send'&&c.body.message.includes('poema')));
  assert.ok(calls.filter(c=>c.body.op==='send').every(c=>c.body.context.exerciseId===null));
  console.log('PASS lazy chat/math, arbitrary text, Shift+Enter/Enter, native stream handling, safe text rendering and formulas');
  await page.locator('#tutor-minimize').click();assert.ok(await page.locator('#tutor-panel').isHidden());
  await page.locator('#tutor-launcher').click();assert.match(await page.locator('#tutor-messages').innerText(),/Explicação da IA/);
  console.log('PASS minimizing and reopening preserves the ongoing conversation');
  await page.evaluate(()=>{navigate('aprendizagem');selectTool('exercicios');renderQuestion();});
  await page.waitForFunction(()=>document.querySelector('#tutor-context').innerText.includes(state.currentQuestion.question));
  const question=await page.evaluate(()=>state.currentQuestion.id);state.delay=true;
  await field.fill('Pq essa conta deu isso?');await field.press('Enter');
  await page.waitForTimeout(100);assert.equal((await page.evaluate(()=>state.helped)),true);
  assert.equal(calls.filter(c=>c.body.op==='send').at(-1).body.context.exerciseId,question);
  const sent=calls.filter(c=>c.body.op==='send').length;await field.fill('Não enviar duas vezes');await field.press('Enter');assert.equal(calls.filter(c=>c.body.op==='send').length,sent);
  await page.evaluate(()=>nextQuestion());
  await page.waitForFunction(id=>state.currentQuestion.id!==id,question);await page.waitForTimeout(50);state.release();state.delay=false;
  await page.waitForTimeout(150);assert.ok(!(await page.locator('#tutor-messages').innerText()).includes('Pq essa conta'));
  assert.ok(!(await page.locator('#tutor-messages').innerText()).includes('Explicação da IA'));
  console.log('PASS current exercise ID/version, helped-attempt flag, duplicate prevention and cancellation on question switch');
  state.fail=true;await field.fill('Não entendi, explica de outro jeito.');await field.press('Enter');await page.locator('#tutor-retry').waitFor({state:'visible'});
  assert.match(await page.locator('#tutor-status').innerText(),/indisponível/);const failedId=calls.filter(c=>c.body.op==='send').at(-1).body.requestId;
  state.fail=false;await page.locator('#tutor-retry').click();await page.waitForFunction(()=>document.querySelector('#tutor-status').textContent.includes('Resposta disponível'));
  assert.equal(calls.filter(c=>c.body.op==='send').at(-1).body.requestId,failedId);
  console.log('PASS unavailable-model error and retry with same idempotency key');
  state.delay=true;await field.fill('Pergunta privada da conta A');await field.press('Enter');await page.waitForTimeout(100);
  await page.evaluate(({id})=>{const value=JSON.stringify({access_token:'token-b',refresh_token:'refresh-b',expires_at:Date.now()/1000+3600,user:{id,email:'b@example.test'}});localStorage.setItem('missao-escola-supabase-session',value);window.dispatchEvent(new StorageEvent('storage',{key:'missao-escola-supabase-session',newValue:value}));},{id:B});
  await page.waitForTimeout(100);state.release();state.delay=false;await page.waitForTimeout(100);
  assert.ok(!(await page.locator('#tutor-messages').innerText()).includes('conta A'));assert.ok(!(await page.locator('#tutor-messages').innerText()).includes('Explicação da IA'));
  console.log('PASS account switch clears drafts/history and suppresses late responses');
  state.legacy=true;await page.evaluate(()=>navigate('inicio'));await page.locator('#tutor-retry').waitFor({state:'visible'});assert.ok(await page.locator('#tutor-send').isDisabled());
  const beforeLegacySend=calls.filter(c=>c.body.op==='send').length;await field.fill('Não gastar com endpoint antigo');await field.press('Enter');assert.equal(calls.filter(c=>c.body.op==='send').length,beforeLegacySend);
  state.legacy=false;await page.locator('#tutor-retry').click();await page.waitForFunction(()=>!document.querySelector('#tutor-send').disabled);console.log('PASS old backend cannot trigger paid generations before protocol upgrade');
  state.history=true;await page.locator('#tutor-minimize').click();await page.locator('#tutor-launcher').click();await page.waitForFunction(()=>document.querySelector('#tutor-history').options.length>1);
  await page.locator('#tutor-history').selectOption(C);await page.waitForFunction(()=>document.querySelector('#tutor-context').textContent.includes('Somente leitura'));
  assert.ok(await field.isDisabled());assert.match(await page.locator('#tutor-messages').innerText(),/anterior privada/);
  await page.locator('#tutor-older').click();await page.waitForFunction(()=>document.querySelector('#tutor-messages').textContent.includes('Mensagem mais antiga'));assert.match(await page.locator('#tutor-messages').innerText(),/anterior privada/);assert.ok(await page.locator('#tutor-older').isHidden());
  await page.locator('#tutor-history').selectOption('');await page.waitForFunction(()=>!document.querySelector('#tutor-message').disabled);
  console.log('PASS previous conversations can be consulted without sending to the wrong exercise');
  for(const [width,height] of [[390,844],[390,600],[844,390]]){
   await page.setViewportSize({width,height});const bounds=await page.locator('#tutor-panel').boundingBox();assert.ok(bounds.x>=0&&bounds.x+bounds.width<=width+1);
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   await page.locator('#tutor-send').scrollIntoViewIfNeeded();const sendBox=await page.locator('#tutor-send').boundingBox();assert.ok(sendBox.y>=0&&sendBox.y+sendBox.height<=height);
   if(width<=760){const dock=await page.locator('#tutor-launcher').boundingBox(),nav=await page.locator('.mobile-nav').boundingBox();assert.ok(dock.y+dock.height<nav.y);}
  }
  await page.setViewportSize({width:390,height:844});await page.screenshot({path:'/tmp/missao-tutor-mobile.png'});
  await page.locator('#tutor-message').focus();await page.keyboard.press('Escape');assert.ok(await page.locator('#tutor-panel').isHidden());
  assert.deepEqual(errors,[]);console.log('PASS responsive panel, Escape, no browser errors. Provider responses were mocked; semantic quality was not tested.');
 }finally{await browser?.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
