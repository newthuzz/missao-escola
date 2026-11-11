const {chromium}=require('/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
(async()=>{
 const root=path.resolve(__dirname,'../../dist'),out=path.resolve(__dirname,'../../work/avatar-joints');fs.mkdirSync(out,{recursive:true});
 const server=http.createServer((req,res)=>{try{const file=path.join(root,req.url.split('?')[0]==='/'?'index.html':req.url.split('?')[0]);res.setHeader('Content-Type',({'.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.woff2':'font/woff2','.webp':'image/webp'})[path.extname(file)]||'text/html');res.end(fs.readFileSync(file));}catch{res.writeHead(404);res.end();}});await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{
  browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});const errors=[];
  const context=await browser.newContext({viewport:{width:1440,height:1100},reducedMotion:'no-preference'});await context.route('**/*.supabase.co/**',r=>r.abort());
  await context.addInitScript(()=>{const Observer=IntersectionObserver;window.IntersectionObserver=class extends Observer{observe(target){if(target.matches('.reward-live-scene')&&!(target instanceof HTMLElement))throw Error('Animation observed an SVG instead of its HTML viewport');super.observe(target);}};});
  const p=await context.newPage();p.on('pageerror',e=>errors.push(e.message));await p.goto('http://127.0.0.1:'+server.address().port+'/#recompensas');await p.locator('#app-splash').waitFor({state:'detached'});const hero=p.locator('.reward-hero-art .reward-live-scene');await hero.scrollIntoViewIfNeeded();await p.waitForFunction(()=>document.querySelector('.reward-hero-art .reward-live-scene')?.dataset.motionState==='running');
  // Desktop starts and has an actual advancing timeline without hovering or clicking.
  assert.ok(await hero.evaluate(root=>root.getAnimations({subtree:true}).some(a=>a.playState==='running')));
  const timing=await hero.evaluate(async root=>{const a=root.querySelector('.avatar-thorax').getAnimations()[0],start=a.currentTime;await new Promise(r=>setTimeout(r,150));return [start,a.currentTime];});assert.ok(timing[1]>timing[0]+50,'desktop idle timeline did not advance');
  // Sample whole gestures, not just a final bounding box. These positions must
  // coincide after every nested transform, even during non-simultaneous motion.
  const result=await p.evaluate(async()=>{
   const {renderLook}=await import('/reward-look.js'),{avatarModels}=await import('/avatar-catalog.mjs'),host=document.createElement('div');host.style.cssText='position:fixed;inset:0 auto auto 0;width:232px;height:360px;pointer-events:none;z-index:-1';document.body.append(host);
   const failures=[];let maxGap=0,samples=0;
   for(const model of ['local-default',...Object.keys(avatarModels)].filter(m=>!['jellyfish','moth','comet','starwhale'].includes(m)))for(const state of ['ARM_GESTURE','GREETING','CELEBRATION','RETURN_TO_IDLE']){
    host.innerHTML=renderLook({base:model,accessory:'lanterna',effect:null},{figure:true,animated:true,stage:true});const root=host.querySelector('svg');if(new DOMParser().parseFromString(root.outerHTML,'image/svg+xml').querySelector('parsererror'))throw Error('Invalid articulated SVG');root.dataset.avatarState=state;root.dataset.motionState='paused';
    const duration={ARM_GESTURE:2600,GREETING:2500,CELEBRATION:3000,RETURN_TO_IDLE:450}[state];
    const animations=root.getAnimations({subtree:true});for(const animation of animations)animation.pause();
    const point=(node,x=0,y=0)=>new DOMPoint(x,y).matrixTransform(node.getScreenCTM()),gap=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
    for(let frame=0;frame<=30;frame++){
     for(const animation of animations)animation.currentTime=frame*duration/30;
     for(const side of ['left','right']){
      const arm=root.querySelector('.avatar-arm-'+side),forearm=root.querySelector('.avatar-forearm-'+side),hand=root.querySelector('.avatar-hand-'+side),left=side==='left';
      const distances=[gap(point(arm),point(arm.parentElement)),gap(point(arm,left?-12:12,39),point(forearm)),gap(point(forearm,left?-4:4,33),point(hand))];
      const largest=Math.max(...distances);samples++;maxGap=Math.max(maxGap,largest);if(largest>.05)failures.push({model,state,frame,side,distances});
     }
    }
   }
   const bounds=[];
   for(const model of ['astronaut','fox','dragon','axolotl'])for(const gear of [null,'lanterna','livro','luneta','asas','mochila'])for(const state of ['ARM_GESTURE','GREETING','CELEBRATION']){
    host.innerHTML=renderLook({base:model,accessory:gear,effect:null},{figure:true,animated:true,stage:true});const root=host.querySelector('svg');root.dataset.avatarState=state;root.dataset.motionState='paused';const animations=root.getAnimations({subtree:true});for(const a of animations)a.pause();
    const duration={ARM_GESTURE:2600,GREETING:2500,CELEBRATION:3000}[state];
    for(let frame=0;frame<=30;frame++){
     for(const a of animations)a.currentTime=frame*duration/30;const inverse=root.getScreenCTM().inverse();
     for(const part of root.querySelectorAll('path,circle,ellipse,rect')){if(part.closest('defs'))continue;const b=part.getBBox(),matrix=inverse.multiply(part.getScreenCTM());
      const points=[[b.x,b.y],[b.x+b.width,b.y],[b.x,b.y+b.height],[b.x+b.width,b.y+b.height]].map(([x,y])=>new DOMPoint(x,y).matrixTransform(matrix));
      if(points.some(p=>p.x<.5||p.x>231.5||p.y<.5||p.y>359.5)){bounds.push({model,gear,state,frame,part:part.outerHTML.slice(0,65),points:points.map(p=>[+p.x.toFixed(2),+p.y.toFixed(2)])});break;}
     }
    }
   }
   host.remove();return {failures,bounds,maxGap,samples};
  });assert.deepEqual(result.failures,[],'disconnected shoulder, elbow or wrist during a gesture');assert.deepEqual(result.bounds,[],'clipped body or equipment between gesture keyframes');assert.ok(result.samples>5000);console.log('PASS',result.samples,'joint/frame samples; max separation',result.maxGap);
  // Capture representative intermediate frames as an explicitly local preview.
  await p.evaluate(async()=>{const {renderLook}=await import('/reward-look.js'),gallery=document.createElement('section');gallery.id='joint-filmstrip';gallery.style.cssText='position:fixed;inset:0;z-index:100;background:var(--bg);padding:18px;display:grid;grid-template-columns:repeat(6,1fr);align-content:center;gap:8px';gallery.innerHTML='<h1 style="grid-column:1/-1;font-size:18px">Teste local · quadros intermediários do cumprimento</h1>'+[0,300,600,1000,1700,2400].map(ms=>'<article style="border:1px solid var(--line);border-radius:20px;background:var(--panel)">'+renderLook({base:'astronaut',accessory:null,effect:null},{figure:true,animated:true,stage:true})+'<p style="text-align:center">'+ms+' ms</p></article>').join('');document.body.append(gallery);[...gallery.querySelectorAll('.reward-live-scene')].forEach((root,i)=>{root.dataset.avatarState='GREETING';root.dataset.motionState='paused';for(const a of root.getAnimations({subtree:true})){a.pause();a.currentTime=[0,300,600,1000,1700,2400][i];}});});await p.screenshot({path:out+'/greeting-frames.png'});await p.locator('#joint-filmstrip').evaluate(el=>el.remove());
  // Explicit activation works despite the app's global prefers-reduced-motion
  // rules, persists across reload, and can always be paused again.
  await p.emulateMedia({reducedMotion:'reduce'});await hero.scrollIntoViewIfNeeded();await p.waitForFunction(()=>document.querySelector('.reward-hero-art .reward-live-scene').dataset.motionState==='reduced');assert.equal(await hero.evaluate(r=>r.getAnimations({subtree:true}).length),0);
  const toggle=p.locator('.reward-hero-art [data-avatar-motion]');assert.ok(await toggle.isEnabled());assert.equal(await toggle.innerText(),'Ativar animações');await toggle.click();await p.waitForFunction(()=>document.querySelector('.reward-hero-art .reward-live-scene').dataset.motionState==='running');assert.ok(await hero.evaluate(r=>r.getAnimations({subtree:true}).some(a=>a.playState==='running')),'OS override did not enable actual CSS motion');
  await p.reload();await p.locator('#app-splash').waitFor({state:'detached'});await hero.scrollIntoViewIfNeeded();await p.waitForFunction(()=>document.querySelector('.reward-hero-art .reward-live-scene').dataset.motionState==='running');await toggle.click();await p.waitForFunction(()=>document.querySelector('.reward-hero-art .reward-live-scene').dataset.motionState==='paused');assert.equal(await hero.evaluate(r=>r.getAnimations({subtree:true}).filter(a=>a.playState==='running').length),0);
  // Touch, modal activation and restoring a suspended page.
  await p.setViewportSize({width:390,height:844});await toggle.click();await hero.locator('xpath=..').click();await p.waitForFunction(()=>document.querySelector('.reward-hero-art .reward-live-scene').dataset.avatarState==='GREETING');await p.locator('.reward-hero-art').screenshot({path:out+'/mobile-greeting.png'});
  await p.locator('.reward-item [data-reward-detail="astronauta"]').click();await p.locator('.reward-dialog [data-avatar-motion]').click();await p.waitForFunction(()=>document.querySelector('.reward-dialog .reward-live-scene').dataset.motionState==='paused');await p.locator('.reward-dialog [data-avatar-motion]').click();await p.waitForFunction(()=>document.querySelector('.reward-dialog .reward-live-scene').dataset.motionState==='running');await p.keyboard.press('Escape');
  await hero.scrollIntoViewIfNeeded();await p.evaluate(()=>window.dispatchEvent(new Event('pagehide')));await p.waitForFunction(()=>document.querySelector('.reward-hero-art .reward-live-scene').dataset.motionState==='paused');await p.evaluate(()=>window.dispatchEvent(new Event('pageshow')));await p.waitForFunction(()=>document.querySelector('.reward-hero-art .reward-live-scene').dataset.motionState==='running');
  assert.deepEqual(errors,[]);console.log('PASS desktop auto-start, HTML observation, explicit reduced-motion opt-in, persisted pause/resume, mobile greeting, modal controls and page restore.');
 }finally{await browser?.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
