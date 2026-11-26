import {getAccountToken, getAccountUser} from './account.js';
import {request} from './cloud-api.mjs';
import {renderRewardsAdmin, readAdminForm, populateAdminForm} from './mission-rewards-admin.js';

const page = document.querySelector('#mission-rewards');
const view = document.querySelector('#mp-view');
const notice = document.querySelector('#mp-mode-notice');
const status = document.querySelector('#mp-status');
const homeBalance = document.querySelector('#home-mission-points');
const programBalance = document.querySelector('#mp-program-balance');
function showProgramBalance(value) {
 homeBalance.textContent=value===null?'—':number.format(value);
 programBalance.textContent=value===null?'— MP':points(value);
}
const number = new Intl.NumberFormat('pt-BR');
const date = new Intl.DateTimeFormat('pt-BR', {dateStyle:'short', timeStyle:'short'});
export const rewardStatus = {requested:'Solicitado',pending:'Aguardando aprovação',approved:'Aprovado',preparing:'Em preparação',delivered:'Entregue',refused:'Recusado',cancelled:'Cancelado'};
export const categories = {retention:'Permanência escolar',education:'Desenvolvimento educacional',digital:'Recompensas digitais'};
export const ruleNames = {activity:'Atividade educacional',recovery:'Recuperação',goal:'Meta personalizada',project:'Projeto escolar validado',special:'Missão especial'};
export const escape = value => String(value ?? '').replace(/[&<>"']/g, char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
export const points = value => number.format(value)+' MP';
export const time = value => date.format(new Date(value));
let mode = 'real';
let stateData, adminData, historyOffset = 0, adminOffset = 0;
let adminVisible = false;
let owner = getAccountUser();
let version = 0;
let busy = false;
let modal;
const pendingRequests = new Map();

function call(operation, body={}, targetMode=mode) {
 const user=getAccountUser();
 return getAccountToken().then(token=>{
  if(!user||getAccountUser()!==user)throw Error('A sessão mudou. Entre novamente.');
  return request('/rest/v1/rpc/mission_rewards_action',{
   token, method:'POST', body:{p_mode:targetMode,p_op:operation,p_body:body}
  });
 }).catch(error=>{
  if(error instanceof TypeError)throw Error('Não foi possível confirmar a operação. Confira a conexão e tente novamente.');
  throw error;
 });
}

const empty = message=>'<p class="mp-empty">'+escape(message)+'</p>';
const action = (op, label, id='')=>'<button type="button" class="outline-button" data-mp-action="'+op+'" value="'+escape(id)+'">'+escape(label)+'</button>';
function detail(id,title,content,opened) {
 return '<details class="mp-information" data-mp-detail="'+id+'"'+(opened.has(id)?' open':'')+'><summary>'+title+'</summary>'+content+'</details>';
}
const badge = (text)=>'<span class="mp-badge">'+escape(text)+'</span>';

function catalog(data) {
 if(!data.catalog.length)return empty('Nenhum benefício confirmado está disponível neste ambiente.');
 return Object.entries(categories).map(([code,label])=>{
  const items=data.catalog.filter(item=>item.category===code);
  if(!items.length)return '';
  return '<h3>'+label+'</h3><div class="mp-grid">'+items.map(item=>{
   const available=item.available>0;
   const images={school:'school',study:'study',rewards:'rewards',routine:'routine',opportunities:'opportunities'};
   const icon=images[item.image]||'rewards';
   const type=mode==='demo'?'Demonstrativo':code==='digital'?'Digital':'Benefício real';
   const note=item.redeemed?'Resgate registrado':!item.eligible?'Verifique o vínculo exigido':!available?'Sem estoque':data.balance<item.cost?'Saldo insuficiente':'';
   return `<article class="mp-card"><svg viewBox="0 0 24 24" aria-hidden="true"><use href="#nav-icon-${icon}"/></svg>${badge(type)}
   <h4>${escape(item.title)}</h4><p>${escape(item.description)}</p>
   <p><strong>${points(item.cost)}</strong> · ${number.format(item.available)} ${item.available===1?'disponível':'disponíveis'}</p>
   <p>Elegibilidade: ${escape(item.eligibility)}${item.partner?' · '+escape(item.partner):''}</p>
   <p>${escape(item.conditions)}</p>${note?'<p class="mp-empty">'+note+'</p>':action('confirm','Solicitar resgate',item.code)}</article>`;
  }).join('')+'</div>';
 }).join('');
}

function missions(data) {
 const rule=data.rules.find(item=>item.kind==='goal'&&item.active);
 const goal=data.goal;
 const verified=data.verifiedStudies?.length?'<article class="mp-card"><h3>Práticas verificadas nas ligas</h3><p>Uma prática concluída por dia pode valer pontos, independentemente do placar.</p><div class="mp-controls">'+
  data.verifiedStudies.map(item=>action('claim_verified','Registrar prática de '+item.day.split('-').reverse().slice(0,2).join('/'),item.id)).join('')+'</div></article>':'';
 let goalHtml='';
 if(rule){
  const title='<h3>Meta personalizada · '+points(rule.points)+'</h3>';
  if(!goal)goalHtml=title+`<form data-mp-form="set_goal"><label>Atividades verificadas nesta semana
   <select name="target">${[rule.goal_min,rule.goal_min+1,rule.goal_min+2].map(n=>'<option value="'+n+'">'+n+' atividades</option>').join('')}</select></label>
   <button class="outline-button">Definir minha meta</button></form>`;
  else goalHtml=title+`<p>${goal.done} de ${goal.target} atividades após definir a meta.</p>`+
   (goal.claimed?badge('Meta reconhecida'):goal.done>=goal.target?action('claim_goal','Receber pontos da meta'):'');
 }
 return '<div class="mp-grid">'+(data.campaigns.length?data.campaigns.map(item=>`<article class="mp-card">
  ${badge(ruleNames[item.kind])}<h3>${escape(item.title)}</h3><p>${escape(item.instructions)}</p>
  ${item.completed_at?badge(item.earned?'Concluída · '+points(item.earned):'Concluída'):`<p><strong>${points(item.points)}</strong></p>${item.kind==='project'?'<p>A escola confirma a participação.</p>':action('challenge','Começar atividade',item.code)}`}</article>`).join(''):empty('Nenhuma atividade elegível agora.'))+
  (goalHtml?'<article class="mp-card">'+goalHtml+'</article>':'')+verified+'</div>';
}

function history(data) {
 const names={earn:'Crédito',reserve:'Reserva',refund:'Estorno',adjust:'Ajuste',deliver:'Entrega'};
 const values=data.history.slice(0,20);
 return (values.length?'<ul class="mp-history">'+values.map(item=>`<li><div><strong>${escape(item.description)}</strong><small>${names[item.kind]} · ${time(item.created_at)}</small></div><strong>${item.delta>0?'+':''}${points(item.delta)}</strong></li>`).join('')+'</ul>':empty('Nenhuma movimentação nesta página.'))+
  '<div class="mp-controls">'+(historyOffset?action('history_previous','Histórico anterior'):'')+(data.history.length>20?action('history_next','Mais movimentações'):'')+'</div>';
}

function redemptions(data) {
 return data.redemptions.length?'<div class="mp-grid">'+data.redemptions.map(item=>{
  const canCancel=['requested','pending'].includes(item.status);
  const canSimulate=mode==='demo'&&['requested','pending','approved','preparing'].includes(item.status);
  return `<article class="mp-card"><h3>${escape(item.item_title)}</h3>${badge(rewardStatus[item.status])}
  <p>${points(item.cost)} · ${time(item.created_at)}</p><div class="mp-controls">
  ${canCancel?action('cancel','Cancelar pedido',item.id):''}${canSimulate?action('demo_advance','Simular próxima etapa',item.id):''}</div></article>`;
 }).join('')+'</div>':empty('Você ainda não tem pedidos.');
}

function paint() {
 if(!stateData)return;
 const opened = new Set([...view.querySelectorAll('[data-mp-detail][open]')].map(item=>item.dataset.mpDetail));
 view.innerHTML=`<div class="mp-controls mp-wallet-controls">
 ${action('reload','Atualizar')}${stateData.canAdmin?action('admin_toggle',adminVisible?'Fechar administração':'Administrar programa'):''}</div>`+
 (adminVisible&&adminData?renderRewardsAdmin(adminData,stateData.rules,mode,adminOffset):'')+
 (mode==='demo'?'<p class="mp-demo-balance"><strong>Saldo de teste: '+points(stateData.balance)+'</strong></p>':'')+
 '<section class="mp-panel"><h2>Catálogo de benefícios</h2>'+catalog(stateData)+'</section>'+
 detail('missions','Como ganhar MP',missions(stateData),opened)+
 detail('redemptions','Meus resgates',redemptions(stateData),opened)+
 detail('history','Histórico da carteira','<p>Pontos acumulados em atividades: <strong>'+points(stateData.total)+'</strong></p>'+history(stateData),opened)+
 detail('partners','Instituições parceiras',stateData.partners.length?'<div class="mp-grid">'+stateData.partners.map(item=>`<article class="mp-card"><h3>${escape(item.name)}</h3><p>${escape(item.summary)}</p></article>`).join('')+'</div>':empty(mode==='demo'?'Este catálogo contém exemplos e funciona sem parceiros.':'Nenhuma parceria confirmada publicada.'),opened);

}

async function refresh(ticket=version) {
 const currentMode=mode;
 const [data,admin]=await Promise.all([call('state',{offset:historyOffset}),adminVisible?call('admin_state',{offset:adminOffset}):null]);
 if(ticket!==version)return;
 stateData=data;
 adminData=admin;
 if(currentMode==='real')showProgramBalance(data.balance);
 paint();
}

function report(error) {
 status.textContent=['PGRST202','42883'].includes(error.code)||error.status===404
  ?'A carteira ainda não está disponível neste servidor.'
  :error.message;
 status.classList.add('is-error');
}

function resetStatus(message='') {
 status.textContent=message;
 status.classList.remove('is-error');
}

async function load() {
 const ticket=++version;
 stateData=null;
 adminData=null;
 resetStatus();
 page.querySelectorAll('[data-mp-mode]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.mpMode===mode)));
 notice.textContent=mode==='demo'?'Modo demonstrativo · Pontos fictícios e resgates simulados':'Use seus pontos para resgatar benefícios.';
 notice.classList.toggle('is-demo',mode==='demo');
 if(!getAccountUser()){
  view.innerHTML=empty('Entre com sua conta para acessar as atividades e salvar a carteira deste ambiente.')+
   '<button type="button" class="primary-button" data-go="social">Entrar na minha conta</button>';
  return;
 }
 view.innerHTML=empty('Carregando a carteira…');
 try{await refresh(ticket);}
 catch(error){
  if(ticket!==version)return;
  report(error);
  view.innerHTML=action('reload','Tentar novamente');
 }
}

function showDialog(title, contents) {
 modal?.close();
 const opener=document.activeElement;
 const dialog=document.createElement('dialog');
 dialog.className='mp-dialog';
 dialog.setAttribute('aria-labelledby','mp-dialog-title');
 dialog.innerHTML=`<h2 id="mp-dialog-title">${escape(title)}</h2><p data-mp-feedback role="status"></p>${contents}
 <button type="button" class="outline-button" data-mp-action="close">Fechar</button>`;
 modal=dialog;
 page.append(dialog);
 dialog.addEventListener('close',()=>{
  if(modal===dialog)modal=null;
  dialog.remove();
  opener?.focus();
 });
 dialog.showModal();
}

async function challenge(code, ticket) {
 const data=await call('challenge',{code});
 if(ticket!==version)return;
 showDialog(data.title,`<p>${escape(data.instructions)}</p><form data-mp-form="complete" data-code="${escape(code)}">
 ${data.questions.map((question,i)=>`<fieldset><legend>${escape(question.prompt)}</legend>
 ${question.options.map((label,n)=>`<label><input type="radio" name="q${i}" required value="${n}"> ${escape(label)}</label>`).join('')}</fieldset>`).join('')}
 <button class="primary-button">Conferir respostas</button></form>`);
}

function confirmItem(code) {
 const item=stateData.catalog.find(entry=>entry.code===code);
 if(!item)return;
 const key=mode+':'+code;
 if(!pendingRequests.has(key))pendingRequests.set(key,crypto.randomUUID());
 showDialog(item.title,`<p>Serão reservados <strong>${points(item.cost)}</strong>. ${escape(item.conditions)}</p>
 <form data-mp-form="redeem" data-code="${escape(code)}"><button class="primary-button">Confirmar resgate</button></form>`);
}

async function perform(control, work) {
 if(busy)return;
 const ticket=version;
 busy=true;
 if(control)control.disabled=true;
 resetStatus();
 try{await work(ticket);}
 catch(error){
  if(ticket===version){
   const feedback=modal?.querySelector('[data-mp-feedback]');
   if(feedback)feedback.textContent=error.message;
   else report(error);
  }
 }finally{busy=false;if(control)control.disabled=false;}
}

page.addEventListener('click',event=>{
 const button=event.target.closest('button');
 if(!button)return;
 const chosen=button.dataset.mpMode;
 if(chosen){
  if(chosen!==mode){
   modal?.close();
   mode=chosen;
   historyOffset=0;adminOffset=0;adminVisible=false;
   void load();
  }
  return;
 }
 const op=button.dataset.mpAction;
 if(!op)return;
 const id=button.value;
 if(op==='confirm')return confirmItem(id);
 if(op==='close')return modal?.close();
 if(op==='reload'&&!stateData)return void load();
 void perform(button,async ticket=>{
  if(op==='challenge'){await challenge(id,ticket);return;}
  if(op==='history_previous')historyOffset=Math.max(0,historyOffset-20);
  if(op==='history_next')historyOffset+=20;
  if(op==='admin_previous')adminOffset=Math.max(0,adminOffset-50);
  if(op==='admin_next')adminOffset+=50;
  if(op==='admin_toggle'){adminVisible=!adminVisible;adminOffset=0;}
  if(['cancel','demo_advance','claim_goal','claim_verified'].includes(op)){
   const body=id?{id}:{};
   if(op==='demo_advance')body.expected_status=stateData.redemptions.find(item=>item.id===id)?.status;
   const result=await call(op,body);
   if(ticket!==version)return;
   resetStatus(op==='claim_goal'||op==='claim_verified'
    ?result.earned?'Progresso reconhecido · '+points(result.earned):'Registro já existente ou limite de pontos atingido.'
    :rewardStatus[result.status]);
  }
  await refresh(ticket);
  if(ticket===version)view.querySelector('[data-mp-action="'+op+'"]')?.focus();
 });
});

page.addEventListener('change',event=>{
 const {target}=event;
 if(adminData&&(target.name==='editor'||(target.name==='code'&&target.form?.dataset.mpForm==='admin_rule')))
  populateAdminForm(target.form,target.value,adminData,stateData.rules);
});

page.addEventListener('submit',event=>{
 const form=event.target.closest('[data-mp-form]');
 if(!form)return;
 event.preventDefault();
 const op=form.dataset.mpForm;
 const code=form.dataset.code;
 void perform(event.submitter,async ticket=>{
  const fields=new FormData(form);
  const key=mode+':'+code;
  let body;
  if(op==='complete')body={code,answers:[...fields.values()].map(Number)};
  else if(op==='set_goal')body={target:Number(fields.get('target'))};
  else if(op==='redeem')body={code,cost:stateData.catalog.find(item=>item.code===code)?.cost,request_key:pendingRequests.get(key)};
  else body=readAdminForm(form,fields);
  const result=await call(op,body);
  if(ticket!==version)return;
  if(result.review){
   const review=result.review.map(index=>index+1).join(', ');
   modal.querySelector('[data-mp-feedback]').textContent='Revise a leitura e tente novamente. Etapas para conferir: '+review+'.';
   return;
  }
  if(op==='redeem')pendingRequests.delete(key);
  modal?.close();
  await refresh(ticket);
  if(ticket!==version)return;
  if(op==='redeem')view.querySelector('[data-mp-detail="redemptions"]').open=true;
  const messages={complete:result.duplicate?'Esta atividade já foi registrada.':result.earned?'Atividade concluída · '+points(result.earned):'Atividade concluída. O limite de pontos foi atingido.',redeem:'Solicitação registrada. Acompanhe em Meus resgates.',set_goal:'Meta semanal definida.'};
  resetStatus(messages[op]||'Alteração registrada.');
  status.tabIndex=-1;
  status.focus({preventScroll:true});
 });
});

let balanceRequest;
async function refreshHome() {
 const user=getAccountUser();
 if(!user||balanceRequest===user)return;
 balanceRequest=user;
 try{
  const data=await call('balance',{},'real');
  if(user===getAccountUser())showProgramBalance(data.balance);
 }catch{}finally{if(balanceRequest===user)balanceRequest=null;}
}
window.addEventListener('missao-navigation',event=>{
 const next=event.detail;
 if(next==='recompensas'){
  void load();
  if(mode==='demo')void refreshHome();
 }
 else{
  version++;
  modal?.close();
  if(next==='inicio')void refreshHome();
 }
});
window.addEventListener('missao-account-change',()=>{
 const next=getAccountUser();
 if(next===owner)return;
 owner=next;
 pendingRequests.clear();
 showProgramBalance(null);
 adminVisible=false;
 historyOffset=0;
 adminOffset=0;
 modal?.close();
 if(state.page==='recompensas')void load();
 else if(state.page==='inicio')void refreshHome();
});
if(state.page==='recompensas')void load();
if(state.page==='inicio')void refreshHome();
