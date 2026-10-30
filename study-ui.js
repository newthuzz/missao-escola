/* Progressive study improvements. Existing journey/reward handlers stay intact. */
(()=>{
 const oldPersonalization=renderPersonalization;
 let panelState='',panelLearner=null;
 renderPersonalization=function(){
  const signature=JSON.stringify([learner.profile,learner.preferences,learner.plan?.date,learner.plan?.subject,learner.plan?.level,learner.plan?.started,learner.plan?.finished,learner.observations.length,learner.observations.at(-1),today,state.subject,state.difficulty,progress.events.length,progress.purchases.length]);
  if(panelLearner===learner&&panelState===signature)return;
  panelLearner=learner;panelState=signature;oldPersonalization();renderChoices();
 };
 let savedState='',savedLearner=null;
 saveLearner=function(){
  const signature=JSON.stringify([learner.profile,learner.preferences,learner.observations.length,learner.observations.at(-1),learner.plan,learner.diagnostic,learner.presentations,learner.introDismissed]);
  if(savedLearner===learner&&savedState===signature)return;
  try{const raw=localStorage.getItem(PERSONAL_KEY);let legacy=false;try{legacy=JSON.parse(raw)?.version===1;}catch{}if(legacy&&!localStorage.getItem('missao-escola-personal-before-v2'))localStorage.setItem('missao-escola-personal-before-v2',raw);localStorage.setItem(PERSONAL_KEY,JSON.stringify(learner));savedState=signature;savedLearner=learner;document.querySelector('#study-storage-status')?.replaceChildren();}
  catch{storageOK=false;const el=document.querySelector('#study-storage-status');if(el)el.textContent='Não foi possível salvar neste navegador. Suas respostas continuam nesta sessão. Tente salvar uma cópia pela Minha conta antes de fechar.';toast('Armazenamento indisponível. Mantenha esta sessão aberta.');}
 };
 const settings=document.createElement('form');settings.id='study-settings';settings.className='social-box';
 settings.innerHTML=`<details><summary><span class="study-settings-icon" aria-hidden="true">☷</span><span><strong>Ajustar meu estudo de hoje</strong><small>Escolha seu tempo, tema e prioridades</small></span><span class="study-settings-tag">Opcional</span><span class="study-settings-chevron" aria-hidden="true">⌄</span></summary><p>Você pode começar sem preencher. Estas escolhas ajustam a duração e as sugestões.</p><div class="study-settings-grid"><label>Tempo disponível<select name="minutes"><option value="">Sugestão inicial</option><option value="5">5 minutos</option><option value="10">10 minutos</option><option value="15">15 minutos</option></select></label><label>Matéria da avaliação<select name="subject"><option value="">Nenhuma preferência</option></select></label><label>Tema que quero estudar<input name="topic" maxlength="80" placeholder="Ex.: frações ou equações"></label><label>Data da avaliação<input type="date" name="assessment"></label></div><button class="outline-button">Aplicar preferências</button><p role="status" id="study-settings-status"></p></details><p role="status" id="study-storage-status"></p><div class="study-backup-tools"><span class="study-backup-label">Suas cópias de segurança</span><div class="study-backup-actions"><button class="text-button" type="button" id="export-study-data"><span aria-hidden="true">↓</span> Baixar cópia dos estudos</button><button class="text-button" type="button" id="export-study-before"><span aria-hidden="true">↶</span> Cópia anterior à atualização</button></div></div>`;
 document.querySelector('#page-aprendizagem .subject-strip').after(settings);
 function fillSettings(){const pref=learner.preferences||{};settings.elements.subject.innerHTML='<option value="">Nenhuma preferência</option>'+A.subjects(learner).map(s=>`<option value="${s.id}">${esc(subjectName(s.id))}</option>`).join('');for(const key of ['minutes','topic','assessment','subject'])settings.elements[key].value=pref[key]||'';}
 settings.addEventListener('click',e=>{if(!['export-study-data','export-study-before'].includes(e.target.id))return;try{const previous=e.target.id==='export-study-before',raw=previous?localStorage.getItem('missao-escola-personal-before-v2'):JSON.stringify(learner,null,2);if(!raw){document.querySelector('#study-storage-status').textContent='Não há uma cópia anterior à atualização neste navegador.';return;}const url=URL.createObjectURL(new Blob([raw],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=previous?'missao-escola-antes-v2.json':'missao-escola-estudos.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}catch{document.querySelector('#study-storage-status').textContent='Não foi possível exportar a cópia neste navegador.';}});
 settings.addEventListener('submit',e=>{e.preventDefault();const values=Object.fromEntries(new FormData(settings));if(values.assessment&&!A.validDate(values.assessment)){document.querySelector('#study-settings-status').textContent='Confira a data da avaliação.';return;}A.setPreferences(learner,values);saveLearner();renderPersonalization();const matches=A.unitsFor(learner,state.subject).some(u=>(u.title+' '+u.area+' '+u.objective).toLocaleLowerCase('pt-BR').includes(values.topic.trim().toLocaleLowerCase('pt-BR')));document.querySelector('#study-settings-status').textContent=values.topic&&!matches?'Preferências salvas. Não encontramos esse tema na matéria atual. Confira o mapa de conteúdos ou tente outro termo.':'Preferências aplicadas. Prepare outro caminho para ajustar o plano atual.';});
 const choices=document.createElement('div');choices.id='study-choices';choices.className='study-choices';settings.after(choices);
 const studyArrow='<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M6 18 18 6M6 6h12v12"/></svg>';
 function studyIcon(subject){
  const paths={
   matematica:'<path d="M5 7h8M9 3v8m7 4 5 5m0-5-5 5M4 17h7m-7 4h7"/>',
   portugues:'<path d="M3 5c4-2 7-1 9 1 2-2 5-3 9-1v14c-4-2-7-1-9 1-2-2-5-3-9-1Z M12 6v14"/>',
   ciencias:'<path d="M19 4C8 3 2 9 6 16s14 1 13-12Z M5 20 15 9m-5 6h6m-6 0v-4"/>',
   historia:'<path d="M5 3h14M5 21h14M7 3v4l10 10v4M17 3v4 0L7 17v4"/>',
   geografia:'<circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18"/>',
   ingles:'<path d="M4 4h16v12H9l-5 4Z M8 8h8M8 12h5"/>',
   artes:'<path d="M12 3a9 9 0 1 0 0 18h2c2 0 3-3 1-4s-1-3 1-3h2c5 0 4-11-6-11Z"/><circle cx="7" cy="11" r=".8"/><circle cx="10" cy="7" r=".8"/><circle cx="15" cy="7" r=".8"/>',
   'educacao-fisica':'<path d="M2 12h5l3-8 4 16 3-8h5"/>',
   fisica:'<ellipse cx="12" cy="12" rx="10" ry="4"/><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(60 12 12)"/><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(120 12 12)"/>',
   quimica:'<path d="M9 3h6m-5 0v7L4 20h16l-6-10V3M7 15h10"/>',
   filosofia:'<path d="m12 3 9 9-9 9-9-9Z M9 12h6"/>',
   sociologia:'<circle cx="9" cy="8" r="3"/><path d="M3 21v-2a6 6 0 0 1 12 0v2M16 5a3 3 0 0 1 0 6m2 4a5 5 0 0 1 3 4v2"/>'
  };
  return '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">'+(paths[subject]||paths.filosofia)+'</svg>';
 }
 function renderChoices(){
  const options=A.recommend(learner,today).slice(0,3);
  choices.innerHTML=`<div class="study-choices-heading"><div><span class="section-kicker">UM PASSO DE CADA VEZ</span><h2>Caminhos para hoje</h2></div><p>Escolha por onde quer começar.</p></div><div class="study-choice-grid">${options.map((s,i)=>{
   const accent=/^#[0-9a-f]{6}$/i.test(s.color)?s.color:'#8eaaff';
   return `<article class="surface-card study-choice-card" style="--study-accent:${accent}"><div class="study-choice-top"><span class="study-choice-icon" aria-hidden="true">${studyIcon(s.id)}</span><span class="study-choice-category">${i===0?'Sugestão para você':i===1?'Outra possibilidade':'Explore também'}</span><span class="study-choice-index" aria-hidden="true">0${i+1}</span></div><h3>${esc(subjectName(s.id))}</h3><p class="study-choice-description">${esc(s.reason)}</p><div class="study-choice-footer"><small class="study-choice-status"><span aria-hidden="true"></span>${s.model.count<3?'Primeiros passos':'Continue sua prática'}</small><button class="study-choice-button" data-study-choice="${s.id}">Estudar esta matéria <span aria-hidden="true">${studyArrow}</span></button></div></article>`;
  }).join('')}</div>`;fillSettings();
 }
 const previousPlan=renderPlan;
 renderPlan=function(){previousPlan();const p=learner.plan;if(!p||p.date!==today||p.subject!==state.subject)return;
  const u=A.unit(A.question(p.exampleId)?.unitId),path=A.learningPath(learner,p.subject,today).find(x=>x.unit.id===u?.id),pending=path?.prerequisites.filter(x=>!x.stats.mastered)||[];
  const time=document.querySelector('.personal-time');if(time)time.textContent=`Cerca de ${p.estimatedMinutes||Math.min(A.minutes(learner),2+p.questionIds.length*2)} min · ${p.questionIds.length} ${p.questionIds.length===1?'prática':'práticas'}`;
  const head=document.querySelector('.personal-plan-heading');if(head)head.insertAdjacentHTML('afterend',`<article class="study-plan-context"><h3>Objetivo deste estudo</h3><p>${esc(u?.objective||'Resolver e explicar o raciocínio nas situações propostas.')}</p><p>Ao terminar, tente explicar uma solução sem consultar o exemplo. Isso ajuda a verificar o que ainda merece revisão.</p>${p.notice?`<p role="status">${esc(p.notice)}</p>`:''}${pending.length?`<details><summary>Confira as bases antes de seguir</summary><p>Não é um bloqueio. Você pode continuar neste estudo ou fazer uma checagem curta.</p>${pending.map(x=>`<p>${esc(x.stats.count?x.stats.status:'Ainda sem evidências')} · ${esc(x.unit.title)} <button class="text-button" data-study-base="${x.unit.id}">Checar esta base →</button></p>`).join('')}</details>`:''}<button class="text-button" id="repeat-study">Repetir esta sequência desde o início</button><small>Repetir no mesmo dia não duplica XP nem muda sua primeira tentativa.</small></article>`);
  const finish=document.querySelector('.plan-finish');if(finish&&p.finished){const info=A.sessionSummary(learner,p,today);finish.insertAdjacentHTML('beforeend',`<div class="study-summary" role="status"><h3>Seu próximo passo</h3><p>${info.independent} ${info.independent===1?'acerto independente':'acertos independentes'}; ${info.support} ${info.support===1?'questão para rever com apoio':'questões para rever com apoio'}.</p><p>${info.nextReview?'Próxima revisão prevista: '+esc(info.nextReview)+'.':'Pratique novamente em outro dia para reunir mais evidências.'}</p><p>Em outro contexto, o que mudaria no raciocínio? Sua explicação pessoal não recebe correção automática.</p><label>Minha explicação, só para refletir<textarea rows="3" placeholder="Explique um passo com suas palavras. Este texto não é salvo nem corrigido."></textarea></label></div>`);}
 };
 const oldQuestion=renderQuestion;
 renderQuestion=function(){oldQuestion();const q=state.currentQuestion;if(!q)return;
  if(A.model(learner,q.subject).count<3)document.querySelector('#practice-mode').textContent='CHECAGEM CURTA · AINDA TEMOS POUCAS EVIDÊNCIAS';
  let confidence=document.querySelector('#study-confidence');if(!confidence){confidence=document.createElement('label');confidence.id='study-confidence';confidence.innerHTML='Como você se sente para responder? · opcional<select><option value="">Prefiro não informar</option><option value="guess">Vou chutar</option><option value="unsure">Tenho dúvida</option><option value="sure">Consigo explicar</option></select>';document.querySelector('#choice-list').before(confidence);}confidence.querySelector('select').value='';
  document.querySelector('#exercise-result').setAttribute('role','status');
  let editorial=document.querySelector('#study-editorial');if(!editorial){editorial=document.createElement('small');editorial.id='study-editorial';document.querySelector('#practice-skill').after(editorial);}editorial.textContent=q.editorialStatus==='pending-pedagogical-review'?'Atividade nova · revisão pedagógica externa pendente':'';
 };
 const previousAnswer=answerQuestion;
 answerQuestion=function(answer){const q=state.currentQuestion;if(!q||state.answered)return;const confidence=document.querySelector('#study-confidence select')?.value||null;
  previousAnswer(answer);
  if(answer!==q.correct&&q.feedback?.[answer])document.querySelector('#exercise-result').textContent='Vamos revisar. '+q.feedback[answer];
  if(confidence==='guess'&&answer===q.correct)document.querySelector('#exercise-result').append(' Você informou que chutou. Tente explicar o raciocínio e confirme a compreensão em outra prática.');
 };
 showPracticeHint=function(){const q=state.currentQuestion;if(!q||state.answered)return;state.helped=true;state.hintIndex++;const u=A.unit(q.unitId),hint=q.hints?.[0]||`Procure o que a pergunta pede em “${q.skill}”. ${u?'Relembre o objetivo: '+u.objective:'Separe os dados e a ideia que relaciona as alternativas.'}`;
  const text=state.hintIndex===1?'Pista conceitual: '+hint:state.hintIndex===2?'Passo intermediário: '+(q.hints?.[1]||`Compare cada alternativa com os dados da pergunta. Qual mantém a relação descrita? Explique antes de escolher.`):'Solução comentada · estudo com apoio: '+q.explanation;
  document.querySelector('#practice-hint').hidden=false;document.querySelector('#practice-hint').textContent=text;document.querySelector('#practice-hint').setAttribute('role','status');toast('Esta tentativa será registrada como estudo com apoio.');
 };
 document.addEventListener('click',e=>{const b=e.target.closest('[data-study-choice],[data-study-base],#repeat-study');if(!b)return;
  if(b.dataset.studyChoice){startPersonalized(b.dataset.studyChoice);return;}
  if(b.id==='repeat-study'){if(!confirm('Reiniciar as etapas desta sequência? Seu histórico e os pontos já recebidos serão mantidos.'))return;learner.plan=A.repeatPlan(learner);saveLearner();renderPlan();return;}
  const u=A.unit(b.dataset.studyBase);if(u){state.subject=u.subject;state.difficulty='auto';learner.plan=A.makePlan(learner,u.subject,today,'auto',u.id);saveLearner();renderPersonalization();renderPlan();selectTool('recuperacao');}
 });
 window.addEventListener('storage',e=>{if(e.key===PERSONAL_KEY)renderChoices();});
 renderChoices();renderPlan();
})();
