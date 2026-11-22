import {resolveRewardLook,renderLook} from './reward-look.js';
import {validAvatar} from './avatar-catalog.mjs';
import {avatar} from './social-art.js';
// Display-only bridge. Never writes study progress, XP or the local reward collection.
let account=null,chosen=null,revision=0;
function refresh(){
 const symbol=document.querySelector('#top-avatar-symbol');
 if(symbol){
  const badge=symbol.parentElement;
  badge.querySelector('svg')?.remove();
  symbol.hidden=Boolean(chosen);
  if(chosen)badge.insertAdjacentHTML('beforeend',avatar(chosen));
 }
 if(document.querySelector('#page-jornada.active'))window.renderMap?.();
}
export function setIslandAvatarAccount(id){
 const next=id||null;
 if(next===account)return;
 account=next;chosen=null;revision++;refresh();
}
export function islandAvatarReceiver(id){
 const expectedRevision=++revision;
 return profile=>{
  if(!account||id!==account||expectedRevision!==revision)return;
  const next=validAvatar(profile?.avatar)?profile.avatar:null;
  if(next===chosen)return;
  chosen=next;refresh();
 };
}
window.JourneyAvatar=Object.freeze({
 profile(){return chosen;},
 render(){
  const current=typeof progress==='undefined'?null:progress;
  const look=resolveRewardLook(current,chosen);
  const figure=renderLook(look,{figure:true,animated:true});
  return `<g class="journey-social-avatar" data-journey-avatar="${look.special||look.base}" data-journey-accessory="${look.accessory||''}" data-journey-effect="${look.effect||''}" aria-hidden="true">${figure.replace('<svg ', '<svg x="-24.5" y="-49" width="49" height="76" ')}</g>`;
 }
});
