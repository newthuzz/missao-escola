/* Study first: reuse the existing plan actions, rewards and persistence. */
(()=>{
 const page=document.querySelector('#page-aprendizagem'),header=page.querySelector('.learning-header');
 const entry=document.createElement('section');entry.className='study-entry surface-card';entry.setAttribute('aria-label','Seu estudo de hoje');header.after(entry);
 const secondary=document.createElement('section');secondary.className='study-secondary';secondary.setAttribute('aria-label','Outras opções de estudo');
 const result=document.createElement('section');result.id='tool-concluido';result.className='tool-panel';page.append(result);
 const year=document.createElement('div');year.className='study-year-context';header.after(year);
 const notice=document.createElement('p');notice.id='study-notice';notice.setAttribute('role','status');notice.className='study-notice';
 const panels=[...page.querySelectorAll('.tool-panel')];entry.after(...panels,notice,secondary);
 const subjects=document.createElement('section');subjects.className='study-subject-picker';subjects.setAttribute('aria-label','Escolha uma matéria');year.after(subjects);
 const time=document.createElement('section');time.className='study-time';time.setAttribute('aria-label','Tempo para estudar');entry.after(time);
 const returnButton=document.createElement('button');returnButton.type='button';returnButton.className='text-button study-return';returnButton.dataset.studyHome='';returnButton.textContent='← Escolher outro estudo';returnButton.hidden=true;time.after(returnButton);
 const strip=page.querySelector('.subject-strip');strip.classList.add('study-legacy-controls');strip.hidden=true;secondary.append(strip);
 for(const node of [page.querySelector('#adaptive-insight'),page.querySelector('#study-choices')]){if(node){node.hidden=true;node.classList.add('study-legacy-controls');secondary.append(node);}}
 const settings=page.querySelector('#study-settings');
 if(settings){
  const details=settings.querySelector('details');details.querySelector('summary').remove();details.replaceWith(...details.childNodes);
  const heading=document.createElement('h3');heading.textContent='Sua prova ou seu tema';settings.prepend(heading);settings.hidden=true;
  settings.elements.minutes.closest('label').hidden=true;secondary.append(settings);
 }
 const topics=document.createElement('section');topics.className='study-topics';topics.setAttribute('aria-label','Escolher outro assunto');secondary.append(topics);
 const library=page.querySelector('#learning-library');library.hidden=true;secondary.append(library);
 const modes=document.createElement('section');modes.className='study-modes';modes.innerHTML='<h2>O que você quer fazer?</h2><p>Você também pode escolher uma atividade.</p>';
 const tabs=page.querySelector('.tool-tabs');
 for(const [id,title,description]of [['exercicios','Praticar questões','Responda no seu ritmo'],['resumo','Ver exemplos','Entenda com uma explicação'],['recuperacao','Revisar o que aprendi','Veja as etapas do seu estudo']]){
  const b=tabs.querySelector(`[data-tool="${id}"]`);b.querySelector('strong').textContent=title;b.querySelector('small').textContent=description;tabs.append(b);
 }
 modes.append(tabs);const difficulty=strip.querySelector('#difficulty-level').closest('label');difficulty.firstChild.textContent='Nível da prática livre';modes.append(difficulty);secondary.append(modes);
 const help=document.createElement('details');help.className='study-help';help.innerHTML='<summary>Como este estudo foi escolhido?</summary>';
 const explanation=header.querySelector('.adaptive-label');explanation.className='text-button';explanation.textContent='Entender minhas sugestões';help.append(explanation,page.querySelector('.ai-note'));secondary.append(help);
 let showPlan=false;
 const oldTool=selectTool;selectTool=function(tool){const value=oldTool(tool);const activity=tool!=='recuperacao'||showPlan;page.classList.toggle('study-in-activity',activity);returnButton.hidden=!activity;if(!activity)tabs.querySelectorAll('[data-tool]').forEach(b=>{b.classList.remove('active');b.setAttribute('aria-pressed','false');});return value;};
 const backup=page.querySelector('.study-backup-tools');
 if(backup){const details=document.createElement('details');details.className='study-option study-backup-settings';details.innerHTML='<summary><strong>Cópias dos meus estudos</strong><span>Baixe seus dados quando precisar.</span></summary>';details.append(backup);document.querySelector('#page-perfil').append(details);}
 function currentPlan(){const p=learner.plan;return p?.subject===state.subject?p:null;}
 function updateEntry(){
  document.querySelector('#learning-title').textContent='Seu estudo de hoje';
  document.querySelector('#learning-greeting').textContent='Entenda um exemplo, pratique e revise. Um passo de cada vez.';
  const grade=A.schoolYear(learner);page.classList.toggle('study-needs-grade',!grade);year.innerHTML=grade?`<span>${esc(gradeLabel(grade))}</span><button class="text-button" data-edit-grade>Trocar ano</button>`:'';
  subjects.innerHTML=grade?`<div class="study-section-intro"><span class="section-kicker">ESCOLHA POR ONDE COMEÇAR</span><h2>O que você quer estudar?</h2></div><div class="study-subject-buttons" role="group" aria-label="Matérias">${A.subjects(learner).map(item=>`<button type="button" data-study-select="${item.id}" aria-pressed="${item.id===state.subject}">${esc(subjectName(item.id).replace('Ciências / Biologia',grade<=9?'Ciências':'Biologia'))}</button>`).join('')}</div>`:'';
  const selectedTime=A.minutes(learner);
  time.innerHTML=`<div><h2>Quanto tempo você tem hoje?</h2><p>Escolha um tempo para o seu estudo.</p></div><div class="study-time-buttons" role="group" aria-label="Tempo disponível">${[5,10,15].map(value=>`<button type="button" data-study-minutes="${value}" aria-pressed="${value===selectedTime}">${value} min</button>`).join('')}</div><p class="study-time-feedback" role="status"></p><button type="button" class="text-button" data-study-preferences aria-expanded="${!settings?.hidden}" aria-controls="study-settings">Definir uma prova ou um tema (opcional)</button>`;
  const units=grade?A.unitsFor(learner,state.subject):[],previewUnits=units.slice(0,3);
  const expanded=!library.hidden;
  topics.innerHTML=`<div class="study-section-intro"><span class="section-kicker">VOCÊ TAMBÉM PODE ESCOLHER</span><h2>${units.length>1?'Escolher outro assunto':'Conhecer este assunto'}</h2><p>${esc(subjectName(state.subject))} · ${units.length>1?'veja alguns temas para estudar.':'veja a explicação e o objetivo do estudo.'}</p></div><div class="study-topic-grid">${previewUnits.map(u=>`<article class="study-topic-card"><span>${esc(u.area)}</span><h3>${esc(u.title)}</h3><p>${esc(u.objective)}</p><div><button type="button" class="outline-button" data-learning-unit="${u.id}">Estudar este assunto →</button><button type="button" class="text-button" data-learning-content="${u.id}">Ver explicação</button></div></article>`).join('')||'<p>Escolha uma matéria para ver seus assuntos.</p>'}</div><button type="button" class="text-button study-all-topics" data-study-all-topics aria-expanded="${expanded}" aria-controls="learning-library">${expanded?'Mostrar menos assuntos':'Ver todos os assuntos'}</button>`;
  if(!grade){entry.hidden=true;page.classList.add('study-unprepared');return;}entry.hidden=false;
  const p=currentPlan(),q=p?A.question(p.exampleId):null,u=q?A.unit(q.unitId):A.learningPath(learner,state.subject,today)[0]?.unit;
  const started=p?.started&&!p.finished,finished=p?.finished,readyToFinish=started&&p.reviewed&&p.questionIds.every(id=>p.answeredIds.includes(id));
  entry.innerHTML=`<div class="study-entry-copy"><span class="section-kicker">${finished?'ESTUDO CONCLUÍDO':'ESTUDO RECOMENDADO PARA VOCÊ'}</span><h2>${esc(u?.title||subjectName(state.subject))}</h2><p>${esc(u?.objective||'Um exemplo resolvido e uma sequência curta de atividades para aprender praticando.')}</p><span class="study-entry-meta">${esc(subjectName(state.subject))} · ${p?'cerca de '+p.estimatedMinutes:'até '+A.minutes(learner)} min${p?' · '+p.questionIds.length+' atividades':''}</span></div><button type="button" class="primary-button" id="study-begin">${finished?'Começar novo estudo':readyToFinish?'Concluir estudo':started?'Continuar estudo':'Começar estudo'} <span aria-hidden="true">→</span></button><ol class="study-entry-route" aria-label="Etapas do estudo"><li${p?.reviewed?' class="done"':''}>Exemplo guiado</li><li${p?.questionIds.length&&p.questionIds.every(id=>p.answeredIds.includes(id))?' class="done"':''}>Sua vez de tentar</li><li${finished?' class="done"':''}>Revisão e conclusão</li></ol>`;
  const reviewButton=tabs.querySelector('[data-tool="recuperacao"]');reviewButton.disabled=!p;reviewButton.querySelector('small').textContent=p?'Veja as etapas do seu estudo':'Disponível depois de começar';
  page.classList.toggle('study-unprepared',!p);
  if(p?.finished){const summary=A.sessionSummary(learner,p,today),answered=p.answeredIds.length;result.innerHTML=`<article class="surface-card study-result" aria-labelledby="study-result-title"><span class="section-kicker">ESTUDO CONCLUÍDO</span><h2 id="study-result-title" tabindex="-1">Você concluiu seu estudo!</h2><p>${answered} de ${p.questionIds.length} questões respondidas.</p><p>${summary.independent} acertos sem pistas; ${summary.support} questões para rever com apoio.</p><p>${p.legacyXP?'Seus pontos anteriores continuam na jornada. Total atual: '+J.xp(progress)+' XP.':(p.earnedXP||0)+' XP obtidos nesta sequência.'} Repetir uma atividade já pontuada hoje não duplica pontos.</p><div class="study-result-actions"><button class="primary-button" data-go="inicio">Voltar ao início</button><button class="outline-button" id="review-study">Rever questões</button></div><details><summary>Explicação da última questão</summary><p>${esc(state.currentQuestion?.explanation||'Você pode rever cada questão no plano do estudo.')}</p></details></article>`;}
 }
 const previousPlan=renderPlan;renderPlan=function(...args){const result=previousPlan.apply(this,args);updateEntry();return result;};
 const previousPersonalization=renderPersonalization;renderPersonalization=function(...args){const result=previousPersonalization.apply(this,args);updateEntry();return result;};
 function revealActivity(){
  const active=page.querySelector('.tool-panel.active');if(!active)return;
  active.scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
  const title=active.querySelector('h2,h3');if(title){title.tabIndex=-1;title.focus({preventScroll:true});}
 }
 function resumeStudy(scroll=true){
  showPlan=false;
  if(!A.schoolYear(learner)){requestGrade();return;}
  let p=currentPlan();
  if(!p||p.finished){document.querySelector(p?'#rebuild-plan':'#build-plan')?.click();p=currentPlan();}
  if(!p)return;
  if(!p.started)document.querySelector('#start-plan')?.click();
  if(!p.reviewed)document.querySelector('[data-plan-review]')?.click();
  else{const next=A.studyState(learner,today).nextQuestionId;if(next)document.querySelector(`[data-plan-question="${next}"]`)?.click();else finishStudy();}
  updateEntry();if(scroll)revealActivity();
 }
 window.resumeStudy=resumeStudy;
 window.showStudyResult=()=>{updateEntry();selectTool('concluido');revealActivity();};
 entry.addEventListener('click',event=>{if(event.target.closest('#study-begin'))resumeStudy();});
 page.addEventListener('click',event=>{if(event.target.closest('#review-study')){showPlan=true;selectTool('recuperacao');revealActivity();}});
 tabs.addEventListener('click',event=>{const b=event.target.closest('[data-tool]');if(!b)return;showPlan=b.dataset.tool==='recuperacao';if(b.dataset.tool==='exercicios'){state.planPractice=false;state.currentQuestion=null;renderQuestion();}queueMicrotask(revealActivity);});
 page.addEventListener('click',event=>{
  const b=event.target.closest('[data-study-select],[data-study-minutes],[data-study-preferences],[data-study-all-topics],[data-study-home]');if(!b)return;
  if(b.hasAttribute('data-study-home')){showPlan=false;selectTool('recuperacao');updateEntry();entry.scrollIntoView({block:'start'});entry.querySelector('button')?.focus({preventScroll:true});return;}
  if(b.dataset.studySelect){if(b.dataset.studySelect===state.subject)return;if(learner.plan?.started&&!learner.plan.finished&&!confirm('Trocar de matéria? Seu histórico será guardado antes de preparar outro estudo.'))return;showPlan=false;state.difficulty='auto';const select=page.querySelector('#subject-select');select.value=b.dataset.studySelect;select.dispatchEvent(new Event('change',{bubbles:true}));page.querySelector(`[data-study-select="${state.subject}"]`)?.focus();return;}
  if(b.dataset.studyMinutes){const value=Number(b.dataset.studyMinutes),plan=currentPlan();A.setPreferences(learner,{...learner.preferences,minutes:value});if(plan&&!plan.started&&!plan.finished)learner.plan=A.makePlan(learner,state.subject,today,state.difficulty,plan.unitId);saveLearner();renderPersonalization();renderPlan();const text=plan?.started&&!plan.finished?'Tempo salvo para o próximo estudo. Sua sequência atual foi mantida.':'Tempo salvo. Seu próximo estudo usará essa preferência.';time.querySelector('.study-time-feedback').textContent=text;time.querySelector(`[data-study-minutes="${value}"]`)?.focus();return;}
  if(b.hasAttribute('data-study-preferences')){settings.hidden=!settings.hidden;b.setAttribute('aria-expanded',String(!settings.hidden));if(!settings.hidden)settings.querySelector('[name="topic"]')?.focus();return;}
  if(b.hasAttribute('data-study-all-topics')){library.hidden=!library.hidden;b.setAttribute('aria-expanded',String(!library.hidden));b.textContent=library.hidden?'Ver todos os assuntos':'Mostrar menos assuntos';if(!library.hidden)library.querySelector('input')?.focus();}
 });
 document.addEventListener('click',event=>{
  if(!event.target.closest('#complete-summary'))return;const p=currentPlan();if(!p?.reviewed||!p.started)return;
  const next=p.questionIds.find(id=>!p.answeredIds.includes(id));
  if(next){document.querySelector(`[data-plan-question="${next}"]`)?.click();revealActivity();}else finishStudy();
 });
 if(learner.plan&&!learner.plan.finished&&state.subject!==learner.plan.subject){state.subject=learner.plan.subject;state.currentQuestion=null;renderPersonalization();renderSummary();}
 selectTool(state.tool);renderPlan();if(state.page==='aprendizagem'){if(learner.plan?.finished)window.showStudyResult();else if(learner.plan?.started)resumeStudy(false);}
})();
