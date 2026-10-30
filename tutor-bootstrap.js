/* Only the launcher and context events load initially. Chat/math load on first open. */
(() => {
  let lastAnswer=null,loading=null,panel=null;
  const launcher=document.createElement('button');
  launcher.id='tutor-launcher';launcher.type='button';launcher.className='tutor-launcher';
  launcher.setAttribute('aria-expanded','false');launcher.setAttribute('aria-controls','tutor-panel');
  launcher.setAttribute('aria-label','Abrir Tutor IA');
  launcher.innerHTML='<span aria-hidden="true"><img class="tutor-mascot" src="./assets/mascot/mascot.webp" alt="" width="48" height="56" decoding="async"></span><span><strong>Tutor IA</strong><small>Vamos aprender?</small></span>';
  document.body.append(launcher);
  const navigation=document.querySelector('.mobile-nav');
  const dockClearance=()=>document.documentElement.style.setProperty('--tutor-dock-bottom',Math.ceil(navigation?.getBoundingClientRect().height||144)+14+'px');
  if(navigation&&'ResizeObserver' in window)new ResizeObserver(dockClearance).observe(navigation);
  else window.addEventListener('resize',dockClearance);
  dockClearance();
  const snapshot=()=>{
    let q=null,mode='general',answer='';
    if(state.page==='diagnostico'&&learner.diagnostic&&!learner.diagnostic.finished){
      q=A.question(learner.diagnostic.questionIds[learner.diagnostic.answers.length]);mode='diagnostic';
      if(q&&Number.isInteger(state.diagnosticAnswer))answer=q.answers[state.diagnosticAnswer];
    }else if(state.page==='aprendizagem'){
      if(state.tool==='exercicios')q=state.currentQuestion;
      if(state.tool==='resumo')q=A.question(learner.plan?.exampleId)||state.currentQuestion;
      mode=q?'study':'general';
      if(q&&lastAnswer?.id===q.id)answer=q.answers[lastAnswer.index]||'';
    }
    return {mode,question:q?{id:q.id,unitId:q.unitId,subject:q.subject,level:q.level,question:q.question,answers:q.answers||[],correct:q.correct,explanation:q.explanation,hints:q.hints||[]}:null,studentAnswer:answer};
  };
  const changed=()=>window.dispatchEvent(new CustomEvent('missao-study-context'));
  for(const name of ['renderQuestion','renderDiagnostic','renderSummary','navigate','selectTool','answerQuestion']){
    const previous=window[name];if(typeof previous!=='function')continue;
    window[name]=function(...args){if(name==='answerQuestion'&&state.currentQuestion&&!state.answered)lastAnswer={id:state.currentQuestion.id,index:args[0]};const result=previous.apply(this,args);changed();return result;};
  }
  document.addEventListener('click',event=>{if(event.target.closest('[data-diagnostic-answer]'))changed();});
  window.TutorStudy=Object.freeze({snapshot,markHelped(id){if(id&&state.currentQuestion?.id===id&&state.page==='aprendizagem')state.helped=true;}});
  const css=document.createElement('link');css.rel='stylesheet';css.href='./tutor.css';document.head.append(css);
  launcher.addEventListener('click',async()=>{
    if(panel){panel.toggle();return;}
    if(loading)return;
    launcher.setAttribute('aria-busy','true');
    loading=import('./tutor-ui.js').then(module=>{panel=module.mountTutor(launcher);panel.toggle();}).catch(()=>{launcher.setAttribute('aria-label','Não foi possível abrir o tutor. Tentar novamente');}).finally(()=>{launcher.removeAttribute('aria-busy');loading=null;});
    await loading;
  });
})();
