// Runs once, before the body is painted. Internal navigation never replays it.
(() => {
 'use strict';
 const root=document.documentElement;
 root.classList.add('app-starting');
 let authentication=Promise.resolve(),finished=false,locked=[],retryMessage='',watchdog=null;
 const animations=new Set(),pausedByPage=new Set();
 window.MissaoStartup={waitForAuthentication(promise){authentication=promise;}};
 function finish(){
  if(finished)return;finished=true;clearTimeout(watchdog);
  root.classList.remove('app-starting','app-entering','app-background');
  document.removeEventListener('visibilitychange',visibilityChanged);
  document.querySelectorAll('.splash-handoff').forEach(el=>el.classList.remove('splash-handoff'));
  for(const el of locked)el.inert=false;
  document.querySelector('#app-splash')?.remove();
  for(const animation of animations)animation.cancel();
  animations.clear();pausedByPage.clear();
  delete window.MissaoStartup;
  if(retryMessage&&document.body){
   const notice=document.createElement('aside');notice.className='startup-notice';notice.setAttribute('aria-label','Conexão');
   const message=document.createElement('p');message.textContent=retryMessage;message.setAttribute('role','status');
   const retry=document.createElement('button');retry.type='button';retry.textContent='Tentar novamente';retry.onclick=()=>location.reload();
   const close=document.createElement('button');close.type='button';close.textContent='Fechar';close.onclick=()=>notice.remove();
   notice.append(message,retry,close);document.body.append(notice);
  }
 }
 // Only consume startup time while the tab is visible. Background tabs must
 // not finish the presentation before the user has had a chance to see it.
 function visibilityChanged(){
  root.classList.toggle('app-background',document.hidden);clearTimeout(watchdog);
  if(document.hidden){for(const animation of animations){if(animation.playState==='running'){animation.pause();pausedByPage.add(animation);}}}
  else{for(const animation of pausedByPage)if(animation.playState==='paused')animation.play();pausedByPage.clear();}
  if(!document.hidden&&!finished)watchdog=setTimeout(()=>{retryMessage='O carregamento demorou. Você pode continuar ou tentar novamente.';finish();},8000);
 }
 function whenVisible(){
  if(!document.hidden)return Promise.resolve();
  return new Promise(resolve=>{const visible=()=>{if(!document.hidden){document.removeEventListener('visibilitychange',visible);resolve();}};document.addEventListener('visibilitychange',visible);});
 }
 // Font display is already allowed to fall back. A delayed font or image
 // decoder must not freeze the presentation or use up the emergency timeout.
 function assetReady(promise){
  return new Promise(resolve=>{const timer=setTimeout(resolve,1500);Promise.resolve(promise).then(()=>{clearTimeout(timer);resolve();},()=>{clearTimeout(timer);resolve();});});
 }
 function animate(element,frames,options){
  if(!element)return null;
  const animation=element.animate(frames,options);animations.add(animation);
  animation.finished.then(()=>animations.delete(animation),()=>animations.delete(animation));
  if(document.hidden){animation.pause();pausedByPage.add(animation);}
  return animation;
 }
 document.addEventListener('visibilitychange',visibilityChanged);visibilityChanged();
 document.addEventListener('DOMContentLoaded',async()=>{
  if(finished)return;
  const splash=document.querySelector('#app-splash'),logo=splash?.querySelector('img'),name=splash?.querySelector('.app-splash-name');
  if(!splash||!logo){finish();return;}
  locked=[...document.querySelectorAll('.app-shell,.mobile-nav,.skip-link')].filter(el=>!el.inert);
  locked.forEach(el=>el.inert=true);
  try{
   await whenVisible();if(finished)return;
   const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
   await assetReady(logo.decode());await whenVisible();if(finished)return;
   // Start a fresh, visible timeline after decoding the image. CSS animation
   // resets, cached styles and parser delays cannot skip these entrance frames.
   const entrance=animate(logo,reduced?[{opacity:0},{opacity:1}]:[
    {opacity:0,transform:'translateY(12px) scale(.94)'},
    {opacity:1,transform:'translateY(0) scale(1)'}
   ],{duration:reduced?300:850,easing:'cubic-bezier(.2,.7,.2,1)',fill:'both'});
   const nameEntrance=animate(name,reduced?[{opacity:0},{opacity:1}]:[
    {opacity:0,transform:'translateX(-28px)'},
    {opacity:1,transform:'translateX(0)',offset:.9},
    {opacity:1,transform:'translateX(0)'}
   ],{duration:reduced?400:1000,delay:reduced?300:850,easing:'cubic-bezier(.2,.7,.2,1)',fill:'both'});
   const ready=await Promise.allSettled([authentication,assetReady(document.fonts?.ready),entrance?.finished,nameEntrance?.finished]);
   await whenVisible();if(finished)return;
   if(ready[0].status==='rejected'||ready[0].value?.connectionError)retryMessage='Não foi possível verificar a conexão. Seus estudos locais continuam disponíveis.';
   logo.style.opacity='1';logo.style.transform='none';
   if(name){name.style.opacity='1';name.style.transform='none';}
   entrance?.cancel();nameEntrance?.cancel();
   const target=[...document.querySelectorAll('.brand-lockup .brand-logo,.mobile-brand .brand-logo')]
    .find(el=>el.getBoundingClientRect().width>0&&el.getBoundingClientRect().height>0);
   const from=logo.getBoundingClientRect(),to=target?.getBoundingClientRect();
   root.classList.add('app-entering');
   splash.classList.add('is-leaving');
   const duration=reduced?120:1000;
   let frames=[{opacity:1},{opacity:0}];
   if(!reduced&&to&&logo.naturalWidth){
    target.classList.add('splash-handoff');
    const x=to.x+to.width/2-from.x-from.width/2,y=to.y+to.height/2-from.y-from.height/2;
    frames=[{transform:'translate(0,0) scale(1)',opacity:1},
     {transform:`translate(${x}px,${y}px) scale(${to.width/from.width})`,opacity:1}];
   }
   const nameExit=animate(name,reduced?[{opacity:1},{opacity:0}]:[
    {opacity:1,transform:'translateY(0) scale(1)'},
    {opacity:0,transform:'translateY(-8px) scale(.94)'}
   ],{duration:reduced?120:700,easing:'ease-out',fill:'forwards'});
   const logoExit=animate(logo,frames,{duration,easing:'cubic-bezier(.4,0,.15,1)',fill:'forwards'});
   const backdropExit=animate(splash.querySelector('.app-splash-backdrop'),[{opacity:1},{opacity:0}],{duration,easing:'ease-out',fill:'forwards'});
   await Promise.all([logoExit?.finished,nameExit?.finished,backdropExit?.finished]);
  }catch{/* Unsupported animation APIs or an interrupted transition use a clean reveal. */}
  finally{finish();}
 },{once:true});
})();
