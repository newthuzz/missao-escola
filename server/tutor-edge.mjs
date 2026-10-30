import {onRequest} from './tutor-handler.mjs';
export async function handleEdgeRequest({request,env,waitUntil}) {
  const origin=request.headers.get('Origin');
  const origins=new Set(String(env.TUTOR_ALLOWED_ORIGINS||'').split(',').flatMap(value=>{
    try{const url=new URL(value.trim());return ['https:','http:'].includes(url.protocol)?[url.origin]:[];}catch{return [];}
  }));
  const cors={'Vary':'Origin','Cache-Control':'no-store','Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info','Access-Control-Max-Age':'600'};
  if(origin&&!origins.has(origin))return Response.json({error:'Origem não permitida.'},{status:403,headers:{Vary:'Origin','Cache-Control':'no-store'}});
  if(origin)cors['Access-Control-Allow-Origin']=origin;
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
  const response=await onRequest({request,env,waitUntil});
  const resultHeaders=new Headers(response.headers);for(const [name,value]of Object.entries(cors))resultHeaders.set(name,value);
  return new Response(response.body,{status:response.status,headers:resultHeaders});
}
if(typeof Deno!=='undefined'&&Deno.serve){
  Deno.serve(request=>handleEdgeRequest({request,env:{
    SUPABASE_URL:Deno.env.get('SUPABASE_URL'),SUPABASE_ANON_KEY:Deno.env.get('SUPABASE_ANON_KEY'),
    SUPABASE_SERVICE_ROLE_KEY:Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),OPENAI_API_KEY:Deno.env.get('OPENAI_API_KEY'),
    TUTOR_ENABLED:Deno.env.get('TUTOR_ENABLED'),TUTOR_ALLOWED_ORIGINS:Deno.env.get('TUTOR_ALLOWED_ORIGINS')
  },waitUntil:typeof EdgeRuntime!=='undefined'?promise=>EdgeRuntime.waitUntil(promise):undefined}));
}
