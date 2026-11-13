import {mountPedagogy} from './pedagogy-ui.js';
import {readAuthCallback} from './auth-callback.mjs';
import {setIslandAvatarAccount,islandAvatarReceiver} from './island-avatar.js';
import {mountCommunityNavigation} from './community-navigation.js';
import {request, saveBackup, URL as SUPABASE_URL, KEY as SUPABASE_KEY} from './cloud-api.mjs';
import {createProgressSync} from './progress-sync.mjs';
const SESSION_KEY='missao-escola-supabase-session', META_KEY='missao-escola-cloud-sync-v1';
let session=null,backup=null,busy=false,sync=null,syncTimer=null,refreshingToken=null,pedagogy=null,recovering=false,callbackMessage='';
let syncStatus={kind:'checking',message:'Conferindo seus estudos…'}, formDirty=false;
try {session=JSON.parse(localStorage.getItem(SESSION_KEY));} catch {}
const authCallback=location.protocol==='file:'?null:readAuthCallback(location.href);
if(authCallback){history.replaceState(null,'',location.pathname+location.search+'#social');if(authCallback.session){session=authCallback.session;recovering=authCallback.recovery;}else callbackMessage=authCallback.error;}
const snapshot=()=>({progress,learner,routine});
const page=document.createElement('section');page.id='page-social';page.className='page';page.setAttribute('aria-label','Minha conta');
document.querySelector('.app-footer').before(page);labels.social='Minha conta';

function stopSync(){clearTimeout(syncTimer);sync?.stop();sync=null;}
function store(value){
 if(session?.user?.id!==value?.user?.id)stopSync();session=value;setIslandAvatarAccount(session?.user?.id);
 try{if(value)localStorage.setItem(SESSION_KEY,JSON.stringify(value));else localStorage.removeItem(SESSION_KEY);}catch{}
 window.dispatchEvent(new CustomEvent('missao-account-change'));
}
export {token as getAccountToken};
export const getAccountUser=()=>session?.user?.id||null;
const communityNavigation=mountCommunityNavigation({getToken:token,getUser:getAccountUser,isStaff:()=>Boolean(pedagogy?.context&&['teacher','admin'].includes(pedagogy.workspace)),makeProfileReceiver:islandAvatarReceiver});
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
 const staffAccount=pedagogy?.context&&['teacher','admin'].includes(pedagogy.workspace);
 setIslandAvatarAccount(session?.user?.id);
 page.innerHTML=`${recovering&&session?.access_token?'<section class="social-box"><h2>Escolha uma nova senha</h2><form id="account-reset-form"><label>Nova senha<input name="password" type="password" minlength="10" autocomplete="new-password" required></label><label>Confirme a nova senha<input name="password_confirm" type="password" minlength="10" autocomplete="new-password" required></label><button class="primary-button">Salvar nova senha</button></form></section>':''}<div class="section-heading"><h1>${staffAccount?'Minha conta institucional':'Minha conta'}</h1><p>Seu perfil, seus amigos e seus estudos sincronizados.</p></div><details class="social-box account-tools" ${session?.access_token?'':'open'}><summary>Minha conta e sincronização</summary><p role="status">${esc(message)}</p>${session?.access_token?`<p>Conta: ${esc(session.user?.email||'')}</p><p role="status" id="account-sync-status">${esc(syncStatus.message)}</p><small id="account-copy-date"></small><div class="social-actions">${staffAccount?'':`<button data-account="refresh" class="primary-button">Sincronizar agora</button><button data-account="save" class="outline-button">Usar progresso deste aparelho</button><button data-account="restore" class="outline-button">Carregar progresso da conta</button>`}<button data-account="logout" class="outline-button">Sair</button></div>${staffAccount?'':`<p>O progresso mais recente é carregado ao entrar. As alterações são salvas automaticamente enquanto você usa o site. Se dois aparelhos alterarem os estudos ao mesmo tempo, a sincronização pede que você escolha uma cópia.</p><small>Antes de carregar outra cópia, os estudos deste aparelho são guardados como segurança local.</small>`}`:`<form id="account-form" class="social-form"><label>E-mail<input name="email" type="email" autocomplete="email" required></label><label>Senha<input name="password" type="password" autocomplete="current-password" minlength="8" required></label><div class="social-actions"><button name="action" value="login" class="primary-button">Entrar</button><button name="action" value="signup" class="outline-button">Criar conta</button></div></form><p>Ao criar uma conta, confirme o e-mail antes de entrar, se solicitado.</p>`}</details><div id="account-community-slot"></div>`;
 communityNavigation.renderAccount(page.querySelector('#account-community-slot'));
 pedagogy?.decorateAccount(page);
 if(busy)page.querySelectorAll('button,input,select,textarea').forEach(el=>el.disabled=true);
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
 state.subject=A.studyState(learner,today).subject;state.currentQuestion=null;state.practiceSeen=[];state.planPractice=false;
 if(!learner.profile){document.querySelector('#profile-form').reset();}
 fillProfile();render();renderPlan();renderQuestion();renderSummary();renderDiagnostic();if(routineInitialized)fillRoutineFields();if(state.page==='aprendizagem'){if(learner.plan?.finished)window.showStudyResult?.();else if(learner.plan?.started)window.resumeStudy?.(false);}
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
 });return sync.tick();
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
 if(event.target.id==='account-reset-form'){
  event.preventDefault();const f=new FormData(event.target);run(async()=>{if(f.get('password')!==f.get('password_confirm'))throw Error('As senhas precisam ser iguais.');await request('/auth/v1/user',{token:await token(),method:'PUT',body:{password:f.get('password')}});recovering=false;await pedagogy?.afterAuthentication({intent:pedagogy.intent});return 'Senha atualizada. Entre com sua nova senha nos próximos acessos.';});return;
 }
 if(event.target.id!=='account-form')return;event.preventDefault();const fields=new FormData(event.target),action=event.submitter?.value||'login',intent=pedagogy?.intent||'student';
 let body;try{body=action==='teacher-signup'?pedagogy.signupBody(fields):action==='teacher-activate'?pedagogy.activationBody(fields):{email:fields.get('email').trim(),password:fields.get('password')};}catch(error){renderAccount(error.message);return;}
 run(async()=>{
  const signup=['signup','teacher-signup','teacher-activate'].includes(action),redirect=encodeURIComponent(location.origin+location.pathname+(action==='teacher-activate'?'?professor=ativar':'')+'#social');
  const result=await request(signup?'/auth/v1/signup?redirect_to='+redirect:'/auth/v1/token?grant_type=password',{method:'POST',body});
  if(!result.access_token&&action==='teacher-activate')return 'Confira seu e-mail para confirmar a conta. Depois, entre como professor usando o e-mail cadastrado pela escola. Se já tem conta, use Entrar.';
  if(!result.access_token)return action==='teacher-signup'?'Confira seu e-mail para confirmar a conta. Depois, entre como professor para consultar a análise institucional. Se já possui conta, entre nela para solicitar acesso.':'Confira seu e-mail para confirmar a conta. Depois, entre aqui.';
  store({...result,expires_at:Date.now()/1000+result.expires_in});backup=null;
  const context=await pedagogy?.afterAuthentication({intent,redirect:!recovering});
  if(context)store({...session,pedagogy_staff:['teacher','admin'].includes(context.role)});
  if(context?.canSwitchWorkspace&&pedagogy.workspace==='student'){await startSync();}else if(intent==='teacher'||context&&['teacher','admin'].includes(context.role)){stopSync();}else await startSync();
  window.dispatchEvent(new CustomEvent('missao-account-ready',{detail:{role:context?.role||'student'}}));return context?'Conta conectada. Suas permissões foram verificadas no servidor.':'Conta conectada. O apoio institucional está indisponível; seus estudos continuam disponíveis.';
 });
});
page.addEventListener('click',event=>{
 const action=event.target.closest('[data-account]')?.dataset.account;if(!action||busy)return;
 const recoveryEmail=page.querySelector('[name=email]')?.value?.trim();
 run(async()=>{
  if(action==='recover'){if(!recoveryEmail)throw Error('Preencha seu e-mail para receber o link de recuperação.');await request('/auth/v1/recover?redirect_to='+encodeURIComponent(location.origin+location.pathname+'#social'),{method:'POST',body:{email:recoveryEmail}});return 'Se existir uma conta para este e-mail, você receberá um link de recuperação.';}
  if(action==='logout'){await sync?.tick();await request('/auth/v1/logout',{token:await token(),method:'POST'});stopSync();recovering=false;store(null);backup=null;return 'Conta desconectada. Os estudos locais foram mantidos.';}
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
 if(event.key===SESSION_KEY){let next=null;try{next=JSON.parse(event.newValue);}catch{}const changed=session?.user?.id!==next?.user?.id;session=next;if(changed){backup=null;prepareInitialAccount();renderAccount();window.dispatchEvent(new CustomEvent('missao-account-change'));}}
 if([KEY,PERSONAL_KEY,ROUTINE_KEY].includes(event.key))scheduleSync();
});
window.addEventListener('online',()=>sync?.tick());window.addEventListener('focus',()=>sync?.tick());
document.addEventListener('visibilitychange',()=>{if(!document.hidden)sync?.tick();});
setInterval(()=>{if(!document.hidden)sync?.tick();},20000);
async function prepareInitialAccount(){
 let message=callbackMessage,access=null,connectionError=false;
 if(session?.access_token){
  const userId=session.user?.id,controller=new AbortController();let timer;
  try{
   // Use the existing refresh path; never trust only a saved access token.
   await Promise.race([
    (async()=>{
     access=await token();
     const response=await fetch(SUPABASE_URL+'/auth/v1/user',{
      headers:{apikey:SUPABASE_KEY,Authorization:`Bearer ${access}`},
      cache:'no-store',signal:controller.signal
     });
     if(!response.ok){const error=Error('Não foi possível verificar a sessão.');error.status=response.status;throw error;}
     const user=await response.json();
     if(session?.access_token===access&&session?.user?.id===userId)store({...session,user});
    })(),
    new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(Error('A verificação da conta demorou.'));},4500);})
   ]);
  }catch(error){
   if((error.status===400||error.status===401)&&session?.access_token===access){
    stopSync();store(null);message='Sua sessão expirou. Entre novamente; seus estudos locais foram mantidos.';
   }else{connectionError=true;message='Não foi possível verificar a conta agora. Seus estudos locais continuam disponíveis.';}
  }finally{clearTimeout(timer);}
 }
 renderAccount(message);
 const context=await pedagogy?.afterAuthentication({redirect:!recovering});
 if(context)store({...session,pedagogy_staff:['teacher','admin'].includes(context.role)});
 if(context?.canSwitchWorkspace&&pedagogy.workspace==='student'||!context&&!session?.pedagogy_staff||context?.role==='student'&&(!context.applications.some(a=>a.status==='pending')||context.memberships.length)){startSync();}else stopSync();
 if(recovering||location.hash==='#social')navigate('social',false);
 return {connectionError};
}
pedagogy=mountPedagogy({getToken:token,getUser:getAccountUser,refreshAccount:()=>renderAccount(),signOut:()=>page.querySelector('[data-account=logout]')?.click()});
window.addEventListener('missao-workspace-change',()=>{if(!pedagogy?.context)return;if(pedagogy.workspace==='student'){if(!sync)startSync()?.catch(error=>showSync({kind:'error',message:error.message}));}else stopSync();});
window.addEventListener('hashchange',()=>{
 const incoming=readAuthCallback(location.href);if(!incoming)return;
 history.replaceState(null,'',location.pathname+location.search+'#social');
 if(incoming.session){stopSync();session=incoming.session;recovering=incoming.recovery;callbackMessage='';prepareInitialAccount();}
 else{callbackMessage=incoming.error;renderAccount(callbackMessage);navigate('social',false);}
});
renderAccount();
const initialAccountReady=prepareInitialAccount();
window.MissaoStartup?.waitForAuthentication(initialAccountReady);
