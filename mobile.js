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
