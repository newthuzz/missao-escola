import {MODEL,TutorError} from './tutor-core.mjs';
import {createOpenAI} from './tutor-openai.mjs';
import {createGroq,GROQ_MODEL} from './tutor-groq.mjs';
export function tutorProvider(env){
 const name=(env.TUTOR_PROVIDER||'openai').trim().toLowerCase();
 if(name==='groq')return {name,model:env.GROQ_MODEL?.trim()||GROQ_MODEL,configured:Boolean(env.GROQ_API_KEY?.trim()),create:()=>createGroq(env.GROQ_API_KEY,env.GROQ_MODEL?.trim()||GROQ_MODEL)};
 if(name==='openai')return {name,model:MODEL,configured:Boolean(env.OPENAI_API_KEY?.trim()),create:()=>createOpenAI(env.OPENAI_API_KEY)};
 throw new TutorError('Provedor do tutor inválido. Confira TUTOR_PROVIDER no Supabase.',503);
}
