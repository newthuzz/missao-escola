export const URL = 'https://pxnvttqsgjnakeukttdr.supabase.co';
export const KEY = 'sb_publishable_v3EJ6JyxoqHS6Jk75oXhOQ_lFS7KYsJ';
export async function request(path, {token, method = 'GET', body} = {}) {
  const response = await fetch(URL + path, {
    method,
    headers: {apikey: KEY, ...(token ? {Authorization: `Bearer ${token}`} : {}), ...(body !== undefined ? {'Content-Type': 'application/json'} : {})},
    ...(body !== undefined ? {body: JSON.stringify(body)} : {})
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error(data?.code === '40001' ? 'A cópia mudou em outro aparelho. Atualize a cópia antes de salvar.' : data?.msg || data?.message || data?.error_description || 'Não foi possível conectar ao Supabase.');
    error.status = response.status;
    throw error;
  }
  return data;
}
export function saveBackup(token, snapshot, revision) {
  return request('/rest/v1/rpc/save_learner_backup', {token, method: 'POST', body: {p_snapshot: snapshot, p_revision: revision}});
}
