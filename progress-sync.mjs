// Optimistic, account-scoped synchronization. No automatic merging of snapshots.
export async function fingerprint(value) {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map(x => x.toString(16).padStart(2, '0')).join('');
}
export function validateBackup(row) {
  const s = row?.snapshot;
  if (!Number.isSafeInteger(row?.revision) || row.revision < 1 || !s ||
      s.progress?.version !== 3 || !Array.isArray(s.progress.events) ||
      ![1,2].includes(s.learner?.version) || !Array.isArray(s.learner.observations) ||
      s.routine?.version !== 1 || !Array.isArray(s.routine.sessions)) {
    throw Error('A cópia online é inválida. Seus estudos locais foram mantidos.');
  }
  return row;
}
const clone = value => JSON.parse(JSON.stringify(value));
export function createProgressSync({userId,getLocal,applyRemote,archiveLocal,readMeta,writeMeta,fetchRemote,saveRemote,canApply=()=>true,onStatus=()=>{}}) {
  let initialized=false,revision=0,baseline=null,paused=false,stopped=false,running=null,rerun=false;
  const current=()=>clone(getLocal());
  function status(kind,message) {if(!stopped)onStatus({kind,message,revision});}
  function active() {if(stopped)throw Error('Sincronização encerrada.');}
  async function remember() {
    active();baseline=await fingerprint(current());active();
    writeMeta({userId,revision,baseline});
  }
  async function apply(row) {
    validateBackup(row);active();
    if(!canApply()) {status('editing','Salve ou descarte a edição em andamento para carregar a cópia mais recente.');return false;}
    archiveLocal(current());active();await applyRemote(clone(row.snapshot));active();
    revision=row.revision;await remember();return true;
  }
  function conflict() {paused=true;status('conflict','Há alterações neste aparelho e em outro. Escolha qual cópia manter em Minha conta.');}
  async function push() {
    const snapshot=current(),sentHash=await fingerprint(snapshot);active();
    status('saving','Salvando seus estudos na conta…');
    let rows;
    try {rows=await saveRemote(snapshot,revision);} catch(e) {
      if(e.status===409 || e.code==='40001'){conflict();return;}
      throw e;
    }
    active();const saved=validateBackup(rows?.[0]);revision=saved.revision;baseline=sentHash;
    // If the student answered while the request was in flight, retain the
    // sent fingerprint so the next tick still sees the newer local changes.
    writeMeta({userId,revision,baseline});const pending=await fingerprint(current())!==baseline;active();status(pending?'pending':'synced',pending?'Há novas alterações neste aparelho aguardando sincronização.':'Progresso salvo automaticamente na sua conta.');
  }
  async function perform(mode='auto') {
    try {
      active();if(paused&&mode==='auto')return;
      if(!initialized||mode!=='auto')status('checking','Conferindo o progresso mais recente…');
      const startHash=await fingerprint(current());active();
      const raw=await fetchRemote();active();const remote=raw?validateBackup(raw):null;
      const endHash=await fingerprint(current());active();
      if(startHash!==endHash&&mode!=='local') {conflict();return;}
      if(mode==='remote') {
        if(!remote)throw Error('Ainda não existe uma cópia online para carregar.');
        if(await apply(remote)){initialized=true;paused=false;status('synced','O progresso mais recente da conta foi carregado.');}
        return;
      }
      if(mode==='local') {
        revision=remote?.revision||0;paused=false;initialized=true;await push();return;
      }
      if(!initialized) {
        const meta=readMeta();
        const sameOwner=meta?.userId===userId;
        const validMeta=sameOwner&&Number.isSafeInteger(meta.revision)&&typeof meta.baseline==='string';
        const pending=validMeta&&endHash!==meta.baseline;
        if(remote) {
          if(pending) {
            if(remote.revision!==meta.revision){conflict();return;}
            revision=meta.revision;baseline=meta.baseline;initialized=true;await push();return;
          }
          if(validMeta&&remote.revision===meta.revision&&endHash===meta.baseline){revision=remote.revision;await remember();}
          else if(!await apply(remote))return;
        } else {
          // A snapshot belonging to a different account must never be uploaded
          // to a newly signed-in account that has no cloud backup.
          if(meta?.userId && !sameOwner) {
            if(!canApply()){status('editing','Finalize a edição antes de trocar os estudos da conta.');return;}
            archiveLocal(current());await applyRemote(null);active();
          }
          revision=0;baseline=null;initialized=true;await push();return;
        }
        initialized=true;status('synced','O progresso mais recente da conta foi carregado.');return;
      }
      const dirty=endHash!==baseline;
      if(remote?.revision!==revision) {
        if(dirty||!remote){conflict();return;}
        if(await apply(remote))status('synced','Progresso atualizado a partir da sua conta.');
        return;
      }
      if(dirty)await push();else status('synced','Seus estudos estão atualizados na conta.');
    } catch(e) {
      if(!stopped)status('error',e instanceof TypeError?'Não foi possível acessar a conta agora. Seus estudos continuam neste aparelho e a sincronização tentará novamente.':e.message||'Sem conexão. Seus estudos continuam neste aparelho e serão sincronizados quando possível.');
    }
  }
  function tick(mode='auto') {
    if(stopped)return Promise.resolve();
    if(running){if(mode!=='auto')return running.then(()=>tick(mode));rerun=true;return running;}
    running=perform(mode).finally(()=>{running=null;if(rerun&&!stopped){rerun=false;queueMicrotask(()=>tick());}});return running;
  }
  return {tick,keepLocal:()=>tick('local'),useRemote:()=>tick('remote'),stop(){stopped=true;},getState:()=>({initialized,revision,baseline,paused})};
}
