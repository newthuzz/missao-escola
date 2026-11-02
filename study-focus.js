/* Study first: reuse the existing plan actions, rewards and persistence. */
(()=>{
 const page=document.querySelector('#page-aprendizagem'),header=page.querySelector('.learning-header');
 const entry=document.createElement('section');entry.className='study-entry surface-card';entry.setAttribute('aria-label','Seu estudo de hoje');header.after(entry);
 const secondary=document.createElement('section');secondary.className='study-secondary';secondary.setAttribute('aria-label','Outras opções de estudo');
 const panels=[...page.querySelectorAll('.tool-panel')];entry.after(...panels,secondary);
 function optional(title,description,nodes){
  const details=document.createElement('details');details.className='study-option';
  const summary=document.createElement('summary'),label=document.createElement('strong'),note=document.createElement('span');
  label.textContent=title;note.textContent=description;summary.append(label,note);details.append(summary,...nodes.filter(Boolean));secondary.append(details);return details;
 }
 const tabs=page.querySelector('.tool-tabs');
 optional('Trocar matéria','Escolha outro assunto para estudar.',[page.querySelector('.subject-strip'),page.querySelector('#adaptive-insight'),page.querySelector('#study-choices')]);
 const settings=page.querySelector('#study-settings');if(settings)secondary.append(settings);
 optional('Explorar conteúdos','Busque temas e habilidades da sua matéria.',[page.querySelector('#learning-library')]);
 optional('Outras formas de estudar','Prática livre, exemplos e visão das etapas.',[tabs]);
 optional('Como funciona a personalização','Entenda as sugestões e o uso da IA.',[header.querySelector('.adaptive-label'),page.querySelector('.ai-note')]);
 const backup=page.querySelector('.study-backup-tools');
 if(backup){const details=document.createElement('details');details.className='study-option study-backup-settings';details.innerHTML='<summary><strong>Cópias dos meus estudos</strong><span>Baixe seus dados quando precisar.</span></summary>';details.append(backup);document.querySelector('#page-perfil').append(details);}
 function currentPlan(){const p=learner.plan;return p?.date===today&&p.subject===state.subject?p:null;}
 function updateEntry(){
  document.querySelector('#learning-title').textContent='Seu estudo de hoje';
  document.querySelector('#learning-greeting').textContent='Entenda um exemplo, pratique e revise. Um passo de cada vez.';
  const p=currentPlan(),q=p?A.question(p.exampleId):null,u=q?A.unit(q.unitId):null;
  const started=p?.started&&!p.finished,finished=p?.finished,readyToFinish=started&&p.reviewed&&p.questionIds.every(id=>p.answeredIds.includes(id));
  entry.innerHTML=`<div class="study-entry-copy"><span class="section-kicker">${finished?'ESTUDO CONCLUÍDO':'SEU PRÓXIMO PASSO'}</span><h2>${esc(u?.title||subjectName(state.subject))}</h2><p>${esc(u?.objective||'Um exemplo resolvido e uma sequência curta de atividades para aprender praticando.')}</p><span class="study-entry-meta">${esc(subjectName(state.subject))} · cerca de ${p?.estimatedMinutes||A.minutes(learner)} min${p?' · '+p.questionIds.length+' atividades':''}</span></div><button type="button" class="primary-button" id="study-begin">${finished?'Começar novo estudo':readyToFinish?'Concluir estudo':started?'Continuar estudo':'Começar estudo'} <span aria-hidden="true">→</span></button><ol class="study-entry-route" aria-label="Etapas do estudo"><li${p?.reviewed?' class="done"':''}>Exemplo guiado</li><li${p?.questionIds.length&&p.questionIds.every(id=>p.answeredIds.includes(id))?' class="done"':''}>Sua vez de tentar</li><li${finished?' class="done"':''}>Revisão e conclusão</li></ol>`;
  page.classList.toggle('study-unprepared',!p);
 }
 const previousPlan=renderPlan;renderPlan=function(...args){const result=previousPlan.apply(this,args);updateEntry();return result;};
 const previousPersonalization=renderPersonalization;renderPersonalization=function(...args){const result=previousPersonalization.apply(this,args);updateEntry();return result;};
 function revealActivity(){
  const active=page.querySelector('.tool-panel.active');if(!active)return;
  active.scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
  const title=active.querySelector('h2,h3');if(title){title.tabIndex=-1;title.focus({preventScroll:true});}
 }
 entry.addEventListener('click',event=>{
  if(!event.target.closest('#study-begin'))return;
  let p=currentPlan();
  if(!p||p.finished){document.querySelector(p?'#rebuild-plan':'#build-plan')?.click();p=currentPlan();}
  if(!p)return;
  if(!p.started)document.querySelector('#start-plan')?.click();
  if(!p.reviewed)document.querySelector('[data-plan-review]')?.click();
  else{const next=p.questionIds.find(id=>!p.answeredIds.includes(id));
   if(next)document.querySelector(`[data-plan-question="${next}"]`)?.click();
   else{document.querySelector('#finish-plan')?.click();renderPlan();selectTool('recuperacao');}
  }
  updateEntry();revealActivity();
 });
 tabs.addEventListener('click',event=>{if(event.target.closest('[data-tool]'))revealActivity();});
 document.addEventListener('click',event=>{
  if(!event.target.closest('#complete-summary'))return;const p=currentPlan();if(!p?.reviewed||!p.started)return;
  const next=p.questionIds.find(id=>!p.answeredIds.includes(id));
  if(next){document.querySelector(`[data-plan-question="${next}"]`)?.click();revealActivity();}
 });
 if(learner.plan?.date===today&&!learner.plan.finished&&state.subject!==learner.plan.subject){state.subject=learner.plan.subject;state.currentQuestion=null;renderPersonalization();renderSummary();}
 renderPlan();
})();
