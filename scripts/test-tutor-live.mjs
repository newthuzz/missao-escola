// Explicit opt-in integration evaluation. Requires a dedicated test account.
// Tokens are read from the environment and never printed or saved in the report.
import {writeFile} from 'node:fs/promises';
import {questions} from '../server/tutor-core.mjs';
const site=process.env.TUTOR_TEST_SITE,token=process.env.TUTOR_TEST_TOKEN;
if(!site||!token){console.error('Não executado: configure TUTOR_TEST_SITE e TUTOR_TEST_TOKEN de uma conta de teste. Não publique nem compartilhe o token.');process.exitCode=2;}
else {
 const base=new URL(site);if(base.protocol!=='https:')throw Error('Use HTTPS no teste online.');
 const q=questions.get('study-v2-m-fracoes-7'),context={exerciseId:q.id,version:q.revision,mode:'study'};
 const cases=[
  ['Preparação','Explique a conta desta questão e por que ela funciona.',''],
  ['A','Pq essa conta deu isso?',''],
  ['B','E se fosse negativo?',''],
  ['C','Esquece a questão, me explica porcentagem.',''],
  ['D','Outra questão: Qual a importância da fotossíntese? Escrevi essa resposta. Tá certa?','É o jeito que a planta usa a luz para produzir alimento.'],
  ['E','Não entendi, explica de outro jeito.',''],
  ['F','Agora volte para o exercício aberto. Resolve essa questão e explica cada passo.',''],
  ['G','Se uma biblioteca emprestasse metade de seus livros e depois recebesse a mesma quantidade emprestada, ela teria mais livros do que no início? Explique o raciocínio.','']
 ];
 const report={date:new Date().toISOString(),site:base.origin,provider:'Cloudflare Workers AI',model:'@cf/meta/llama-3.3-70b-instruct-fp8-fast',semanticReview:'Pendente de revisão humana das respostas efetivas.',results:[]};
 for(const [test,message,answer] of cases){
  try{
   const response=await fetch(new URL('/api/tutor',base),{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json',Origin:base.origin},body:JSON.stringify({op:'send',context,message,answer,requestId:crypto.randomUUID()}),signal:AbortSignal.timeout(110000)});
   const raw=await response.text();let final,error;
   if(response.headers.get('Content-Type')?.includes('application/json')){const data=JSON.parse(raw);final=data.text;error=data.error;}
   else for(const block of raw.replace(/\r/g,'').split('\n\n')){const lines=block.split('\n'),event=lines.find(x=>x.startsWith('event:'))?.slice(6).trim(),data=lines.filter(x=>x.startsWith('data:')).map(x=>x.slice(5).trim()).join('\n');if(!data)continue;const parsed=JSON.parse(data);if(event==='done')final=parsed.text;if(event==='error')error=parsed.error;}
   report.results.push({test,message,answer,httpStatus:response.status,completed:Boolean(final),response:final||null,error:error||null,semanticReview:'Não avaliado automaticamente.'});
   console.log(test,final?'Resposta registrada para avaliação humana':'Não concluído');
   if(!final)break;
  }catch{report.results.push({test,completed:false,error:'Falha de conexão ou tempo excedido.'});break;}
 }
 await writeFile('tutor-live-results.json',JSON.stringify(report,null,2)+'\n');
 if(report.results.length!==cases.length||report.results.some(result=>!result.completed))process.exitCode=1;
 console.log('Relatório gravado em tutor-live-results.json. Responder não comprova correção: revise os critérios A–G. O teste H é validado separadamente no navegador.');
}
