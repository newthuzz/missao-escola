export const URL = 'https://pxnvttqsgjnakeukttdr.supabase.co';
export const KEY = 'sb_publishable_v3EJ6JyxoqHS6Jk75oXhOQ_lFS7KYsJ';
export async function request(path, {token, method = 'GET', body, timeout = 15000} = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
  const response = await fetch(URL + path, {
    method,
    cache: 'no-store',
    signal: controller.signal,
    headers: {apikey: KEY, ...(token ? {Authorization: `Bearer ${token}`} : {}), ...(body !== undefined ? {'Content-Type': 'application/json'} : {})},
    ...(body !== undefined ? {body: JSON.stringify(body)} : {})
  });
  const data = await response.json().catch(error => {if(error.name === 'AbortError')throw error;return null;});
  if (!response.ok) {
    const error = new Error(data?.code === '40001' ? 'A cópia mudou em outro aparelho. Atualize a cópia antes de salvar.' : data?.msg || data?.message || data?.error_description || 'Não foi possível conectar ao Supabase.');
    error.status = response.status;
    error.code = data?.code;
    throw error;
  }
  if(data === null)throw Error('A conta enviou uma resposta inválida. Tente novamente; seus estudos locais foram mantidos.');
  return data;
  } catch(error) {
    if(error.name === 'AbortError')throw Error('A conexão demorou. Tente novamente; seus estudos locais foram mantidos.');
    throw error;
  } finally {clearTimeout(timer);}
}
export function saveBackup(token, snapshot, revision) {
  return request('/rest/v1/rpc/save_learner_backup', {token, method: 'POST', body: {p_snapshot: snapshot, p_revision: revision}});
}
