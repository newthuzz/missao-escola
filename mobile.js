// Reuse the real controls so profile updates, chat state and focus keep working.
(()=>{
 const header=document.querySelector('.topbar'),profile=document.querySelector('.profile-dock'),tutor=document.querySelector('#tutor-launcher');
 if(!header||!profile||!tutor)return;
 const anchors=[profile,tutor].map(node=>{const anchor=document.createComment('Desktop control');node.before(anchor);return anchor;});
 const actions=document.createElement('div');actions.className='mobile-header-actions';actions.setAttribute('role','group');actions.setAttribute('aria-label','Perfil e ajuda nos estudos');
 const mobile=matchMedia('(max-width:760px)');
 function layout(){
  if(mobile.matches){header.append(actions);actions.append(profile,tutor);}
  else{[profile,tutor].forEach((node,i)=>anchors[i].after(node));actions.remove();}
 }
 mobile.addEventListener('change',layout);layout();
})();

// iOS can pan the visual viewport when the keyboard opens while the layout
// viewport stays tall. Fit the tutor to the visible area without changing zoom.
(()=>{
 const viewport=window.visualViewport;if(!viewport)return;
 const root=document.documentElement,mobile=matchMedia('(max-width:760px)');
 let baseline=Math.max(innerHeight,viewport.height),width=innerWidth,frame=0;
 function update(){
  frame=0;
  if(Math.abs(innerWidth-width)>80){baseline=Math.max(innerHeight,viewport.height);width=innerWidth;}
  else baseline=Math.max(baseline,innerHeight,viewport.height);
  const field=document.activeElement,panel=field?.closest('#tutor-panel');
  const editing=panel&&!panel.hidden&&field.matches('textarea,input:not([type=checkbox]):not([type=radio]):not([type=button]):not([type=submit])');
  const keyboard=mobile.matches&&editing&&Math.abs(viewport.scale-1)<.05&&baseline-viewport.height>120;
  root.classList.toggle('tutor-keyboard-open',Boolean(keyboard));
  if(keyboard){
   root.style.setProperty('--tutor-visible-top',viewport.offsetTop+'px');
   root.style.setProperty('--tutor-visible-height',viewport.height+'px');
  }else{
   root.style.removeProperty('--tutor-visible-top');root.style.removeProperty('--tutor-visible-height');
  }
 }
 function schedule(){if(!frame)frame=requestAnimationFrame(update);}
 viewport.addEventListener('resize',schedule);viewport.addEventListener('scroll',schedule);
 window.addEventListener('resize',schedule);mobile.addEventListener('change',schedule);
 document.addEventListener('focusin',schedule);document.addEventListener('focusout',schedule);
 update();
})();

// Both mobile navigation rows reserve their real height, including large text
// and the device safe area. Reuse the app's existing data-page click handlers.
(()=>{
 const primary=document.querySelector('.mobile-nav'),spaces=document.querySelector('.mobile-spaces');if(!primary||!spaces)return;
 const root=document.documentElement,mobile=matchMedia('(max-width:760px)');
 function measure(){
  if(!mobile.matches){root.style.removeProperty('--mobile-primary-nav-height');root.style.removeProperty('--mobile-navigation-height');return;}
  const mainHeight=primary.getBoundingClientRect().height,total=mainHeight+spaces.getBoundingClientRect().height;
  root.style.setProperty('--mobile-primary-nav-height',mainHeight+'px');root.style.setProperty('--mobile-navigation-height',total+'px');
 }
 if(typeof ResizeObserver!=='undefined'){const observer=new ResizeObserver(measure);observer.observe(primary);observer.observe(spaces);}
 window.addEventListener('resize',measure);mobile.addEventListener('change',measure);document.fonts?.ready.then(measure);measure();
})();
