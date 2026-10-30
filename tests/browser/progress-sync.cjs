const {chromium}=require('/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const http=require('http'),fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..');
(async()=>{
 const server=http.createServer((req,res)=>{const file=path.join(root,req.url.split('?')[0]==='/'?'index.html':req.url.split('?')[0]);try{res.setHeader('Content-Type',/\.(js|mjs)$/.test(file)?'text/javascript':file.endsWith('.css')?'text/css':'text/html');res.end(fs.readFileSync(file));}catch{res.writeHead(404);res.end();}});
 await new Promise(r=>server.listen(8128,'127.0.0.1',r));let browser;const state={cloud:{},offline:false,writes:[]};
 const read=async(page)=>page.evaluate(()=>({progress,learner,routine}));
 async function context(){const c=await browser.newContext();await c.route('https://pxnvttqsgjnakeukttdr.supabase.co/**',async route=>{
 const req=route.request(),url=req.url(),body=req.postDataJSON(),user=req.headers().authorization?.replace('Bearer token-','');
 if(url.includes('/auth/v1/token?grant_type=password')){const id=body.email.startsWith('b')?'b':'a';return route.fulfill({json:{access_token:'token-'+id,refresh_token:'refresh-'+id,expires_in:3600,user:{id,email:body.email}}});}
 if(url.includes('/auth/v1/token?grant_type=refresh_token')){const id=body.refresh_token.endsWith('b')?'b':'a';state.refreshes=(state.refreshes||0)+1;return route.fulfill({json:{access_token:'token-'+id,refresh_token:'refresh-'+id,expires_in:3600,user:{id,email:id+'@example.com'}}});}
 if(url.includes('/auth/v1/logout'))return route.fulfill({json:{}});
 if(state.offline)return route.abort();
 if(url.includes('/rest/v1/learner_backups'))return route.fulfill({json:state.cloud[user]?[state.cloud[user]]:[]});
 if(url.includes('/rest/v1/rpc/save_learner_backup')){
  const current=state.cloud[user];if(body.p_revision!==(current?.revision||0))return route.fulfill({status:409,json:{code:'40001'}});
  state.cloud[user]={revision:(current?.revision||0)+1,snapshot:body.p_snapshot,updated_at:new Date().toISOString()};state.writes.push({user,snapshot:body.p_snapshot});return route.fulfill({json:[state.cloud[user]]});
 }
 return route.fulfill({status:404,json:{message:'Unknown mock endpoint'}});
 });return c;}
 async function login(page,email='a@example.com'){await page.evaluate(()=>navigate('social'));await page.locator('#account-form [name="email"]').fill(email);await page.locator('#account-form [name="password"]').fill('test-password');await page.getByRole('button',{name:'Entrar',exact:true}).click();}
 try{
 browser=await chromium.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox']});const c=await context(),page=await c.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:8128/');
 const base=await read(page);base.learner.profile={name:'Ana da conta',age:13,grade:7,difficulties:[]};base.progress.events.push({id:'cloud-event',date:'2026-10-30',xp:60,coins:5,label:'Cloud',kind:'questao'});
 state.cloud.a={revision:1,snapshot:base,updated_at:new Date().toISOString()};
 await login(page);await page.waitForFunction(()=>learner.profile?.name==='Ana da conta');assert.equal(await page.evaluate(()=>J.xp(progress)),60);assert.ok(await page.evaluate(()=>localStorage.getItem('missao-escola-before-restore')));console.log('PASS login applies cloud profile and XP automatically, with local recovery copy');
 await page.evaluate(()=>{const stored=JSON.parse(localStorage.getItem('missao-escola-supabase-session'));stored.expires_at=0;localStorage.setItem('missao-escola-supabase-session',JSON.stringify(stored));});await page.reload();await page.waitForFunction(()=>document.querySelector('#account-sync-status')?.dataset.state==='synced');assert.equal(state.refreshes,1);assert.equal(await page.evaluate(()=>learner.profile.name),'Ana da conta');console.log('PASS expired access token refreshes before restoring synchronization');
 await page.evaluate(()=>{J.award(progress,{id:'local-earned',date:today,xp:20,coins:0,label:'Study',kind:'questao'});save();});
 await page.waitForFunction(()=>document.querySelector('#account-sync-status')?.textContent.includes('salvo automaticamente'));
 assert.equal(state.cloud.a.snapshot.progress.events.length,2);console.log('PASS progress automatically uploads after local study');
 const savedBeforePlan=state.writes.length;
 await page.evaluate(()=>{learner.plan=A.makePlan(learner,'matematica',today);learner.plan.started=true;saveLearner();learner.plan.answeredIds=[learner.plan.questionIds[0]];save();});
 assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem(PERSONAL_KEY)).plan.answeredIds[0]===learner.plan.answeredIds[0]),true);
 for(let i=0;i<50&&state.writes.length===savedBeforePlan;i++)await page.waitForTimeout(100);
 assert.ok(state.writes.length>savedBeforePlan);assert.equal(state.cloud.a.snapshot.learner.plan.answeredIds.length,1);console.log('PASS progress and learner plan persist together locally and in the cloud');
 const latest=structuredClone(state.cloud.a.snapshot);latest.learner.profile.name='Ana atualizada';state.cloud.a={revision:state.cloud.a.revision+1,snapshot:latest,updated_at:new Date().toISOString()};
 await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await page.waitForFunction(()=>learner.profile?.name==='Ana atualizada');console.log('PASS returning to the tab fetches another device latest snapshot');
 state.offline=true;await page.evaluate(()=>{J.award(progress,{id:'offline-earned',date:today,xp:10,coins:0,label:'Offline',kind:'questao'});save();});await page.waitForTimeout(1400);assert.equal(await page.evaluate(()=>J.xp(progress)),90);
 state.offline=false;await page.reload();await page.waitForFunction(()=>document.querySelector('#account-sync-status')?.textContent.includes('salvo automaticamente'));assert.ok(state.cloud.a.snapshot.progress.events.find(e=>e.id==='offline-earned'));console.log('PASS offline work survives reload and syncs without being replaced by old cloud data');
 // A clean second device receives the same authenticated snapshot.
 const cb=await context(),other=await cb.newPage();other.on('pageerror',e=>errors.push(e.message));await other.goto('http://127.0.0.1:8128/');await login(other);await other.waitForFunction(()=>J.xp(progress)===90);
 state.offline=true;await page.evaluate(()=>{J.award(progress,{id:'conflicting-local',date:today,xp:10,coins:0,label:'Local',kind:'questao'});save();});await page.waitForTimeout(1300);
 state.offline=false;await other.evaluate(()=>{J.award(progress,{id:'other-device',date:today,xp:25,coins:0,label:'Other',kind:'questao'});save();});await other.waitForFunction(()=>document.querySelector('#account-sync-status')?.textContent.includes('salvo automaticamente'));
 await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await page.waitForFunction(()=>document.querySelector('#account-sync-status')?.dataset.state==='conflict');assert.equal(await page.evaluate(()=>J.xp(progress)),100);assert.ok(!state.cloud.a.snapshot.progress.events.some(e=>e.id==='conflicting-local'));console.log('PASS simultaneous device changes pause with explicit conflict instead of overwriting');
 page.once('dialog',d=>d.accept());await page.getByRole('button',{name:'Carregar progresso da conta',exact:true}).click();await page.waitForFunction(()=>J.xp(progress)===115);console.log('PASS explicit cloud resolution loads latest revision');
 await page.getByRole('button',{name:'Sair',exact:true}).click();await login(page,'b@example.com');await page.waitForFunction(()=>document.querySelector('#account-sync-status')?.textContent.includes('salvo automaticamente'));assert.equal(await page.evaluate(()=>J.xp(progress)),0);assert.equal(state.cloud.b.snapshot.learner.profile,null);console.log('PASS switching to an empty account does not upload the prior account progress');
 assert.deepEqual(errors,[]);console.log('PASS no JavaScript errors');
 }finally{if(browser)await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
