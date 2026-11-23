const {chromium}=require('/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
(async()=>{
 const root=path.resolve(__dirname,'../../dist'),out=path.resolve(__dirname,'../../work/cartoon-mobile');fs.mkdirSync(out,{recursive:true});
 const server=http.createServer((req,res)=>{try{const file=path.join(root,req.url.split('?')[0]==='/'?'index.html':req.url.split('?')[0]);res.setHeader('Content-Type',({'.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.woff2':'font/woff2','.webp':'image/webp'})[path.extname(file)]||'text/html');res.end(fs.readFileSync(file));}catch{res.writeHead(404);res.end();}});await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{
  browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
  const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true,locale:'pt-BR',reducedMotion:'reduce'});await context.route('**/*.supabase.co/**',r=>r.abort());
  const p=await context.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto('http://127.0.0.1:'+server.address().port);await p.locator('#app-splash').waitFor({state:'detached'});await p.waitForFunction(()=>document.querySelector('#page-social'));const menu=p.locator('#mobile-menu'),toggle=p.getByRole('button',{name:'Abrir menu',exact:true});
  const destinations=[
   ['inicio','inicio'],['aprendizagem','aprendizagem'],['rotina','rotina'],['missoes','missoes'],
   ['apoio','apoio'],['social','social'],['recompensas','recompensas'],['conquistas','conquistas']
  ].map(([name,page])=>({selector:`[data-page="${name}"]`,page}));
  destinations.push({selector:'[data-mobile-friends]',page:'social'});
  const open=async()=>{await toggle.tap();await menu.waitFor({state:'visible'});assert.equal(await toggle.getAttribute('aria-expanded'),'true');};
  const visit=async({selector,page})=>{
   await open();
   const shortcut=menu.locator(selector);
   await shortcut.scrollIntoViewIfNeeded();
   const hit=await shortcut.evaluate(el=>{
    const r=el.getBoundingClientRect();
    return el.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))&&r.width>=44&&r.height>=44;
   });
   assert.ok(hit,`reachable touch target: ${selector}`);
   await shortcut.tap();
   assert.equal(await p.evaluate(()=>state.page),page);
   assert.ok(await p.locator('#page-'+page).isVisible());
   await menu.waitFor({state:'hidden'});
   await p.waitForFunction(()=>document.querySelector('.mobile-menu-toggle').getAttribute('aria-expanded')==='false');
  };
  // Partially scroll the account screen so the cards pass directly under the sticky header.
  await visit(destinations.find(({selector})=>selector==='[data-page="social"]'));
  const header=p.locator('.topbar');
  const readHeaderHits=()=>header.evaluate(el=>Array.from(
   el.querySelectorAll('.mobile-menu-toggle, .mobile-brand, .theme-toggle'),
   control=>{
    const r=control.getBoundingClientRect();
    return control.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));
   }
  ));
  assert.deepEqual(await readHeaderHits(),[true,true,true]);
  const cards=p.locator('.mobile-header-actions');
  assert.ok((await cards.boundingBox()).y>=(await header.boundingBox()).height);
  await p.evaluate(()=>{
   const bar=document.querySelector('.topbar').getBoundingClientRect();
   const cards=document.querySelector('.mobile-header-actions').getBoundingClientRect();
   scrollBy({top:cards.top+cards.height/2-(bar.top+bar.height/2),behavior:'instant'});
  });
  const scrolled=await p.evaluate(()=>scrollY);
  assert.ok(scrolled>0);
  assert.ok((await cards.boundingBox()).y<(await header.boundingBox()).height);
  for(const theme of ['light','dark']){
   await p.evaluate(value=>document.documentElement.dataset.theme=value,theme);
   assert.deepEqual(await readHeaderHits(),[true,true,true],`header is covered after scrolling in ${theme} mode`);
   const menuButton=await toggle.boundingBox();
   await p.touchscreen.tap(menuButton.x+menuButton.width/2,menuButton.y+menuButton.height/2);
   await menu.waitFor({state:'visible'});
   const closeButton=await menu.getByRole('button',{name:'Fechar menu'}).boundingBox();
   await p.touchscreen.tap(closeButton.x+closeButton.width/2,closeButton.y+closeButton.height/2);
   await menu.waitFor({state:'hidden'});
   assert.ok(await p.evaluate(expected=>Math.abs(scrollY-expected)<=1,scrolled),'closing the menu preserves the scroll position');
   assert.deepEqual(await readHeaderHits(),[true,true,true]);
  }

  for(const width of [320,360,390,740])for(const theme of ['light','dark']){
   await p.setViewportSize({width,height:width===740?390:844});await p.evaluate(t=>document.documentElement.dataset.theme=t,theme);
   await p.evaluate(()=>window.scrollTo(0,document.documentElement.scrollHeight));
   assert.ok(await toggle.evaluate(el=>{
    const r=el.getBoundingClientRect();
    return r.top>=0&&r.bottom<=innerHeight;
   }),'menu button stays in view after scrolling');
   for(const destination of destinations)await visit(destination);
   assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'page overflow');
   await open();
   assert.equal(await menu.locator('[aria-current="page"]').count(),1);
   assert.equal(await menu.locator('[aria-current="page"]').getAttribute('data-page'),'social');
   assert.ok(await menu.evaluate(el=>el.scrollWidth<=el.clientWidth+1),'drawer overflow');
   const box=await menu.boundingBox();
   assert.ok(box.x===0&&box.width<width,'drawer opens from the left');
   if([360,390].includes(width))await p.screenshot({path:out+`/mobile-${width}-${theme}.png`});
   await menu.getByRole('button',{name:'Fechar menu'}).tap();
  }
  await p.setViewportSize({width:360,height:844});
  await p.evaluate(()=>document.documentElement.style.fontSize='200%');
  await visit(destinations.at(-1));
  assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'large text page overflow');
  await p.evaluate(()=>document.documentElement.style.fontSize='');
  await toggle.focus();await p.keyboard.press('Enter');
  assert.ok(await menu.isVisible());
  assert.ok(await menu.getByRole('button',{name:'Fechar menu'}).evaluate(el=>document.activeElement===el));
  await p.keyboard.press('Escape');
  assert.ok(await toggle.evaluate(el=>document.activeElement===el));
  await open();
  await p.mouse.click(357,120);
  assert.ok(await menu.isHidden());
  await open();
  await menu.locator('[data-page="conquistas"]').focus();await p.keyboard.press('Enter');
  assert.equal(await p.evaluate(()=>state.page),'conquistas');
  await p.reload();await p.locator('#app-splash').waitFor({state:'detached'});assert.equal(await p.evaluate(()=>state.page),'conquistas');
  await visit(destinations.find(({page})=>page==='recompensas'));
  assert.ok(await p.locator('.reward-hero-art [data-style="cartoon"]').isVisible());
  await p.locator('.reward-item [data-reward-detail="astronauta"]').click();await p.locator('.reward-dialog [data-style="cartoon"]').waitFor();await p.screenshot({path:out+'/cartoon-preview-mobile.png'});await p.keyboard.press('Escape');
  // Preview gallery is explicitly local test artwork, never production people or progress.
  await p.setViewportSize({width:1100,height:760});await p.evaluate(async()=>{
   const {renderLook,rewardCharacters}=await import('/reward-look.js'),{avatarModels}=await import('/avatar-catalog.mjs');
   const gallery=document.createElement('section');gallery.id='cartoon-gallery-test';gallery.style.cssText='position:fixed;inset:0;z-index:100;background:var(--bg);padding:20px;display:grid;grid-template-columns:repeat(6,1fr);align-items:start;gap:10px;overflow:auto';
   gallery.innerHTML='<h1 style="grid-column:1/-1;margin:0;font-size:18px">Prévia local de teste · viajantes cartunescos</h1>'+['astronauta','raposa-aurora','guardiao-bosque','dragao-eclipse','robo-orbital','pinguim-polar'].map(id=>{const base=rewardCharacters[id];return '<article style="min-width:0;border:1px solid var(--line);border-radius:20px;background:var(--panel);padding:6px">'+renderLook({base,special:id,accessory:null,effect:null},{figure:true,animated:false,stage:true})+'<p style="text-align:center;font-size:13px">'+avatarModels[base.split('~')[0]].name+'</p></article>';}).join('');document.body.append(gallery);
  });await p.screenshot({path:out+'/cartoon-gallery.png'});await p.locator('#cartoon-gallery-test').evaluate(el=>el.remove());
  await p.setViewportSize({width:390,height:844});await open();
  await p.setViewportSize({width:1440,height:1000});await p.waitForFunction(()=>!document.querySelector('#mobile-menu').open);assert.ok(await toggle.isHidden());assert.ok(await p.locator('.side-nav [data-page="recompensas"]').isVisible());assert.deepEqual(errors,[]);
  console.log('PASS all nine mobile shortcuts, both themes, landscape, 44px targets, 200% text, keyboard and backdrop dismissal, reload and desktop.');
 }finally{await browser?.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
