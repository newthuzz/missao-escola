/* Progressive routine form: reuse the existing validator, generator and save path. */
(()=>{
 const page=document.querySelector('#page-rotina'),form=document.querySelector('#routine-settings-form');
 const mode=page.querySelector('.routine-mode-grid'),manual=page.querySelector('#routine-manual-card'),calendar=page.querySelector('.routine-calendar-column'),windows=form.querySelector('#routine-windows-detail');
 const wizard=document.createElement('section');wizard.className='routine-wizard';
 const heading=document.createElement('div');heading.className='routine-wizard-progress';heading.innerHTML='<ol aria-label="Etapas da rotina"><li>Dias</li><li>Horários</li><li>Conferir</li></ol><p role="status" id="routine-step-status"></p>';
 const original=[...form.children];const days=document.createElement('section'),hours=document.createElement('section'),manualSlot=document.createElement('div');days.dataset.routineStep='1';hours.dataset.routineStep='2';manualSlot.append(manual);
 days.innerHTML='<h2 tabindex="-1">1. Em quais dias você pode estudar?</h2><p>Escolha pelo menos um dia. Você pode ajustar depois.</p><div class="routine-day-choices"></div>';
 for(const row of windows.querySelectorAll('.availability-row')){const label=row.querySelector('label'),input=label.querySelector('input');days.querySelector('.routine-day-choices').append(label);const name=document.createElement('span');name.textContent=R.days[Number(input.dataset.routineDay)].slice(0,3);row.prepend(name);}
 hours.innerHTML='<h2 tabindex="-1">2. Como prefere organizar os horários?</h2>';
 for(const button of mode.querySelectorAll('button')){button.type='button';button.querySelector('small').textContent='';button.querySelector('strong').textContent=button.dataset.routineMode==='auto'?'Quero uma sugestão':'Quero escolher meus horários';}
 windows.querySelector('summary').textContent='Horários disponíveis em cada dia';windows.open=true;
 hours.append(mode,windows);
 const advanced=document.createElement('details');advanced.className='routine-advanced';advanced.innerHTML='<summary>Mais ajustes: duração, matérias e compromissos</summary>';
 for(const node of original)if(node!==windows&&node.id!=='routine-generate'&&node.id!=='routine-generation-note')advanced.append(node);
 hours.append(advanced);form.replaceChildren(days,hours);
 const actions=document.createElement('div');actions.className='routine-step-actions';actions.innerHTML='<button type="button" class="outline-button" id="routine-step-back">Voltar</button><button type="button" class="primary-button" id="routine-step-next">Escolher horários →</button>';
 wizard.append(heading,form,manualSlot,calendar,actions);page.querySelector('.routine-state-bar').after(wizard);
 page.querySelector('.routine-layout').hidden=true;page.querySelector('.routine-intro .section-kicker').hidden=true;document.querySelector('#routine-title').textContent='Sua rotina de estudos';page.querySelector('.routine-intro p').textContent='Escolha os dias, ajuste os horários e confira antes de salvar.';
 // Keep the original IDs for existing renderers, but remove the duplicate submit action.
 const generate=original.find(n=>n.id==='routine-generate'),note=original.find(n=>n.id==='routine-generation-note');generate.hidden=true;generate.type='button';hours.append(generate,note);
 let step=routine.savedAt?3:1;
 function show(next,focus=true){step=next;days.hidden=next!==1;hours.hidden=next!==2;manualSlot.hidden=next!==2;calendar.hidden=next!==3;document.querySelector('#routine-step-back').hidden=next===1;document.querySelector('#routine-step-next').hidden=next===3;document.querySelector('#routine-step-next').textContent=next===1?'Escolher horários →':'Conferir minha semana →';heading.querySelectorAll('li').forEach((li,i)=>{if(i+1===next)li.setAttribute('aria-current','step');else li.removeAttribute('aria-current');});document.querySelector('#routine-step-status').textContent=`Etapa ${next} de 3`;for(const row of windows.querySelectorAll('.availability-row')){const key=row.querySelector('[data-routine-start]').dataset.routineStart;row.hidden=!days.querySelector(`[data-routine-day="${key}"]`).checked;}if(focus){heading.scrollIntoView({block:'start'});const title=(next===1?days:next===2?hours:calendar).querySelector('h2');title?.setAttribute('tabindex','-1');title?.focus({preventScroll:true});}}
 function next(){if(!A.schoolYear(learner)){requestGrade();return;}if(step===1){if(!days.querySelector('input:checked')){document.querySelector('#routine-step-status').textContent='Escolha pelo menos um dia para continuar.';return;}show(2);return;}if(!collectRoutineConfig())return;generateRoutine();if(routineWorking.sessions.length&&routineConflicts().length===0)show(3);else{document.querySelector('#routine-step-status').textContent=routineWorking.mode==='manual'?'Adicione pelo menos um bloco antes de conferir.':'Não encontramos um horário livre. Confira seus horários e compromissos.';}}
 document.querySelector('#routine-step-next').addEventListener('click',next);document.querySelector('#routine-step-back').addEventListener('click',()=>show(step-1));form.addEventListener('submit',event=>{event.preventDefault();if(step===1)show(2);else if(routineWorking.sessions.length&&!routineConflicts().length)show(3);});
 page.addEventListener('click',event=>{if(event.target.closest('[data-routine-add-day],[data-routine-edit-session]'))show(2,false);},true);
 const oldRender=renderRoutine;renderRoutine=function(...args){oldRender(...args);show(routine.savedAt&&!routineDirty?3:step,false);};show(step,false);
})();
