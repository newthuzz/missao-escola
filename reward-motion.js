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
let started=false,react=null;
export function reactAvatar(container,state){react?.(container,state);}
export function startRewardMotion(){
 if(started||typeof document==='undefined'||typeof MutationObserver==='undefined')return;
 started=true;
 const selector='.reward-live-scene[data-animated="true"]',scenes=new Map(),reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
 let scheduled=false,timer=null,lastTime=performance.now(),pageActive=true,userPaused=false;
 try{userPaused=localStorage.getItem('missao-escola-avatar-motion')==='paused';}catch{}
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
   if(!node.isConnected){intersection?.unobserve(node);scenes.delete(node);continue;}
   const state=reduced.matches?'reduced':!userPaused&&pageActive&&!document.hidden&&entry.visible&&(!modal||modal.contains(node))?'running':'paused';
   if(node.dataset.motionState!==state)node.dataset.motionState=state;
   entry.running=state==='running'&&node.dataset.fullBody==='true';
   if(state==='reduced'){entry.machine.reset();entry.pending=null;paint(node,entry);}
   else if(entry.running&&entry.pending){entry.machine.request(entry.pending);entry.pending=null;paint(node,entry);}
  }
  for(const button of document.querySelectorAll('[data-avatar-motion]')){
   const text=reduced.matches?'Movimento reduzido':userPaused?'Ativar animações':'Pausar animações';
   if(button.textContent!==text)button.textContent=text;
   button.disabled=reduced.matches;button.setAttribute('aria-pressed',String(userPaused||reduced.matches));
  }
  armTimer();
 }
 function schedule(){if(!scheduled){scheduled=true;queueMicrotask(sync);}}
 const intersection='IntersectionObserver' in window?new IntersectionObserver(entries=>{
  advance();for(const entry of entries)if(scenes.has(entry.target))scenes.get(entry.target).visible=entry.isIntersecting&&entry.intersectionRatio>0;
  schedule();
 },{threshold:0}):null;
 function collect(root){
  const nodes=[];if(root.matches?.(selector))nodes.push(root);nodes.push(...(root.querySelectorAll?.(selector)||[]));
  for(const node of nodes)if(!scenes.has(node)){scenes.set(node,{visible:!intersection&&node.getClientRects().length>0,running:false,machine:createAvatarMotion(),pending:null});intersection?.observe(node);}
 }
 react=(container,state)=>{
  const node=container?.matches?.(selector)?container:container?.querySelector?.(selector);if(!node||reduced.matches||userPaused)return;
  collect(node);advance();const entry=scenes.get(node);
  if(entry.running){entry.machine.request(state);paint(node,entry);}else if((priority[state]||0)>(priority[entry.pending]||0))entry.pending=state;
  schedule();
 };
 collect(document.body);
 new MutationObserver(records=>{
  for(const record of records)for(const node of record.addedNodes)if(node.nodeType===1)collect(node);
  if(!intersection)for(const [node,entry]of scenes)entry.visible=node.getClientRects().length>0;
  schedule();
 }).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class','open']});
 document.addEventListener('click',event=>{
  const button=event.target.closest?.('[data-avatar-interact],[data-avatar-motion]');if(!button)return;
  if(button.hasAttribute('data-avatar-motion')){userPaused=!userPaused;try{localStorage.setItem('missao-escola-avatar-motion',userPaused?'paused':'auto');}catch{}schedule();}
  else react(button,'GREETING');
 });
 document.addEventListener('pointerover',event=>{
  const button=event.target.closest?.('[data-avatar-interact]');if(button&&event.pointerType!=='touch'&&!button.contains(event.relatedTarget))react(button,'LOOK_AROUND');
 });
 document.addEventListener('focusin',event=>{if(event.target.matches?.('[data-avatar-interact]'))react(event.target,'LOOK_AROUND');});
 document.addEventListener('visibilitychange',schedule);reduced.addEventListener('change',schedule);
 window.addEventListener('pagehide',()=>{advance();pageActive=false;sync();});
 window.addEventListener('pageshow',()=>{pageActive=true;schedule();});
 if(!intersection)window.addEventListener('scroll',()=>{
  for(const [node,entry]of scenes){const rect=node.getBoundingClientRect();entry.visible=rect.width>0&&rect.height>0&&rect.bottom>0&&rect.top<innerHeight;}
  schedule();
 },{passive:true});
 sync();
}
