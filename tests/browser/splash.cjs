const {chromium}=require('/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict'),http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../../dist');
(async()=>{
 const server=http.createServer((req,res)=>{
  const file=path.join(root,req.url.split('?')[0]==='/'?'index.html':req.url.split('?')[0]);
  try{res.setHeader('Content-Type',/\.(js|mjs)$/.test(file)?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.svg')?'image/svg+xml':file.endsWith('.woff')?'font/woff':'application/octet-stream');
   if(file.endsWith('.html'))res.setHeader('Content-Type','text/html');res.end(fs.readFileSync(file));
  }catch{res.writeHead(404);res.end();}
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{
  browser=await chromium.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
  for(const scenario of ['public','authenticated','expired','offline','slow-auth','slow-resources','mobile','reduced','slow-cpu']){
   const context=await browser.newContext({viewport:{width:scenario==='mobile'?360:1280,height:900},reducedMotion:scenario==='reduced'?'reduce':'no-preference'});
   const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
   if(['authenticated','expired','offline','slow-auth'].includes(scenario))await page.addInitScript(()=>localStorage.setItem('missao-escola-supabase-session',JSON.stringify({access_token:'test-token',refresh_token:'test-refresh',expires_at:Date.now()/1000+3600,user:{id:'test-user',email:'test@example.com'}})));
   await page.route('**/*.supabase.co/**',async route=>{
    if(route.request().url().includes('/auth/v1/user')){
     if(scenario==='offline')return route.abort();
     if(scenario==='authenticated')await new Promise(r=>setTimeout(r,1400));
     if(scenario==='slow-auth')await new Promise(r=>setTimeout(r,6200));
     return route.fulfill({status:scenario==='expired'?401:200,json:scenario==='expired'?{message:'Expired'}:{id:'test-user',email:'test@example.com'}}).catch(()=>{});
    }
    return route.fulfill({json:[]});
   });
   if(scenario==='slow-resources')await page.route('**/study-ui.js',async route=>{await new Promise(r=>setTimeout(r,1600));await route.continue();});
   await page.route('**/api/**',route=>route.fulfill({status:401,json:{error:'Entre na sua conta.'}}));
   if(scenario==='slow-cpu')await (await context.newCDPSession(page)).send('Emulation.setCPUThrottlingRate',{rate:4});
   const started=Date.now();
   await page.goto('http://127.0.0.1:'+server.address().port,{waitUntil:'commit'});
   await page.locator('#app-splash').waitFor({state:'visible'});
   assert.equal(await page.locator('#app-splash img').getAttribute('src'),'./assets/brand/logo.svg');
   assert.equal(await page.locator('#app-splash [src*="mascot"]').count(),0);
   if(scenario==='authenticated'){
    await page.waitForTimeout(400);assert.equal(await page.locator('.app-shell').isVisible(),false);
   }
   await page.locator('#app-splash').waitFor({state:'detached',timeout:10000});
   assert.ok(await page.locator('.app-shell').isVisible());
   assert.equal(await page.locator('.app-shell').evaluate(el=>el.inert),false);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   if(scenario==='expired')assert.equal(await page.evaluate(()=>localStorage.getItem('missao-escola-supabase-session')),null);
   if(scenario==='offline')assert.ok(await page.evaluate(()=>localStorage.getItem('missao-escola-supabase-session')));
   if(scenario==='slow-auth')assert.ok(Date.now()-started<7500,'A hung authentication request must not block the page.');
   if(scenario==='public'){
    await page.locator('.side-nav [data-page="social"]').click();assert.ok(await page.locator('#account-form').isVisible());
    assert.equal(await page.locator('#app-splash').count(),0);
    await page.reload({waitUntil:'commit'});await page.locator('#app-splash').waitFor({state:'visible'});
    await page.locator('#app-splash').waitFor({state:'detached'});
   }
   assert.deepEqual(errors,[]);console.log('PASS',scenario);await context.close();
  }
 }finally{await browser?.close();server.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
