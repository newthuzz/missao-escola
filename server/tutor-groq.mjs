import {TutorError} from './tutor-core.mjs';
export const GROQ_MODEL='openai/gpt-oss-20b';
const encoder=new TextEncoder();
export function createGroq(key,model=GROQ_MODEL){
 return {async run({messages,maxOutputTokens,stream,signal}){
  const lifetime=new AbortController(),abort=()=>lifetime.abort();
  if(signal?.aborted)abort();else signal?.addEventListener('abort',abort,{once:true});
  const timer=setTimeout(abort,stream?75000:24000);
  const cleanup=()=>{clearTimeout(timer);signal?.removeEventListener('abort',abort);};
  try{
   const response=await fetch('https://api.groq.com/openai/v1/chat/completions',{
    method:'POST',signal:lifetime.signal,headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},
    body:JSON.stringify({model,messages,stream:Boolean(stream),max_completion_tokens:maxOutputTokens,
     ...(model.startsWith('openai/gpt-oss-')?{reasoning_effort:'low',include_reasoning:false}:{})})
   });
   if(!response.ok){
    // Do not log the provider body: it can contain credentials or student text.
    console.error('Tutor Groq HTTP',response.status);
    throw new TutorError(response.status===429?'A Groq atingiu o limite de uso. Aguarde um pouco e tente novamente.':
     response.status===401?'A chave da Groq não foi aceita. Confira GROQ_API_KEY no Supabase.':
     response.status===403||response.status===404?'O modelo não está disponível nesta conta Groq. Confira GROQ_MODEL no Supabase.':
     'Não foi possível obter uma resposta da Groq. Tente novamente.',502);
   }
   if(!stream){
    const result=await response.json(),choice=result.choices?.[0];
    if(choice?.finish_reason!=='stop')throw new TutorError('A Groq não concluiu a resposta. Tente novamente.',502);
    const text=choice.message?.content;
    if(typeof text!=='string'||!text.trim())throw new TutorError('A Groq não retornou uma explicação. Tente novamente.',502);
    cleanup();return {response:text};
   }
   if(!response.body)throw new TutorError('A conexão com a Groq foi interrompida.',502);
   const reader=response.body.getReader();let closed=false;
   return new ReadableStream({
    start(controller){(async()=>{
     let buffer='',completed=false,sawDone=false;const decoder=new TextDecoder();
     const consume=block=>{
      const data=block.split('\n').filter(line=>line.startsWith('data:')).map(line=>line.slice(5).trimStart()).join('\n');
      if(!data)return;if(data==='[DONE]'){sawDone=true;return;}
      if(sawDone)throw Error('Unexpected trailing event');
      const event=JSON.parse(data);if(event.error)throw new TutorError('A Groq interrompeu a resposta. Tente novamente.',502);
      const choice=event.choices?.[0];if(!choice)return;
      const text=choice.delta?.content;
      if(typeof text==='string'&&text)controller.enqueue(encoder.encode('data: '+JSON.stringify({response:text})+'\n\n'));
      if(choice.finish_reason){
       if(choice.finish_reason!=='stop')throw new TutorError(choice.finish_reason==='length'?'A resposta atingiu o limite de tamanho. Tente uma pergunta mais curta.':'A Groq não concluiu a resposta. Tente novamente.',502);
       completed=true;
      }
     };
     try{
      for(;;){const part=await reader.read();if(part.done)break;buffer+=decoder.decode(part.value,{stream:true}).replace(/\r/g,'');if(buffer.length>1000000)throw Error('Invalid stream');const blocks=buffer.split('\n\n');buffer=blocks.pop();for(const block of blocks)consume(block);}
      buffer+=decoder.decode();if(buffer.trim())consume(buffer);
      if(!completed||!sawDone)throw new TutorError('A conexão com a Groq terminou antes de concluir. Tente novamente.',502);
      if(!closed){controller.enqueue(encoder.encode('data: [DONE]\n\n'));closed=true;controller.close();}
     }catch(error){if(!closed){closed=true;controller.error(error);}lifetime.abort();await reader.cancel().catch(()=>{});}
     finally{cleanup();}
    })();},
    cancel(){closed=true;lifetime.abort();cleanup();return reader.cancel().catch(()=>{});}
   });
  }catch(error){cleanup();lifetime.abort();throw error;}
 }};
}
