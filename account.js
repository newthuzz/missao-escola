import {mountSocial} from './social.js';
import {request, saveBackup} from './cloud-api.mjs';
import {createProgressSync} from './progress-sync.mjs';
const SESSION_KEY='missao-escola-supabase-session', META_KEY='missao-escola-cloud-sync-v1';
let session=null,backup=null,busy=false,sync=null,syncTimer=null,refreshingToken=null;
let syncStatus={kind:'checking',message:'Conferindo seus estudos…'}, formDirty=false;
try {session=JSON.parse(localStorage.getItem(SESSION_KEY));} catch {}
const snapshot=()=>({progress,learner,routine});
const page=document.createElement('section');page.id='page-social';page.className='page';page.setAttribute('aria-label','Minha conta');
document.querySelector('.app-footer').before(page);labels.social='Minha conta';
const nav=document.createElement('button');nav.className='nav-link nav-secondary';nav.dataset.page='social';nav.textContent='☁ Minha conta';document.querySelector('.side-nav').append(nav);
document.querySelector('.mobile-tools').insertAdjacentHTML('beforeend','<button data-go="social">☁ Conta</button>');
function stopSync(){clearTimeout(syncTimer);sync?.stop();sync=null;}
function store(value){
 if(session?.user?.id!==value?.user?.id)stopSync();session=value;
 try{if(value)localStorage.setItem(SESSION_KEY,JSON.stringify(value));else localStorage.removeItem(SESSION_KEY);}catch{}
}
async function token(){
 if(!session?.access_token)throw Error('Entre na sua conta primeiro.');
 if(!session.expires_at||session.expires_at<Date.now()/1000+60){
  if(!refreshingToken){const original=session;refreshingToken=(async()=>{
   try{const next=await request('/auth/v1/token?grant_type=refresh_token',{method:'POST',body:{refresh_token:original.refresh_token}});if(session?.refresh_token!==original.refresh_token||session?.user?.id!==original.user?.id)throw Error('A conta foi alterada durante a renovação da sessão.');store({...next,expires_at:Date.now()/1000+next.expires_in});}
   catch(e){if((e.status===400||e.status===401)&&session?.refresh_token===original.refresh_token&&session?.user?.id===original.user?.id){store(null);renderAccount('Sua sessão expirou. Entre novamente; seus estudos locais foram mantidos.');}throw e;}
  })().finally(()=>{refreshingToken=null;});}
  await refreshingToken;
 }
 return session.access_token;
}
function showSync(value){
 syncStatus=value;
 const status=page.querySelector('#account-sync-status');if(status){if(status.textContent!==value.message)status.textContent=value.message;status.dataset.state=value.kind;}
 const copy=page.querySelector('#account-copy-date');if(copy)copy.textContent=backup?'Última cópia consultada: '+new Date(backup.updated_at).toLocaleString('pt-BR'):'';
}
function renderAccount(message=''){
 page.innerHTML=`<div class="section-heading"><h1>Minha conta</h1><p>Seu progresso, perfil de aprendizagem e rotina em outros aparelhos.</p></div><article class="social-box"><p role="status">${esc(message)}</p>${session?.access_token?`<p>Conta: ${esc(session.user?.email||'')}</p><p role="status" id="account-sync-status">${esc(syncStatus.message)}</p><small id="account-copy-date"></small><div class="social-actions"><button data-account="refresh" class="primary-button">Sincronizar agora</button><button data-account="save" class="outline-button">Usar progresso deste aparelho</button><button data-account="restore" class="outline-button">Carregar progresso da conta</button><button data-account="logout" class="outline-button">Sair</button></div><p>O progresso mais recente é carregado ao entrar. As alterações são salvas automaticamente enquanto você usa o site. Se dois aparelhos alterarem os estudos ao mesmo tempo, a sincronização pede que você escolha uma cópia.</p><small>Antes de carregar outra cópia, os estudos deste aparelho são guardados como segurança local.</small>`:`<form id="account-form" class="social-form"><label>E-mail<input name="email" type="email" autocomplete="email" required></label><label>Senha<input name="password" type="password" autocomplete="current-password" minlength="8" required></label><div class="social-actions"><button name="action" value="login" class="primary-button">Entrar</button><button name="action" value="signup" class="outline-button">Criar conta</button></div></form><p>Ao criar uma conta, confirme o e-mail antes de entrar, se solicitado.</p>`}</article><article class="social-box" id="social-features"></article>`;
 const social=page.querySelector('#social-features');if(session?.access_token)mountSocial(social,token);else social.innerHTML='<h2>Amigos e ligas</h2><p>Entre na sua conta para adicionar amigos e participar das ligas.</p>';
 if(busy)page.querySelectorAll('button,input').forEach(el=>el.disabled=true);
 showSync(syncStatus);
}
function archiveLocal(value){localStorage.setItem('missao-escola-before-restore',JSON.stringify(value));}
function persistSnapshot(next){
 const pairs=[[KEY,next.progress],[PERSONAL_KEY,next.learner],[ROUTINE_KEY,next.routine]],previous=pairs.map(([key])=>[key,localStorage.getItem(key)]);
 try{for(const [key,data]of pairs){const encoded=JSON.stringify(data);if(localStorage.getItem(key)!==encoded)localStorage.setItem(key,encoded);}}
 catch(e){for(const [key,data]of previous){try{if(data===null)localStorage.removeItem(key);else localStorage.setItem(key,data);}catch{}}throw Error('Não foi possível atualizar o armazenamento local. Seus estudos continuam nesta sessão.');}
}
function applySnapshot(value){
 const next={progress:J.load(value?.progress,null,today),learner:A.load(value?.learner),routine:R.load(value?.routine)};
 J.reconcileStreak(next.progress,today);
 persistSnapshot(next);
 progress=next.progress;learner=next.learner;routine=next.routine;routineWorking=structuredClone(routine);routineDirty=false;formDirty=false;
 state.currentQuestion=null;state.practiceSeen=[];state.planPractice=false;
 if(!learner.profile){document.querySelector('#profile-form').reset();}
 fillProfile();render();renderPlan();renderQuestion();renderSummary();renderDiagnostic();if(routineInitialized)fillRoutineFields();
}
function canApply(){return !routineDirty&&!formDirty&&!document.activeElement?.matches('input,textarea,select');}
function startSync(){
 stopSync();if(!session?.user?.id)return;
 const id=session.user.id;
 sync=createProgressSync({userId:id,getLocal:snapshot,applyRemote:applySnapshot,archiveLocal,
  readMeta:()=>{try{return JSON.parse(localStorage.getItem(META_KEY));}catch{return null;}},
  writeMeta:value=>localStorage.setItem(META_KEY,JSON.stringify(value)),canApply,onStatus:showSync,
  fetchRemote:async()=>{const access=await token();if(session?.user?.id!==id)throw Error('A conta foi alterada.');const rows=await request('/rest/v1/learner_backups?select=snapshot,revision,updated_at',{token:access});if(session?.user?.id!==id)throw Error('A conta foi alterada.');backup=rows[0]||null;return backup;},
  saveRemote:async(value,revision)=>{const access=await token();if(session?.user?.id!==id)throw Error('A conta foi alterada.');const rows=await saveBackup(access,value,revision);if(session?.user?.id!==id)throw Error('A conta foi alterada.');backup=rows[0]||null;return rows;}
 });sync.tick();
}
let mirrorQueued=false;
function scheduleSync(){
 clearTimeout(syncTimer);if(!sync)return;
 // A single study action can mutate the learner plan after saving its XP.
 // Mirror all three domains after the action finishes so reload never turns
 // that partially persisted plan into a false offline change.
 if(!mirrorQueued){mirrorQueued=true;queueMicrotask(()=>{mirrorQueued=false;try{persistSnapshot(snapshot());}catch(e){showSync({kind:'error',message:e.message});}});}
 syncTimer=setTimeout(()=>sync?.tick(),1200);
}
// Reuse the application's persistence hooks; all three saved data domains sync.
for(const name of ['save','saveLearner','persistRoutine']){
 if(name==='save'){const previous=save;save=function(...args){const result=previous(...args);scheduleSync();return result;};}
 if(name==='saveLearner'){const previous=saveLearner;saveLearner=function(...args){const result=previous(...args);scheduleSync();return result;};}
 if(name==='persistRoutine'){const previous=persistRoutine;persistRoutine=function(...args){const result=previous(...args);scheduleSync();return result;};}
}
async function run(work){if(busy)return;busy=true;renderAccount('Conectando…');try{const message=await work();busy=false;renderAccount(message||'Pronto.');}catch(e){busy=false;renderAccount(e.message);}}
page.addEventListener('submit',event=>{
 if(event.target.id!=='account-form')return;event.preventDefault();const fields=new FormData(event.target),action=event.submitter?.value||'login';
 const body={email:fields.get('email').trim(),password:fields.get('password')};run(async()=>{
  const result=await request(action==='signup'?'/auth/v1/signup':'/auth/v1/token?grant_type=password',{method:'POST',body});
  if(!result.access_token)return 'Confira seu e-mail para confirmar a conta. Depois, entre aqui.';
  store({...result,expires_at:Date.now()/1000+result.expires_in});backup=null;startSync();return 'Conta conectada. O progresso mais recente será carregado automaticamente.';
 });
});
page.addEventListener('click',event=>{
 const action=event.target.closest('[data-account]')?.dataset.account;if(!action||busy)return;
 run(async()=>{
  if(action==='logout'){await sync?.tick();await request('/auth/v1/logout',{token:await token(),method:'POST'});stopSync();store(null);backup=null;return 'Conta desconectada. Os estudos locais foram mantidos.';}
  if(!sync)startSync();
  if(action==='refresh'){await sync?.tick();return syncStatus.message;}
  if(action==='save'){if(!confirm('Usar o progresso deste aparelho? Isso substituirá a cópia mais recente da conta.'))return 'Envio cancelado.';await sync?.keepLocal();return syncStatus.message;}
  if(action==='restore'){if(!confirm('Carregar o progresso da conta e substituir os estudos deste aparelho? Uma cópia de segurança local será mantida.'))return 'Carregamento cancelado.';await sync?.useRemote();return syncStatus.message;}
 });
});
document.addEventListener('input',event=>{if(event.target.closest('#profile-form,#study-settings'))formDirty=true;});
document.addEventListener('change',event=>{if(event.target.closest('#profile-form,#study-settings'))formDirty=true;});
document.addEventListener('submit',event=>{if(['profile-form','study-settings'].includes(event.target.id)){formDirty=false;scheduleSync();}});
window.addEventListener('storage',event=>{
 if(event.key===SESSION_KEY){let next=null;try{next=JSON.parse(event.newValue);}catch{}const changed=session?.user?.id!==next?.user?.id;session=next;if(changed){backup=null;startSync();renderAccount();}}
 if([KEY,PERSONAL_KEY,ROUTINE_KEY].includes(event.key))scheduleSync();
});
window.addEventListener('online',()=>sync?.tick());window.addEventListener('focus',()=>sync?.tick());
document.addEventListener('visibilitychange',()=>{if(!document.hidden)sync?.tick();});
setInterval(()=>{if(!document.hidden)sync?.tick();},20000);
renderAccount();startSync();if(location.hash==='#social')navigate('social',false);
