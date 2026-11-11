// CSS owns every animation. JS only starts/pauses scenes as visibility changes.
let started=false;
export function startRewardMotion(){
 if(started||typeof document==='undefined'||typeof MutationObserver==='undefined')return;
 started=true;
 const selector='.reward-live-scene[data-animated="true"]',scenes=new Map();
 const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
 let scheduled=false;
 function sync(){
  scheduled=false;const modal=document.querySelector('dialog[open]');
  for(const [node,visible] of scenes){
   if(!node.isConnected){intersection?.unobserve(node);scenes.delete(node);continue;}
   const state=reduced.matches?'reduced':!document.hidden&&visible&&(!modal||modal.contains(node))?'running':'paused';
   if(node.dataset.motionState!==state)node.dataset.motionState=state;
  }
 }
 function schedule(){if(!scheduled){scheduled=true;queueMicrotask(sync);}}
 const intersection='IntersectionObserver' in window?new IntersectionObserver(entries=>{
  for(const entry of entries)if(scenes.has(entry.target))scenes.set(entry.target,entry.isIntersecting&&entry.intersectionRatio>0);
  schedule();
 },{threshold:0}):null;
 function collect(root){
  const nodes=[];if(root.matches?.(selector))nodes.push(root);nodes.push(...(root.querySelectorAll?.(selector)||[]));
  for(const node of nodes)if(!scenes.has(node)){scenes.set(node,!intersection&&node.getClientRects().length>0);intersection?.observe(node);}
 }
 collect(document.body);
 new MutationObserver(records=>{
  for(const record of records)for(const node of record.addedNodes)if(node.nodeType===1)collect(node);
  if(!intersection)for(const node of scenes.keys())scenes.set(node,node.getClientRects().length>0);
  schedule();
 }).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class','open']});
 document.addEventListener('visibilitychange',schedule);
 reduced.addEventListener('change',schedule);
 window.addEventListener('pagehide',()=>{for(const node of scenes.keys())node.dataset.motionState='paused';});
 window.addEventListener('pageshow',schedule);
 if(!intersection)window.addEventListener('scroll',()=>{
  for(const node of scenes.keys()){const rect=node.getBoundingClientRect();scenes.set(node,rect.width>0&&rect.height>0&&rect.bottom>0&&rect.top<innerHeight);}
  schedule();
 },{passive:true});
 sync();
}
