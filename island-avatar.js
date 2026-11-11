import {validAvatar} from './avatar-catalog.mjs';
import {avatar} from './social-art.js';
// Display-only bridge. Never writes study progress, XP or the local reward collection.
let account=null,chosen=null,revision=0;
function refresh(){
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
 render(){
  if(!chosen)return '';
  const figure=avatar(chosen,{figure:true});
  return `<g class="journey-social-avatar" data-journey-avatar="${chosen}" aria-hidden="true">${figure.replace('<svg ', '<svg x="-22" y="-48" width="44" height="50" ')}</g>`;
 }
});
