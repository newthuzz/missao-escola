const {chromium}=require('/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict'),http=require('http'),fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'../..');
(async()=>{const server=http.createServer((req,res)=>{const f=path.join(root,req.url.split('?')[0]==='/'?'index.html':req.url.split('?')[0]);try{res.setHeader('Content-Type',f.endsWith('.css')?'text/css':/\.(js|mjs)$/.test(f)?'text/javascript':'text/html');res.end(fs.readFileSync(f));}catch{res.writeHead(404);res.end();}});await new Promise(r=>server.listen(8130,'127.0.0.1',r));let browser;
try{browser=await chromium.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox','--enable-features=WebContentsForceDark']});
 async function verify(page,theme){
  assert.equal(await page.getAttribute('html','data-theme'),theme);
  assert.equal(await page.locator('meta[name="color-scheme"]').getAttribute('content'),'only '+theme);
  assert.equal(await page.locator('#theme-toggle').getAttribute('aria-pressed'),String(theme==='dark'));
  assert.match(await page.locator('#theme-toggle').getAttribute('aria-label'),theme==='dark'?/claro/:/escuro/);
  assert.equal(await page.evaluate(()=>getComputedStyle(document.body).backgroundColor),theme==='dark'?'rgb(16, 27, 48)':'rgb(247, 250, 248)');
 }
 for(const scenario of ['normal','local-blocked','both-blocked','local-readonly']){
  const c=await browser.newContext({colorScheme:'dark'});
  await c.addInitScript(scenario=>{
   if(scenario==='local-blocked'||scenario==='both-blocked')Object.defineProperty(window,'localStorage',{get(){throw new DOMException('Blocked','SecurityError');}});
   if(scenario==='both-blocked')Object.defineProperty(window,'sessionStorage',{get(){throw new DOMException('Blocked','SecurityError');}});
   if(scenario==='local-readonly'){
    const original=Storage.prototype.setItem;original.call(window.localStorage,'missao-escola-theme','light');Storage.prototype.setItem=function(k,v){if(this===window.localStorage)throw new DOMException('Read only','QuotaExceededError');return original.call(this,k,v);};
   }
  },scenario);
  const p=await c.newPage();await p.goto('http://127.0.0.1:8130/');await verify(p,'light');
  for(let i=0;i<4;i++){await p.locator('#theme-toggle span').last().click();await verify(p,i%2===0?'dark':'light');}
  await p.locator('#theme-toggle').click();await verify(p,'dark');await p.reload();await verify(p,scenario==='both-blocked'?'light':'dark');
  console.log('PASS',scenario,'toggle and reload semantics');await c.close();
 }
 const c=await browser.newContext(),a=await c.newPage(),b=await c.newPage();await a.goto('http://127.0.0.1:8130/');await b.goto('http://127.0.0.1:8130/');await a.locator('#theme-toggle').click();await b.waitForFunction(()=>document.documentElement.dataset.theme==='dark');await verify(b,'dark');console.log('PASS theme updates across tabs');
 // Theme is usable even if later brand/study scripts fail to download.
 const isolated=await browser.newContext();await isolated.route('**/study-ui.js',r=>r.abort());await isolated.route('**/brand.js',r=>r.abort());const p=await isolated.newPage();await p.goto('http://127.0.0.1:8130/');await p.locator('#theme-toggle').click();await verify(p,'dark');console.log('PASS theme independent of study and brand scripts');
 await p.locator('#theme-toggle').focus();await p.keyboard.press('Enter');await verify(p,'light');await p.keyboard.press('Space');await verify(p,'dark');console.log('PASS keyboard interaction');
 await p.evaluate(()=>window.dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true})));await verify(p,'dark');console.log('PASS page restoration keeps theme');
 console.log('PASS Chromium with system dark preference and automatic-darkening feature flag. Native Opera GX was not executed.');
}finally{if(browser)await browser.close();server.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
