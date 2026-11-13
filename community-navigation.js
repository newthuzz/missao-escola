import {mountSocial} from './social.js';
const personIcon='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/></svg>';
export function mountCommunityNavigation({getToken,getUser,isStaff,makeProfileReceiver}){
 const side=document.querySelector('.side-nav'),accountNav=document.createElement('button');accountNav.type='button';accountNav.className='nav-link account-nav';accountNav.dataset.page='social';accountNav.innerHTML=`<span class="account-nav-icon">${personIcon}</span><span><strong>Minha conta</strong><small>Perfil, amigos e sincronização</small></span>`;side.querySelector('.secondary-caption').after(accountNav);
 const mobile=document.createElement('button');mobile.type='button';mobile.dataset.page='social';mobile.className='mobile-account-nav';mobile.setAttribute('aria-label','Minha conta, perfil e amigos');mobile.innerHTML=`<span class="account-nav-icon">${personIcon}</span><span>Minha conta</span>`;document.querySelector('.mobile-nav').append(mobile);
 const ranks=document.querySelector('#page-conquistas'),intro=ranks.querySelector('.page-intro');ranks.querySelector('#badges-title').innerHTML='Ranks, ligas e conquistas';intro.querySelector('p').textContent='Participe da liga semanal ou acompanhe sua evolução pessoal. Pontos da liga e XP de estudo ficam separados.';
 const personal=document.createElement('section');personal.id='rank-personal-panel';personal.setAttribute('role','tabpanel');personal.setAttribute('aria-labelledby','rank-personal-tab');personal.tabIndex=0;
 while(intro.nextSibling)personal.append(intro.nextSibling);
 personal.insertAdjacentHTML('afterbegin','<p class="rank-personal-intro">Seus ranks pessoais e conquistas reconhecem sua evolução no estudo, sem depender da sua posição na liga.</p>');
 const tabs=document.createElement('div');tabs.className='ranks-tabs';tabs.setAttribute('role','tablist');tabs.setAttribute('aria-label','Ligas e evolução pessoal');tabs.innerHTML='<button type="button" role="tab" id="rank-league-tab" data-ranks-tab="league" aria-controls="rank-league-panel">Ligas semanais</button><button type="button" role="tab" id="rank-personal-tab" data-ranks-tab="personal" aria-controls="rank-personal-panel">Ranks e conquistas</button>';
 const league=document.createElement('section');league.id='rank-league-panel';league.setAttribute('role','tabpanel');league.setAttribute('aria-labelledby','rank-league-tab');league.tabIndex=0;league.innerHTML='<div id="league-features"></div>';ranks.append(tabs,league,personal);
 const leagueHost=league.querySelector('#league-features');let accountSlot=null,model=null,social=null,modelOwner=null,rankTab='league';
 function dispose(){model?.dispose();model=null;social?.remove();social=null;modelOwner=null;}
 function openLeagues(){selectTab('league');navigate('conquistas');}
 function selectTab(value,focus=false){rankTab=value;tabs.querySelectorAll('[data-ranks-tab]').forEach(b=>{const active=b.dataset.ranksTab===value;b.setAttribute('aria-selected',String(active));b.tabIndex=active?0:-1;if(active&&focus)b.focus();});league.hidden=value!=='league';personal.hidden=value!=='personal';update();}
 function update(){
  const owner=getUser();if(model&&(owner!==modelOwner||isStaff()||location.protocol==='file:'))dispose();
  if(isStaff()){if(accountSlot)accountSlot.innerHTML='<h2>Acesso institucional</h2><p>Use seu painel para acompanhar os atendimentos e as permissões da sua escola.</p>';leagueHost.innerHTML='';return;}
  if(!owner||location.protocol==='file:'){
   if(accountSlot)accountSlot.innerHTML='<h2>Perfil e amigos</h2><p>Entre na sua conta para personalizar seu perfil e encontrar amigos.</p>';
   leagueHost.innerHTML=location.protocol==='file:'?'<article class="social-box league-access"><h2>Ligas online</h2><p>Para participar das ligas, abra a versão online ou com servidor local e entre na sua conta. Seus ranks e conquistas pessoais continuam disponíveis neste arquivo.</p><button type="button" class="primary-button" data-ranks-login>Abrir minha conta</button></article>':'<article class="social-box league-access"><h2>Sua liga começa aqui</h2><p>Entre na sua conta para participar da liga semanal e continuar seus desafios. Seus ranks e conquistas pessoais continuam disponíveis sem login.</p><button type="button" class="primary-button" data-ranks-login>Entrar na minha conta</button></article>';return;
  }
  const inLeague=state.page==='conquistas'&&rankTab==='league',destination=inLeague?leagueHost:accountSlot;
  if(model&&!inLeague&&state.page!=='social')return;
  if(!destination)return;
  if(!model){social=document.createElement('article');social.id='social-features';social.className='social-box';destination.replaceChildren(social);modelOwner=owner;model=mountSocial(social,getToken,getUser,makeProfileReceiver(owner),{section:inLeague?'league':'community',onOpenAccount:()=>navigate('social'),onOpenLeagues:openLeagues});}
  else{if(social.parentElement!==destination)destination.replaceChildren(social);model.showSection(inLeague?'league':'community');}
 }
 tabs.addEventListener('click',e=>{const b=e.target.closest('[data-ranks-tab]');if(b)selectTab(b.dataset.ranksTab);});
 tabs.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();selectTab(e.key==='Home'?'league':e.key==='End'?'personal':rankTab==='league'?'personal':'league',true);});
 league.addEventListener('click',e=>{if(e.target.closest('[data-ranks-login]'))navigate('social');});
 document.addEventListener('click',e=>{const b=e.target.closest('[data-page="social"]');if(!b)return;if(model&&state.page==='social'){model.showSection('community',b.closest('.mobile-spaces')?'friends':'overview');}});
 window.addEventListener('missao-account-change',()=>{if(modelOwner!==getUser())dispose();update();});
 const previousNavigate=navigate;navigate=function(...args){const result=previousNavigate(...args);update();return result;};
 selectTab('league');
 return {renderAccount(slot){accountSlot=slot;update();},update};
}
