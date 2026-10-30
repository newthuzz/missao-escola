// Keep the guide mascot next to welcome/help content, never over the exercise.
(()=>{
 const mascot='<img class="brand-mascot" src="./assets/mascot/mascot.webp" alt="" aria-hidden="true" width="160" height="192" decoding="async">';
 function decorate(){
  for(const selector of ['#personalized-route .lumi-mark','.profile-orb','.diagnostic-orbit','.diagnostic-result-hero>span:first-child']){
   const spot=document.querySelector(selector);if(!spot||spot.querySelector('img'))continue;
   spot.classList.add('has-mascot');spot.setAttribute('aria-hidden','true');spot.innerHTML=mascot;
  }
 }
 const personal=renderPersonalization;renderPersonalization=function(...args){const result=personal(...args);decorate();return result;};
 const diagnostic=renderDiagnostic;renderDiagnostic=function(...args){const result=diagnostic(...args);decorate();return result;};
 const diagnosticResult=renderDiagnosticResult;renderDiagnosticResult=function(...args){const result=diagnosticResult(...args);decorate();return result;};
 decorate();
})();
