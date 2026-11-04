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
  for(const scenario of ['public','css-reset','slow-logo','background','stalled-font','opera-agent','authenticated','expired','offline','slow-auth','slow-resources','mobile','landscape','reduced','slow-cpu']){
   const context=await browser.newContext({viewport:{width:scenario==='mobile'?360:scenario==='landscape'?640:1280,height:scenario==='landscape'?360:900},reducedMotion:scenario==='reduced'?'reduce':'no-preference',...(scenario==='opera-agent'?{userAgent:'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 OPR/115.0.0.0'}:{})});
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
   if(scenario==='css-reset')await page.route('**/splash.css*',route=>route.fulfill({contentType:'text/css',body:fs.readFileSync(path.join(root,'splash.css'),'utf8')+'\nhtml.app-starting .app-splash-logo,html.app-starting .app-splash-name{animation:none!important;transition:none!important}'}));
   if(scenario==='slow-logo')await page.route('**/assets/brand/logo.svg',async route=>{await new Promise(r=>setTimeout(r,1200));await route.continue();});
   if(scenario==='slow-resources')await page.route('**/study-ui.js',async route=>{await new Promise(r=>setTimeout(r,1600));await route.continue();});
   await page.route('**/api/**',route=>route.fulfill({status:401,json:{error:'Entre na sua conta.'}}));
   if(scenario==='slow-cpu')await (await context.newCDPSession(page)).send('Emulation.setCPUThrottlingRate',{rate:4});
   if(scenario==='background')await page.addInitScript(()=>{window.__startupHidden=true;Object.defineProperty(document,'hidden',{configurable:true,get:()=>window.__startupHidden});});
   if(scenario==='stalled-font')await page.addInitScript(()=>Object.defineProperty(document.fonts,'ready',{configurable:true,value:new Promise(()=>{})}));
   const started=Date.now();
   await page.goto('http://127.0.0.1:'+server.address().port,{waitUntil:'commit'});
   await page.locator('#app-splash').waitFor({state:'visible'});
   if(scenario==='background'){
    await page.waitForTimeout(3500);
    assert.equal(await page.locator('#app-splash').count(),1,'Background loading must not consume the presentation');
    assert.equal(await page.locator('.app-splash-logo').evaluate(el=>getComputedStyle(el).animationPlayState),'paused');
    await page.evaluate(()=>{window.__startupHidden=false;document.dispatchEvent(new Event('visibilitychange'));});
   }
   if(scenario==='slow-logo'){
    const pending=await page.evaluate(()=>{const logo=document.querySelector('.app-splash-logo'),name=document.querySelector('.app-splash-name');return {loading:!logo.complete,logo:logo.getAnimations().length,name:name.getAnimations().length};});
    if(pending.loading){assert.equal(pending.logo,0,'The entrance must wait for the logo');assert.equal(pending.name,0);}
   }
   await page.waitForFunction(()=>document.querySelector('.app-splash-logo')?.getAnimations().length&&document.querySelector('.app-splash-name')?.getAnimations().length);
   if(scenario==='reduced'){
    const fade=await page.locator('.app-splash-logo').evaluate(el=>el.getAnimations()[0].effect.getKeyframes());
    assert.ok(fade.every(frame=>frame.transform===undefined||frame.transform==='none'),'Reduced motion uses opacity without spatial movement');
   }
   assert.equal(await page.locator('#app-splash img').getAttribute('src'),'./assets/brand/logo.svg');
   assert.equal(await page.locator('#app-splash [src*="mascot"]').count(),0);
   assert.equal(await page.locator('.app-splash-name').innerText(),'Missão Escola');
   if(['public','css-reset','opera-agent'].includes(scenario)){
    const sequence=await page.evaluate(()=>{
     const logo=document.querySelector('.app-splash-logo'),name=document.querySelector('.app-splash-name');
     const a=logo.getAnimations()[0],b=name.getAnimations()[0];a.pause();b.pause();
     a.currentTime=400;b.currentTime=400;
     const first={logo:+getComputedStyle(logo).opacity,name:+getComputedStyle(name).opacity};
     a.currentTime=850;b.currentTime=1250;
     const during={logo:+getComputedStyle(logo).opacity,name:+getComputedStyle(name).opacity,x:new DOMMatrixReadOnly(getComputedStyle(name).transform).m41};
     b.currentTime=1800;
     const box=name.getBoundingClientRect(),parent=name.parentElement.getBoundingClientRect();
     const end={opacity:+getComputedStyle(name).opacity,offset:Math.abs(box.x+box.width/2-parent.x-parent.width/2)};
     a.currentTime=0;b.currentTime=0;a.play();b.play();return {first,during,end};
    });
    assert.ok(sequence.first.logo>0&&sequence.first.name===0,'Logo appears before the name');
    assert.ok(sequence.during.logo===1&&sequence.during.name>0&&sequence.during.x<0,'Name moves from the left while the logo stays visible');
    assert.ok(sequence.end.opacity===1&&sequence.end.offset<1,'Name finishes centered');
   }
   if(scenario==='authenticated'){
    await page.waitForTimeout(400);assert.equal(await page.locator('.app-shell').isVisible(),false);
   }
   if(['public','css-reset','opera-agent'].includes(scenario)){
    await page.waitForFunction(()=>document.documentElement.classList.contains('app-entering'));
    const travel=await page.locator('.app-splash-logo').evaluate(el=>{
     const animation=el.getAnimations().find(a=>a.playState!=='finished');
     const frames=animation.effect.getKeyframes();return frames.map(frame=>frame.transform).filter(Boolean);
    });
    assert.ok(travel.some(value=>/translate\(.+px/.test(value)&&/scale\(0\./.test(value)),'The logo must move and shrink toward the header');
   }
   await page.locator('#app-splash').waitFor({state:'detached',timeout:10000});
   if(scenario==='stalled-font')assert.equal(await page.locator('.startup-notice').count(),0,'Optional assets must not force the emergency timeout');
   if(scenario==='slow-auth')assert.doesNotMatch(await page.locator('.startup-notice p').innerText(),/O carregamento demorou/,'Session timeout should recover before the startup watchdog');
   assert.ok(await page.locator('.app-shell').isVisible());
   assert.equal(await page.locator('.app-shell').evaluate(el=>el.inert),false);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   if(scenario==='expired')assert.equal(await page.evaluate(()=>localStorage.getItem('missao-escola-supabase-session')),null);
   if(scenario==='offline'){
    assert.ok(await page.evaluate(()=>localStorage.getItem('missao-escola-supabase-session')));
    await page.locator('.startup-notice button').getByText('Tentar novamente',{exact:true}).waitFor({state:'visible'});
    await page.getByRole('button',{name:'Fechar',exact:true}).click();
    assert.equal(await page.locator('.startup-notice').count(),0);
   }
   if(scenario==='slow-auth')assert.ok(Date.now()-started<9000,'A hung authentication request must not block the page.');
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
