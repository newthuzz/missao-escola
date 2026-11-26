/* Student dashboard. The check-in exists only in the current page. */
(() => {
 const guides = {
  acompanho: ['Que bom que você encontrou um ritmo. Veja o que está previsto para a semana ou retome seu plano.',
   [['Abrir meu plano', {go:'aprendizagem'}], ['Ver rotina da semana', {go:'rotina'}]]],
  materias: ['Escolha um tema para revisar ou peça ajuda para entender o que ficou difícil.',
   [['Ver conteúdos de recuperação', {homeStudy:'topics'}], ['Pedir ajuda pedagógica', {homeSupport:'overview'}]]],
  tempo: ['Planeje um bloco curto na rotina ou escolha um tempo disponível para estudar hoje.',
   [['Organizar minha rotina', {go:'rotina'}], ['Escolher tempo de estudo', {homeStudy:'time'}]]],
  frequencia: ['Se está difícil ir à escola, converse com a coordenação ou com um adulto de confiança. Eles podem ajudar a encontrar um próximo passo.',
   [['Abrir Rede de Apoio', {go:'apoio'}], ['Buscar apoio para permanecer na escola', {go:'oportunidades'}]]],
  professor: ['O canal pedagógico mostra os professores autorizados para sua turma, quando sua escola participa.',
   [['Encontrar um professor', {homeSupport:'directory'}], ['Acompanhar meus pedidos', {homeSupport:'requests'}]]],
  oportunidades: ['Confira materiais gratuitos, programas educacionais e caminhos para retomar os estudos.',
   [['Abrir Central de Oportunidades', {go:'oportunidades'}]]]
 };
 const options = [...document.querySelectorAll('[data-home-checkin]')];
 const result = document.querySelector('#home-checkin-result');
 const guidance = document.querySelector('#home-checkin-guidance');
 const links = document.querySelector('#home-checkin-links');
 const format = new Intl.NumberFormat('pt-BR');
 const countLabel = (value,singular,plural) => format.format(value)+' '+(value===1?singular:plural);

 function resetCheckin() {
  if(result.hidden)return;
  options.forEach(option=>option.setAttribute('aria-pressed','false'));
  guidance.textContent='';
  links.replaceChildren();
  result.hidden=true;
 }

 function showGuide(option) {
  if(option.getAttribute('aria-pressed')==='true'){resetCheckin();return;}
  const [message,actions]=guides[option.dataset.homeCheckin];
  options.forEach(button=>button.setAttribute('aria-pressed',String(button===option)));
  links.replaceChildren(...actions.map(([label,destination],index)=>{
   const button=document.createElement('button');
   button.type='button';
   button.className=index===0?'primary-button':'outline-button';
   button.textContent=label;
   Object.assign(button.dataset,destination);
   return button;
  }));
  result.hidden=false;
  guidance.textContent=message;
 }

 function render() {
  const plan=learner.plan;
  const answers=progress.events.filter(event=>event.kind==='questao').length;
  $('home-study-progress').textContent=plan?.started
   ? format.format(plan.answeredIds.length)+' de '+countLabel(plan.questionIds.length,'questão do plano resolvida','questões do plano resolvidas')+'.'
   : answers?countLabel(answers,'questão resolvida registrada','questões resolvidas registradas')+'.':'Nenhuma atividade registrada ainda.';

  const total=routine.sessions.length;
  const done=routine.sessions.filter(session=>R.completed(routine,session.id,today)).length;
  $('home-weekly-progress').textContent=routine.savedAt&&total
   ? format.format(done)+' de '+countLabel(total,'bloco planejado concluído','blocos planejados concluídos')+' nesta semana.'
   : 'Monte uma rotina para planejar seus estudos.';

  const units=new Set([...learner.planHistory,plan].filter(item=>item?.finished&&item.unitId).map(item=>item.unitId));
  $('home-completed-content').textContent=units.size
   ? countLabel(units.size,'unidade concluída','unidades concluídas')+' nos estudos salvos.'
   : 'Nenhuma unidade concluída nos estudos salvos.';

  const grade=A.schoolYear(learner);
  const observed=new Set(learner.observations.map(item=>A.canonical(item.questionId)));
  const pending=[...observed].map(A.question).filter(q=>q&&grade&&q.minGrade<=grade&&A.reviewInfo(learner,q,today).overdue).length;
  $('home-recovery-progress').textContent=pending
   ? countLabel(pending,'questão com revisão sugerida','questões com revisão sugerida')+'.'
   : observed.size?'Nenhuma revisão pendente para hoje.':'Suas revisões aparecem após as primeiras tentativas.';

  const balance=J.coins(progress);
  const completedStudies=progress.events.filter(event=>event.kind==='fim').length;
  const journey=J.progress(progress);
  const available=J.rewards.filter(item=>!J.rewardPurchaseError(progress,item,balance)).length;
  $('home-mission-points').textContent=countLabel(balance,'estrela','estrelas');
  $('home-reward-goal').textContent=!completedStudies?'Concluir seu primeiro estudo.':completedStudies<3
   ? 'Concluir três estudos · '+completedStudies+' de 3.'
   : countLabel(journey.remaining,'XP','XP')+' para chegar a '+journey.nextIsland.name+'.';
  $('home-redeemable').textContent=available
   ? countLabel(available,'item disponível','itens disponíveis')+' para resgate.'
   : 'Continue juntando estrelas para resgatar itens.';
 }

 document.addEventListener('click',event=>{
  const button=event.target.closest('button');
  if(!button||button.disabled)return;
  const {homeCheckin,homeSupport,homeStudy}=button.dataset;
  if(homeCheckin){showGuide(button);return;}
  if(homeSupport){navigate('apoio',true,{supportView:homeSupport});return;}
  if(homeStudy){
   navigate('aprendizagem');
   if(state.page==='aprendizagem'&&A.schoolYear(learner))window.showStudyEntry?.(homeStudy);
  }
 });
 window.MissaoHome=Object.freeze({render,resetCheckin});
})();
