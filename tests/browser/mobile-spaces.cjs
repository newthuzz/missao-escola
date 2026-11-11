const {chromium}=require('/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
(async()=>{
 const root=path.resolve(__dirname,'../../dist'),out=path.resolve(__dirname,'../../work/cartoon-mobile');fs.mkdirSync(out,{recursive:true});
 const server=http.createServer((req,res)=>{try{const file=path.join(root,req.url.split('?')[0]==='/'?'index.html':req.url.split('?')[0]);res.setHeader('Content-Type',({'.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.woff2':'font/woff2','.webp':'image/webp'})[path.extname(file)]||'text/html');res.end(fs.readFileSync(file));}catch{res.writeHead(404);res.end();}});await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{
  browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
  const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true,locale:'pt-BR',reducedMotion:'reduce'});await context.route('**/*.supabase.co/**',r=>r.abort());
  const p=await context.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto('http://127.0.0.1:'+server.address().port);await p.locator('#app-splash').waitFor({state:'detached'});await p.waitForFunction(()=>document.querySelector('#page-social'));const nav=p.locator('.mobile-spaces');
  // Use actual touch targets, including after scrolling long pages. No navigate() shortcuts.
  for(const width of [320,360,390,740])for(const theme of ['light','dark']){
   await p.setViewportSize({width,height:width===740?390:844});await p.evaluate(t=>document.documentElement.dataset.theme=t,theme);
   for(const page of ['recompensas','social','conquistas']){
    const button=nav.locator(`[data-page="${page}"]`);await button.tap();assert.equal(await p.evaluate(()=>state.page),page);assert.ok(await p.locator('#page-'+page).isVisible());assert.equal(await button.getAttribute('aria-current'),'page');
    await p.evaluate(()=>window.scrollTo(0,document.documentElement.scrollHeight));
    assert.ok(await button.evaluate(el=>{const r=el.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return el.contains(hit)&&r.width>=44&&r.height>=44;}),`touch target ${width} ${theme} ${page}`);
    const a=await nav.boundingBox(),b=await p.locator('.mobile-nav').boundingBox();assert.ok(a.y+a.height<=b.y+1,'navigation rows overlap');assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'page overflow');
   }
   await nav.locator('[data-page="recompensas"]').tap();if([360,390].includes(width))await p.screenshot({path:out+`/mobile-${width}-${theme}.png`});
  }
  await p.setViewportSize({width:360,height:844});await p.evaluate(()=>document.documentElement.style.fontSize='200%');
  for(const page of ['social','conquistas','recompensas']){await nav.locator(`[data-page="${page}"]`).tap();assert.equal(await p.evaluate(()=>state.page),page);assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'large text page overflow');}
  await p.evaluate(()=>document.documentElement.style.fontSize='');await nav.locator('[data-page="conquistas"]').focus();await p.keyboard.press('Enter');assert.equal(await p.evaluate(()=>state.page),'conquistas');
  await p.reload();await p.locator('#app-splash').waitFor({state:'detached'});assert.equal(await p.evaluate(()=>state.page),'conquistas');await nav.locator('[data-page="recompensas"]').tap();assert.ok(await p.locator('.reward-hero-art [data-style="cartoon"]').isVisible());
  await p.locator('.reward-item [data-reward-detail="astronauta"]').click();await p.locator('.reward-dialog [data-style="cartoon"]').waitFor();await p.screenshot({path:out+'/cartoon-preview-mobile.png'});await p.keyboard.press('Escape');
  // Preview gallery is explicitly local test artwork, never production people or progress.
  await p.setViewportSize({width:1100,height:760});await p.evaluate(async()=>{
   const {renderLook,rewardCharacters}=await import('/reward-look.js'),{avatarModels}=await import('/avatar-catalog.mjs');
   const gallery=document.createElement('section');gallery.id='cartoon-gallery-test';gallery.style.cssText='position:fixed;inset:0;z-index:100;background:var(--bg);padding:20px;display:grid;grid-template-columns:repeat(6,1fr);align-items:start;gap:10px;overflow:auto';
   gallery.innerHTML='<h1 style="grid-column:1/-1;margin:0;font-size:18px">Prévia local de teste · viajantes cartunescos</h1>'+['astronauta','raposa-aurora','guardiao-bosque','dragao-eclipse','robo-orbital','pinguim-polar'].map(id=>{const base=rewardCharacters[id];return '<article style="min-width:0;border:1px solid var(--line);border-radius:20px;background:var(--panel);padding:6px">'+renderLook({base,special:id,accessory:null,effect:null},{figure:true,animated:false,stage:true})+'<p style="text-align:center;font-size:13px">'+avatarModels[base.split('~')[0]].name+'</p></article>';}).join('');document.body.append(gallery);
  });await p.screenshot({path:out+'/cartoon-gallery.png'});await p.locator('#cartoon-gallery-test').evaluate(el=>el.remove());
  await p.setViewportSize({width:1440,height:1000});assert.ok(await nav.isHidden());assert.ok(await p.locator('.side-nav [data-page="recompensas"]').isVisible());assert.deepEqual(errors,[]);
  console.log('PASS mobile touch access to characters/friends/achievements at 320/360/390 px and landscape, both themes, scrolled pages, 44px targets, no overlaps, 200% text, keyboard, reload, preview and desktop fallback.');
 }finally{await browser?.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
