// Runs once, before the body is painted. Internal navigation never replays it.
(() => {
 'use strict';
 const root=document.documentElement;
 root.classList.add('app-starting');
 let authentication=Promise.resolve(),finished=false,locked=[],retryMessage='';
 window.MissaoStartup={waitForAuthentication(promise){authentication=promise;}};
 function finish(){
  if(finished)return;finished=true;clearTimeout(watchdog);
  root.classList.remove('app-starting','app-entering');
  document.querySelectorAll('.splash-handoff').forEach(el=>el.classList.remove('splash-handoff'));
  for(const el of locked)el.inert=false;
  document.querySelector('#app-splash')?.remove();
  delete window.MissaoStartup;
  if(retryMessage&&document.body){
   const notice=document.createElement('aside');notice.className='startup-notice';notice.setAttribute('aria-label','Conexão');
   const message=document.createElement('p');message.textContent=retryMessage;message.setAttribute('role','status');
   const retry=document.createElement('button');retry.type='button';retry.textContent='Tentar novamente';retry.onclick=()=>location.reload();
   const close=document.createElement('button');close.type='button';close.textContent='Fechar';close.onclick=()=>notice.remove();
   notice.append(message,retry,close);document.body.append(notice);
  }
 }
 // Also releases the page if a module, font, image or network request hangs.
 const watchdog=setTimeout(()=>{retryMessage='O carregamento demorou. Você pode continuar ou tentar novamente.';finish();},8000);
 document.addEventListener('DOMContentLoaded',async()=>{
  if(finished)return;
  const splash=document.querySelector('#app-splash'),logo=splash?.querySelector('img'),name=splash?.querySelector('.app-splash-name');
  if(!splash||!logo){finish();return;}
  locked=[...document.querySelectorAll('.app-shell,.mobile-nav,.skip-link')].filter(el=>!el.inert);
  locked.forEach(el=>el.inert=true);
  try{
   const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
   // CSS starts the entrance as soon as the logo is parsed, even while
   // essential scripts are still downloading. Never restart it when ready.
   const entrance=reduced?null:logo.getAnimations().find(animation=>animation.animationName==='splash-logo-in');
   const nameEntrance=reduced?null:name?.getAnimations().find(animation=>animation.animationName==='splash-name-in');
   const ready=await Promise.allSettled([authentication,document.fonts?.ready,logo.decode(),entrance?.finished,nameEntrance?.finished]);
   if(finished)return;
   if(ready[0].status==='rejected'||ready[0].value?.connectionError)retryMessage='Não foi possível verificar a conexão. Seus estudos locais continuam disponíveis.';
   entrance?.cancel();
   nameEntrance?.cancel();
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
   const nameExit=name?.animate(reduced?[{opacity:1},{opacity:0}]:[
    {opacity:1,transform:'translateY(0) scale(1)'},
    {opacity:0,transform:'translateY(-8px) scale(.94)'}
   ],{duration:reduced?120:700,easing:'ease-out',fill:'forwards'});
   await Promise.all([logo.animate(frames,{duration,easing:'cubic-bezier(.4,0,.15,1)',fill:'forwards'}).finished,nameExit?.finished]);
  }catch{/* Unsupported animation APIs or an interrupted transition use a clean reveal. */}
  finally{finish();}
 },{once:true});
})();
