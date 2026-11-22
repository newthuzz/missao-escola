import {TutorError} from './tutor-shared.mjs';

export async function readTutorJson(request) {
  let raw = '', size = 0;
  const reader = request.body?.getReader();
  if (!reader) throw new TutorError('Requisição vazia.');
  const decoder = new TextDecoder();
  for (;;) {
    const {done, value} = await reader.read();
    if (done) break;
    size += value.length;
    if (size > 14000) {
      await reader.cancel();
      throw new TutorError('Mensagem muito grande.', 413);
    }
    raw += decoder.decode(value, {stream: true});
  }
  try {
    return JSON.parse(raw + decoder.decode());
  } catch {
    throw new TutorError('Mensagem inválida.');
  }
}

export async function withTutorCors(request, env, handle) {
  const origin = request.headers.get('Origin');
  const origins = new Set(String(env.TUTOR_ALLOWED_ORIGINS || '').split(',').flatMap(value => {
    try {
      const url = new URL(value.trim());
      return ['https:', 'http:'].includes(url.protocol) ? [url.origin] : [];
    } catch {
      return [];
    }
  }));
  const cors = {'Vary':'Origin','Cache-Control':'no-store','Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info','Access-Control-Max-Age':'600'};
  if (origin && !origins.has(origin)) return Response.json({error:'Origem não permitida.'}, {status:403, headers:{Vary:'Origin','Cache-Control':'no-store'}});
  if (origin) cors['Access-Control-Allow-Origin'] = origin;
  if (request.method === 'OPTIONS') return new Response(null, {status:204, headers:cors});
  const response = await handle();
  const headers = new Headers(response.headers);
  for (const [name, value] of Object.entries(cors)) headers.set(name, value);
  return new Response(response.body, {status:response.status, headers});
}

export function tutorRuntimeEnv() {
  return {
    SUPABASE_URL: Deno.env.get('SUPABASE_URL'),
    SUPABASE_ANON_KEY: Deno.env.get('SUPABASE_ANON_KEY'),
    SUPABASE_SERVICE_ROLE_KEY: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
    OPENAI_API_KEY: Deno.env.get('OPENAI_API_KEY'),
    TUTOR_PROVIDER: Deno.env.get('TUTOR_PROVIDER'),
    GROQ_API_KEY: Deno.env.get('GROQ_API_KEY'),
    GROQ_MODEL: Deno.env.get('GROQ_MODEL'),
    TUTOR_ENABLED: Deno.env.get('TUTOR_ENABLED'),
    TUTOR_ALLOWED_ORIGINS: Deno.env.get('TUTOR_ALLOWED_ORIGINS')
  };
}
