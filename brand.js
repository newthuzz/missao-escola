// Match the guide's pose to the activity, without covering questions or controls.
(()=>{
 const images={welcome:'mascot',studying:'mascot-studying',thinking:'mascot-thinking',celebrating:'mascot-celebrating'};
 function mascot(pose){return `<img class="brand-mascot" data-mascot-pose="${pose}" src="./assets/mascot/${images[pose]}.webp" alt="" aria-hidden="true" width="88" height="96" decoding="async" loading="lazy">`;}
 function decorate(){
  for(const [selector,pose] of [
   ['#personalized-route .lumi-mark','studying'],
   ['.profile-orb','welcome'],
   ['.diagnostic-orbit','thinking'],
   ['.diagnostic-result-hero>span:first-child','celebrating']
  ]){
   const spot=document.querySelector(selector);if(!spot||spot.querySelector('img')?.dataset.mascotPose===pose)continue;
   spot.classList.add('has-mascot');spot.setAttribute('aria-hidden','true');spot.innerHTML=mascot(pose);
  }
  for(const [selector,pose] of [
   ['#summary-content>article.example-card','studying'],
   ...(learner.plan?.finished?[['#plan-result .plan-finish','celebrating']]:[])
  ]){
   const spot=document.querySelector(selector);if(!spot||spot.querySelector('.mascot-moment'))continue;
   spot.insertAdjacentHTML('afterbegin',`<span class="mascot-moment" aria-hidden="true">${mascot(pose)}</span>`);
  }
 }
 for(const name of ['renderPersonalization','renderDiagnostic','renderDiagnosticResult','renderSummary','renderPlan']){
  const previous=window[name];window[name]=function(...args){const result=previous.apply(this,args);decorate();return result;};
 }
 decorate();
})();
