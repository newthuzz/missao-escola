import {request,URL as SUPABASE_URL,KEY} from './cloud-api.mjs';
export async function pedagogyCall(getToken,op,body={}){
 try{return await request('/rest/v1/rpc/'+(op==='catalog'?'pedagogy_catalog':'pedagogy_action'),{token:op==='catalog'?undefined:await getToken(),method:'POST',timeout:op==='context'?4000:15000,body:op==='catalog'?{}:{p_op:op,p_body:body}});}
 catch(error){if(error instanceof TypeError)throw Error('Não foi possível confirmar esta atualização. Confira a conexão e tente novamente.');if(['PGRST202','42883','42P01'].includes(error.code)||error.status===404)throw Error('O apoio pedagógico ainda não foi ativado. Seus estudos continuam disponíveis.');throw error;}
}
export function teacherSignupBody(fields){
 const password=String(fields.get('password')||'');if(password!==fields.get('password_confirm'))throw Error('As senhas precisam ser iguais.');if(password.length<10)throw Error('Use uma senha de pelo menos 10 caracteres.');
 const application={full_name:String(fields.get('full_name')||'').trim(),school_id:fields.get('school_id'),class_ids:fields.getAll('class_ids'),subject_ids:fields.getAll('subject_ids'),notes:String(fields.get('notes')||'').trim()};
 if(application.full_name.length<2||!application.school_id||!application.class_ids.length||!application.subject_ids.length)throw Error('Selecione a instituição, as turmas e as disciplinas.');
 return {email:String(fields.get('email')||'').trim(),password,data:{pedagogical_application:application}};
}
// Realtime is an optimization. A visible-page polling fallback always remains.
export function subscribePedagogy({getToken,getUser,onChange,onStatus=()=>{},WebSocketClass=globalThis.WebSocket}){
 let socket=null,heartbeat=null,reconnect=null,closed=false,ref=0,attempt=0,tokenUsed=null;
 const send=(event,payload,topic='phoenix')=>{if(socket?.readyState===1)socket.send(JSON.stringify({topic,event,payload,ref:String(++ref)}));};
 async function connect(){if(closed||!WebSocketClass||!getUser())return;try{
  tokenUsed=await getToken();if(closed)return;const owner=getUser();socket=new WebSocketClass(SUPABASE_URL.replace('https:','wss:')+'/realtime/v1/websocket?apikey='+encodeURIComponent(KEY)+'&vsn=1.0.0');
  const topic='realtime:pedagogy-'+owner;
  socket.onopen=()=>{if(closed||owner!==getUser()){socket.close();return;}send('phx_join',{config:{broadcast:{self:false},presence:{key:''},postgres_changes:[{event:'*',schema:'public',table:'edu_notifications',filter:'user_id=eq.'+owner}]},access_token:tokenUsed},topic);heartbeat=setInterval(async()=>{if(closed)return;send('heartbeat',{});try{const next=await getToken();if(next!==tokenUsed){tokenUsed=next;send('access_token',{access_token:next},topic);}}catch{socket?.close();}},25000);};
  socket.onmessage=event=>{try{const message=JSON.parse(event.data);if(message.event==='postgres_changes'&&owner===getUser())onChange();if(message.event==='phx_reply'&&message.payload?.status==='ok'){attempt=0;onStatus('realtime');}if(message.event==='phx_error'||message.payload?.status==='error')socket?.close();}catch{}};
  socket.onclose=()=>{clearInterval(heartbeat);onStatus('polling');if(!closed)reconnect=setTimeout(connect,Math.min(60000,2000*2**attempt++));};socket.onerror=()=>socket?.close();
 }catch{onStatus('polling');if(!closed)reconnect=setTimeout(connect,Math.min(60000,2000*2**attempt++));}}
 connect();return ()=>{closed=true;clearInterval(heartbeat);clearTimeout(reconnect);if(socket){socket.onclose=null;socket.close();}};
}
