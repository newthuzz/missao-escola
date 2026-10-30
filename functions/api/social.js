const OPS = new Set(['state','register','profile','invite','accept','decline','remove','block','unblock','join','start','answer']);
const reply = (body,status=200) => new Response(JSON.stringify(body), {status,headers:{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
export function questions(random = max => crypto.getRandomValues(new Uint32Array(1))[0] % max) {
  return Array.from({length:3},()=>{
    const a=10+random(90),b=10+random(90),subtract=random(2)===1;
    const correct=subtract?a-b:a+b;
    const answers=[correct,correct+1,correct-1,correct+2];
    for(let i=3;i>0;i--){const j=random(i+1);[answers[i],answers[j]]=[answers[j],answers[i]];}
    return {question:`Quanto é ${a} ${subtract?'−':'+'} ${b}?`,answers:answers.map(String),correct:answers.indexOf(correct),explanation:`${a} ${subtract?'−':'+'} ${b} = ${correct}.`};
  });
}
export async function onRequest({request,env}) {
  if(request.method!=='POST') return reply({error:'Método não permitido.'},405);
  if(request.headers.get('Origin') && request.headers.get('Origin')!==new URL(request.url).origin) return reply({error:'Origem não permitida.'},403);
  if(!env.SUPABASE_SERVICE_ROLE_KEY) return reply({error:'O backend ainda não foi configurado no Cloudflare.'},503);
  const base=env.SUPABASE_URL || 'https://pxnvttqsgjnakeukttdr.supabase.co';
  const auth=request.headers.get('Authorization') || '';
  if(!/^Bearer \S+$/.test(auth)) return reply({error:'Entre na sua conta.'},401);
  try {
    const raw=await request.text();
    if(raw.length>8192) return reply({error:'Requisição muito grande.'},413);
    let body;try {body=JSON.parse(raw);} catch {return reply({error:'JSON inválido.'},400);}
    if(!body || !OPS.has(body.op)) return reply({error:'Operação inválida.'},400);
    const headers={apikey:env.SUPABASE_SERVICE_ROLE_KEY,Authorization:auth};
    const userResponse=await fetch(base+'/auth/v1/user',{headers});
    if(!userResponse.ok) return reply({error:'Sessão inválida. Entre novamente.'},401);
    const user=await userResponse.json();
    if(!user.id) return reply({error:'Sessão inválida.'},401);
    // Never accept caller-supplied identity, points, correct answers or questions.
    const args={};
    for(const key of ['nickname','avatar','code','target','session','cursor','answer']) if(Object.hasOwn(body,key)) args[key]=body[key];
    if(['register','profile'].includes(body.op) && (typeof args.nickname!=='string' || args.nickname.trim().length<2 || args.nickname.trim().length>24)) return reply({error:'Use um apelido de 2 a 24 caracteres.'},400);
    if(body.op==='profile' && !['✦','☾','✿','♜'].includes(args.avatar)) return reply({error:'Avatar inválido.'},400);
    if(body.op==='answer' && (!Number.isInteger(args.answer)||args.answer<0||args.answer>3||!Number.isInteger(args.cursor)||args.cursor<0||args.cursor>2)) return reply({error:'Resposta inválida.'},400);
    if(body.op==='start') args.questions=questions();
    const response=await fetch(base+'/rest/v1/rpc/social_action',{method:'POST',headers:{apikey:env.SUPABASE_SERVICE_ROLE_KEY,Authorization:`Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({p_user:user.id,p_op:body.op,p_body:args})});
    const data=await response.json();
    if(!response.ok) return reply({error:data.code==='P0001'?data.message:data.code==='23505'?'Este perfil ou convite já existe.':'Não foi possível concluir. Confira os dados e a configuração do banco.'},400);
    return reply(data);
  }catch {return reply({error:'Não foi possível conectar ao serviço. Tente novamente.'},502);}
}
