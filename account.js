import {request, saveBackup} from './cloud-api.mjs';
const SESSION_KEY = 'missao-escola-supabase-session';
let session = null, backup = null, busy = false;
try {session = JSON.parse(localStorage.getItem(SESSION_KEY));} catch {}
const page = document.createElement('section');
page.id = 'page-social'; page.className = 'page'; page.setAttribute('aria-label', 'Minha conta');
document.querySelector('.app-footer').before(page);
labels.social = 'Minha conta';
const nav = document.createElement('button');
nav.className = 'nav-link nav-secondary'; nav.dataset.page = 'social'; nav.textContent = '☁ Minha conta';
document.querySelector('.side-nav').append(nav);
document.querySelector('.mobile-tools').insertAdjacentHTML('beforeend','<button data-go="social">☁ Conta</button>');
function store(value) {
  session = value;
  try {if (value) localStorage.setItem(SESSION_KEY, JSON.stringify(value)); else localStorage.removeItem(SESSION_KEY);} catch {}
}
async function token() {
  if (!session?.access_token) throw Error('Entre na sua conta primeiro.');
  if (!session.expires_at || session.expires_at < Date.now()/1000 + 60) {
    try {
      const next = await request('/auth/v1/token?grant_type=refresh_token', {method:'POST', body:{refresh_token:session.refresh_token}});
      store({...next, expires_at:Date.now()/1000 + next.expires_in});
    } catch (e) {if (e.status === 400 || e.status === 401) store(null); throw e;}
  }
  return session.access_token;
}
function renderAccount(message = '') {
  page.innerHTML = `<div class="section-heading"><h1>Minha conta</h1><p>Seu progresso, perfil de aprendizagem e rotina em outros aparelhos.</p></div><article class="social-box"><p role="status">${esc(message)}</p>${session?.access_token ? `<p>Conta: ${esc(session.user?.email || '')}</p><p>${backup ? 'Cópia encontrada · '+esc(new Date(backup.updated_at).toLocaleString('pt-BR')) : 'Atualize para consultar sua cópia online.'}</p><div class="social-actions"><button data-account="refresh" class="outline-button">Atualizar cópia</button><button data-account="save" class="primary-button">Salvar este aparelho</button><button data-account="restore" class="outline-button" ${backup?'':'disabled'}>Carregar cópia da conta</button><button data-account="logout" class="outline-button">Sair</button></div><p>O envio é manual. Carregar uma cópia substitui os dados deste navegador após sua confirmação.</p>` : `<form id="account-form" class="social-form"><label>E-mail<input name="email" type="email" autocomplete="email" required></label><label>Senha<input name="password" type="password" autocomplete="current-password" minlength="8" required></label><div class="social-actions"><button name="action" value="login" class="primary-button">Entrar</button><button name="action" value="signup" class="outline-button">Criar conta</button></div></form><p>Ao criar uma conta, confirme o e-mail antes de entrar, se solicitado.</p>`}</article><article class="social-box"><h2>Amigos e ligas</h2><p>Os recursos sociais da hospedagem original ainda não estão disponíveis nesta versão. Seu estudo local continua funcionando.</p></article>`;
  if (busy) page.querySelectorAll('button,input').forEach(el=>el.disabled=true);
}
async function loadBackup() {
  const rows = await request('/rest/v1/learner_backups?select=snapshot,revision,updated_at', {token:await token()});
  backup = rows[0] || null;
}
async function run(work) {
  if (busy) return;
  busy=true; renderAccount('Conectando…');
  try {const message=await work(); busy=false; renderAccount(message || 'Pronto.');}
  catch(e) {busy=false; renderAccount(e.message);}
}
page.addEventListener('submit', event=>{
  if (event.target.id !== 'account-form') return;
  event.preventDefault();
  const fields = new FormData(event.target), action=event.submitter?.value || 'login';
  const body={email:fields.get('email').trim(),password:fields.get('password')};
  run(async()=>{
    const result=await request(action==='signup'?'/auth/v1/signup':'/auth/v1/token?grant_type=password', {method:'POST',body});
    if (!result.access_token) return 'Confira seu e-mail para confirmar a conta. Depois, entre aqui.';
    store({...result,expires_at:Date.now()/1000+result.expires_in});
    backup=null; await loadBackup(); return 'Conta conectada. Escolha salvar este aparelho ou carregar sua cópia.';
  });
});
page.addEventListener('click', event=>{
  const action=event.target.closest('[data-account]')?.dataset.account;
  if (!action || busy) return;
  run(async()=>{
    if(action==='logout') {
      await request('/auth/v1/logout', {token:await token(),method:'POST'});
      store(null);backup=null;return 'Conta desconectada. Os estudos locais foram mantidos.';
    }
    if(action==='refresh') {await loadBackup();return backup?'Cópia atualizada.':'Ainda não existe uma cópia nesta conta.';}
    if(action==='save') {
      if (!confirm('Salvar os dados deste aparelho na conta? Isso substitui a cópia online consultada.')) return 'Envio cancelado.';
      const rows=await saveBackup(await token(), {progress,learner,routine}, backup?.revision || 0);
      backup=rows[0];return 'Progresso, perfil e rotina salvos na conta.';
    }
    if(action==='restore') {
      await loadBackup();
      if(!backup) throw Error('Não há cópia para carregar.');
      const value=backup.snapshot;
      if(!value?.progress || !value?.learner || !value?.routine) throw Error('Cópia inválida. Seus dados locais foram mantidos.');
      if(!confirm('Carregar a cópia da conta e substituir os estudos deste navegador?')) return 'Carregamento cancelado.';
      localStorage.setItem('missao-escola-before-restore',JSON.stringify({progress,learner,routine}));
      localStorage.setItem(KEY,JSON.stringify(value.progress));
      localStorage.setItem(PERSONAL_KEY,JSON.stringify(value.learner));
      localStorage.setItem(ROUTINE_KEY,JSON.stringify(value.routine));
      location.reload();
    }
  });
});
window.addEventListener('storage', event=>{
  if(event.key===SESSION_KEY) {try {session=JSON.parse(event.newValue);} catch {session=null;} backup=null;renderAccount();}
});
renderAccount();
if (session?.access_token) run(async()=>{await loadBackup();return 'Conta conectada.';});
if (location.hash === '#social') navigate('social',false);
