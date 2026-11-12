// Tokens are consumed once, scrubbed from the URL and remotely verified by
// account.js. Neither URL parameters nor login mode grant a role.
export function readAuthCallback(url){
 const parsed=new URL(url),hash=new URLSearchParams(parsed.hash.slice(1));
 if(!hash.has('access_token')&&!hash.has('error_description'))return null;
 if(hash.has('error_description'))return {error:'Este link não pôde ser utilizado. Solicite outro link de acesso ou recuperação.'};
 const access_token=hash.get('access_token'),refresh_token=hash.get('refresh_token');
 if(!access_token||!refresh_token)return {error:'Link de acesso incompleto. Solicite um novo link.'};
 return {recovery:hash.get('type')==='recovery',session:{access_token,refresh_token,expires_at:Date.now()/1000+Math.min(86400,Math.max(60,Number(hash.get('expires_in'))||3600)),user:null}};
}
