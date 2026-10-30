import {MODEL,TutorError} from './tutor-core.mjs';
const encoder=new TextEncoder();
export function createOpenAI(key) {
  return {async run({messages,maxOutputTokens,stream,signal}) {
    const lifetime=new AbortController();
    const abort=()=>lifetime.abort();
    if(signal?.aborted)abort();else signal?.addEventListener('abort',abort,{once:true});
    const timer=setTimeout(abort,stream?75000:24000);
    const cleanup=()=>{clearTimeout(timer);signal?.removeEventListener('abort',abort);};
    let response;
    try {
      response=await fetch('https://api.openai.com/v1/responses',{method:'POST',signal:lifetime.signal,
        headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},
        body:JSON.stringify({model:MODEL,store:false,stream:Boolean(stream),reasoning:{effort:'low'},
          instructions:messages.filter(m=>m.role==='system').map(m=>m.content).join('\n\n'),
          input:messages.filter(m=>m.role!=='system').map(m=>({role:m.role,content:m.content})),
          max_output_tokens:maxOutputTokens})});
      if(!response.ok){console.error('Tutor OpenAI HTTP',response.status);throw new TutorError(response.status===429?'O serviço de IA atingiu um limite de uso. Tente novamente mais tarde.':'O serviço de IA está indisponível. Tente novamente mais tarde.',502);}
      if(!stream){
        const result=await response.json();
        if(result.status!=='completed')throw new TutorError('A resposta foi interrompida. Tente novamente.',502);
        const text=(result.output||[]).filter(item=>item.type==='message').flatMap(item=>item.content||[]).filter(part=>part.type==='output_text').map(part=>part.text).join('\n');
        if(!text.trim())throw new TutorError('O modelo não retornou uma explicação. Tente novamente.',502);
        cleanup();return {response:text};
      }
      if(!response.body)throw new TutorError('A conexão com a IA foi interrompida.',502);
      const reader=response.body.getReader();let closed=false;
      return new ReadableStream({
        start(controller){
          (async()=>{
            const decoder=new TextDecoder();let buffer='',completed=false;
            const consume=block=>{
              const data=block.split('\n').filter(line=>line.startsWith('data:')).map(line=>line.slice(5).trimStart()).join('\n');
              if(!data||data==='[DONE]')return;
              const event=JSON.parse(data);
              if(['response.failed','response.incomplete','error'].includes(event.type))throw new TutorError('A resposta foi interrompida. Tente novamente.',502);
              if((event.type==='response.output_text.delta'||event.type==='response.refusal.delta')&&typeof event.delta==='string')controller.enqueue(encoder.encode('data: '+JSON.stringify({response:event.delta})+'\n\n'));
              if(event.type==='response.completed'){
                if(event.response?.status!=='completed')throw new TutorError('A resposta foi interrompida. Tente novamente.',502);
                completed=true;
              }
            };
            try {
              for(;;){const part=await reader.read();if(part.done)break;buffer+=decoder.decode(part.value,{stream:true}).replace(/\r/g,'');if(buffer.length>1000000)throw Error('Invalid stream');const blocks=buffer.split('\n\n');buffer=blocks.pop();for(const block of blocks)consume(block);}
              buffer+=decoder.decode();if(buffer.trim())consume(buffer);
              if(!completed)throw new TutorError('A conexão foi encerrada antes de concluir a resposta.',502);
              if(!closed){controller.enqueue(encoder.encode('data: [DONE]\n\n'));closed=true;controller.close();}
            }catch(error){if(!closed){closed=true;controller.error(error);}lifetime.abort();await reader.cancel().catch(()=>{});}
            finally{cleanup();}
          })();
        },
        cancel(){closed=true;lifetime.abort();cleanup();return reader.cancel().catch(()=>{});}
      });
    }catch(error){cleanup();lifetime.abort();throw error;}
  }};
}
