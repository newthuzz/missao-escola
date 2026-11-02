// Runs once, before the body is painted. Internal navigation never replays it.
(() => {
 'use strict';
 const root=document.documentElement;
 root.classList.add('app-starting');
 let authentication=Promise.resolve(),finished=false,locked=[];
 window.MissaoStartup={waitForAuthentication(promise){authentication=promise;}};
 function finish(){
  if(finished)return;finished=true;clearTimeout(watchdog);
  root.classList.remove('app-starting','app-entering');
  document.querySelectorAll('.splash-handoff').forEach(el=>el.classList.remove('splash-handoff'));
  for(const el of locked)el.inert=false;
  document.querySelector('#app-splash')?.remove();
  delete window.MissaoStartup;
 }
 // Also releases the page if a module, font, image or network request hangs.
 const watchdog=setTimeout(finish,8000);
 document.addEventListener('DOMContentLoaded',async()=>{
  if(finished)return;
  const splash=document.querySelector('#app-splash'),logo=splash?.querySelector('img');
  if(!splash||!logo){finish();return;}
  locked=[...document.querySelectorAll('.app-shell,.mobile-nav,.skip-link')].filter(el=>!el.inert);
  locked.forEach(el=>el.inert=true);
  try{
   const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
   // CSS starts the entrance as soon as the logo is parsed, even while
   // essential scripts are still downloading. Never restart it when ready.
   const entrance=reduced?null:logo.getAnimations().find(animation=>animation.animationName==='splash-logo-in');
   await Promise.allSettled([authentication,document.fonts?.ready,logo.decode(),entrance?.finished]);
   if(finished)return;
   entrance?.cancel();
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
   await logo.animate(frames,{duration,easing:'cubic-bezier(.4,0,.15,1)',fill:'forwards'}).finished;
  }catch{/* Unsupported animation APIs or an interrupted transition use a clean reveal. */}
  finally{finish();}
 },{once:true});
})();
