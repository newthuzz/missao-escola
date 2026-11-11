// One shared timer advances discrete gestures. CSS interpolates the joints;
// there is no animation frame loop, repeated rendering or progress mutation.
export const avatarStates=Object.freeze({IDLE:0,LOOK_AROUND:2800,ARM_GESTURE:2600,GREETING:2500,CELEBRATION:3000,RETURN_TO_IDLE:450});
const priority={IDLE:0,RETURN_TO_IDLE:0,LOOK_AROUND:1,ARM_GESTURE:1,GREETING:2,CELEBRATION:3};
export function createAvatarMotion(random=Math.random){
 let state='IDLE',remaining=8000+random()*10000,direction='left',lastGesture='ARM_GESTURE';
 function enter(next){state=next;remaining=next==='IDLE'?8000+random()*10000:avatarStates[next];}
 return {
  get state(){return state;},get remaining(){return remaining;},get direction(){return direction;},
  request(next){if(!Object.hasOwn(avatarStates,next)||!priority[next]||priority[next]<=priority[state])return false;direction=random()<.5?'left':'right';enter(next);return true;},
  advance(elapsed){remaining-=Math.max(0,elapsed);if(remaining>0)return false;
   if(state==='IDLE'){const next=random()<.55?(lastGesture==='LOOK_AROUND'?'ARM_GESTURE':'LOOK_AROUND'):lastGesture;lastGesture=next;direction=random()<.5?'left':'right';enter(next);}
   else enter(state==='RETURN_TO_IDLE'?'IDLE':'RETURN_TO_IDLE');
   return true;
  },
  reset(){enter('IDLE');}
 };
}
export function motionAllowed(preference,systemReduced){return preference==='enabled'||preference!=='paused'&&!systemReduced;}
let started=false,react=null;
export function reactAvatar(container,state){react?.(container,state);}
export function startRewardMotion(){
 if(started||typeof document==='undefined'||typeof MutationObserver==='undefined')return;
 started=true;
 const selector='.reward-live-scene[data-animated="true"]',scenes=new Map(),anchors=new Map(),reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
 let scheduled=false,timer=null,lastTime=performance.now(),pageActive=true,preference='auto';
 function readPreference(){try{const saved=localStorage.getItem('missao-escola-avatar-motion');preference=['auto','enabled','paused'].includes(saved)?saved:'auto';}catch{preference='auto';}}
 readPreference();
 function paint(node,entry){
  if(node.dataset.avatarState!==entry.machine.state){
   // Sample only on state changes so an interaction can interrupt a gesture
   // from its current pose instead of snapping an articulated joint to zero.
   for(const [part,key]of [['head-pose','head'],['arm-left','arm-left'],['arm-right','arm-right'],['forearm-left','forearm-left'],['forearm-right','forearm-right'],['creature-pose','creature']]){
    const joint=node.querySelector('.avatar-'+part);if(joint){const pose=getComputedStyle(joint).transform;node.style.setProperty('--from-'+key,pose==='none'?'rotate(0deg)':pose);}
   }
   node.dataset.avatarState=entry.machine.state;
  }
  node.dataset.lookDirection=entry.machine.direction;
 }
 function advance(){const now=performance.now(),elapsed=now-lastTime;lastTime=now;
  for(const [node,entry]of scenes)if(entry.running&&node.isConnected&&entry.machine.advance(elapsed))paint(node,entry);
 }
 function armTimer(){clearTimeout(timer);timer=null;let next=Infinity;
  for(const entry of scenes.values())if(entry.running)next=Math.min(next,entry.machine.remaining);
  if(Number.isFinite(next))timer=setTimeout(()=>{advance();armTimer();},Math.max(16,next));
 }
 function sync(){
  scheduled=false;advance();const modal=document.querySelector('dialog[open]');
  for(const [node,entry]of scenes){
   if(!node.isConnected){const group=anchors.get(entry.anchor);group?.nodes.delete(node);if(group&&!group.nodes.size){intersection?.unobserve(entry.anchor);anchors.delete(entry.anchor);}scenes.delete(node);continue;}
   node.dataset.motionOverride=String(preference==='enabled');
   const state=!motionAllowed(preference,reduced.matches)?preference==='paused'?'paused':'reduced':pageActive&&!document.hidden&&entry.visible&&(!modal||modal.contains(node))?'running':'paused';
   if(node.dataset.motionState!==state)node.dataset.motionState=state;
   entry.running=state==='running'&&node.dataset.fullBody==='true';
   if(state==='reduced'){entry.machine.reset();entry.pending=null;paint(node,entry);}
   else if(entry.running&&entry.pending){entry.machine.request(entry.pending);entry.pending=null;paint(node,entry);}
  }
  for(const button of document.querySelectorAll('[data-avatar-motion]')){
   const enabled=motionAllowed(preference,reduced.matches),text=enabled?'Pausar animações':'Ativar animações';
   if(button.textContent!==text)button.textContent=text;
   button.disabled=false;button.setAttribute('aria-pressed',String(!enabled));
  }
  const explanation=preference==='paused'?'Animações pausadas. Você pode ativá-las quando quiser.':reduced.matches&&preference!=='enabled'?'Seu dispositivo prefere menos movimento. Ative a prévia se quiser.':'';
  for(const note of document.querySelectorAll('[data-avatar-motion-note]'))if(note.textContent!==explanation)note.textContent=explanation;
  armTimer();
 }
 function schedule(){if(!scheduled){scheduled=true;queueMicrotask(sync);}}
 function inViewport(anchor){const r=anchor.getBoundingClientRect();return r.width>0&&r.height>0&&r.bottom>0&&r.top<innerHeight&&r.right>0&&r.left<innerWidth;}
 // Observe HTML containers, whose intersections are reliable across Safari and
 // desktop engines. Initial geometry also starts visible scenes immediately.
 let intersection=null;
 if(typeof IntersectionObserver==='function')try{intersection=new IntersectionObserver(entries=>{
  advance();for(const change of entries){const group=anchors.get(change.target);if(group)for(const node of group.nodes){const entry=scenes.get(node);if(entry)entry.visible=change.isIntersecting&&change.intersectionRatio>0;}}
  schedule();
 },{threshold:0});}catch{}
 function collect(root){
  const nodes=[];if(root.matches?.(selector))nodes.push(root);nodes.push(...(root.querySelectorAll?.(selector)||[]));
  for(const node of nodes)if(node.isConnected&&!scenes.has(node)){
   let anchor=node.closest('[data-avatar-interact]')||node.parentElement;
   while(anchor?.namespaceURI!=='http://www.w3.org/1999/xhtml'&&anchor?.parentElement)anchor=anchor.parentElement;
   anchor=anchor||node;const entry={anchor,visible:inViewport(anchor),running:false,machine:createAvatarMotion(),pending:null};scenes.set(node,entry);
   if(!anchors.has(anchor)){anchors.set(anchor,{nodes:new Set()});intersection?.observe(anchor);}anchors.get(anchor).nodes.add(node);
  }
 }
 function refreshBounds(){for(const [anchor,group]of anchors){const visible=inViewport(anchor);for(const node of group.nodes){const entry=scenes.get(node);if(entry)entry.visible=visible;}}schedule();}
 react=(container,state)=>{
  const node=container?.matches?.(selector)?container:container?.querySelector?.(selector);if(!node||!motionAllowed(preference,reduced.matches))return;
  collect(node);advance();const entry=scenes.get(node);if(!entry)return;
  if(entry.running){entry.machine.request(state);paint(node,entry);}else if((priority[state]||0)>(priority[entry.pending]||0))entry.pending=state;
  schedule();
 };
 collect(document.body);
 new MutationObserver(records=>{
  for(const record of records)for(const node of record.addedNodes)if(node.nodeType===1)collect(node);
  if(!intersection)for(const entry of scenes.values())entry.visible=inViewport(entry.anchor);
  schedule();
 }).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class','open']});
 document.addEventListener('click',event=>{
  const button=event.target.closest?.('[data-avatar-interact],[data-avatar-motion]');if(!button)return;
  if(button.hasAttribute('data-avatar-motion')){preference=motionAllowed(preference,reduced.matches)?'paused':'enabled';try{localStorage.setItem('missao-escola-avatar-motion',preference);}catch{}schedule();}
  else react(button,'GREETING');
 });
 document.addEventListener('pointerover',event=>{
  const button=event.target.closest?.('[data-avatar-interact]');if(button&&event.pointerType!=='touch'&&!button.contains(event.relatedTarget))react(button,'LOOK_AROUND');
 });
 document.addEventListener('focusin',event=>{if(event.target.matches?.('[data-avatar-interact]'))react(event.target,'LOOK_AROUND');});
 document.addEventListener('visibilitychange',schedule);
 if(reduced.addEventListener)reduced.addEventListener('change',schedule);else reduced.addListener?.(schedule);
 window.addEventListener('storage',event=>{if(event.key==='missao-escola-avatar-motion'){readPreference();schedule();}});
 window.addEventListener('pagehide',()=>{advance();pageActive=false;sync();});
 window.addEventListener('pageshow',()=>{pageActive=true;refreshBounds();});
 window.addEventListener('resize',refreshBounds);
 if(!intersection)window.addEventListener('scroll',refreshBounds,{passive:true});
 sync();
}
