import {test} from 'node:test';
import assert from 'node:assert/strict';
import {onRequest} from '../functions/api/tutor.js';
import {questions} from '../server/tutor-core.mjs';
const USER='00000000-0000-4000-8000-000000000001',OTHER='00000000-0000-4000-8000-000000000002',CID='00000000-0000-4000-8000-000000000010',RID='00000000-0000-4000-8000-000000000020';
const q=questions.get('study-v2-m-fracoes-7');
const request=body=>new Request('https://school.example/api/tutor',{method:'POST',headers:{Authorization:'Bearer test-token',Origin:'https://school.example','Content-Type':'application/json'},body:JSON.stringify(body)});
async function harness(run,options={}) {
 const original=globalThis.fetch,calls=[],inputs=[],tasks=[];
 globalThis.fetch=async(url,init)=>{
  if(url.includes('/auth/v1/user'))return Response.json(options.badAuth?{}:{id:USER,email:'private@example.test'},{status:options.badAuth?401:200});
  if(url.includes('/learner_backups'))return Response.json([{snapshot:{learner:{profile:{grade:7,name:'PRIVATE NAME'},...(options.diagnostic?{diagnostic:{questionIds:[q.id],finished:false}}:{})},progress:{events:[]}}}]);
  const data=JSON.parse(init.body);calls.push(data);
  assert.equal(data.p_user,USER);
  if(options.rpcError)return Response.json({code:'P0001',message:options.rpcError},{status:400});
  if(data.p_op==='reserve')return Response.json(options.cached?{cached:true,response:'Previously stored model response',conversation_id:CID}:{conversation:{id:CID,summary:'',summary_seq:0},messages:options.history||[],user_seq:99,cached:false});
  if(data.p_op==='state')return Response.json({conversation:null,messages:[],conversations:[]});
  return Response.json({saved:true});
 };
 const env={SUPABASE_SERVICE_ROLE_KEY:'server-secret',TUTOR_ENABLED:'true',AI:{run:async(model,input)=>{inputs.push({model,input});if(options.providerError)throw Error('provider internal secret');if(!input.stream)return {response:'Resumo contextual'};return new ReadableStream({start(c){const bytes=new TextEncoder().encode('data: {"response":"Explicação com frações: "}\n\ndata: {"response":"ação e razão."}\n\ndata: [DONE]\n\n');c.enqueue(bytes.slice(0,60));c.enqueue(bytes.slice(60,68));c.enqueue(bytes.slice(68));c.close();}});}}};
 try{return await run({env,calls,inputs,tasks,handle:body=>onRequest({request:request(body),env,waitUntil:p=>tasks.push(p)})});}
 finally{await Promise.all(tasks);globalThis.fetch=original;}
}
const payload={op:'send',requestId:RID,message:'Pq essa conta deu isso?',answer:'Minha tentativa',context:{exerciseId:q.id,version:q.revision,mode:'study'},userId:OTHER,correct:'forged'};
test('requires auth and same origin before any provider use',async()=>{
 assert.equal((await onRequest({request:new Request('https://school.example/api/tutor',{method:'POST'}),env:{}})).status,401);
 assert.equal((await onRequest({request:new Request('https://school.example/api/tutor',{method:'POST',headers:{Origin:'https://evil.example'}}),env:{}})).status,403);
 await harness(async({handle,inputs})=>{assert.equal((await handle(payload)).status,401);assert.equal(inputs.length,0);},{badAuth:true});
});
test('streams a real provider interface, preserves UTF-8 and stores only completed answers',()=>harness(async({handle,calls,inputs})=>{
 const response=await handle(payload),text=await response.text();
 assert.match(response.headers.get('Content-Type'),/event-stream/);assert.match(text,/event: done/);assert.match(text,/ação e razão/);
 assert.equal(calls[0].p_body.context.exercise.statement,q.question);assert.notEqual(calls[0].p_body.context.exercise.answer,'forged');
 assert.ok(inputs[0].input.messages.some(m=>m.role==='user'&&m.content.includes(payload.message)));
 assert.ok(!JSON.stringify(inputs).includes('PRIVATE NAME'));assert.ok(!JSON.stringify(inputs).includes('private@example.test'));assert.ok(!JSON.stringify(inputs).includes('server-secret'));
 assert.equal(calls.find(c=>c.p_op==='finish').p_body.response,'Explicação com frações: ação e razão.');
}));
test('cached retries do not call the model again',()=>harness(async({handle,inputs})=>{
 const response=await handle(payload);assert.equal((await response.json()).text,'Previously stored model response');assert.equal(inputs.length,0);
},{cached:true}));
test('quota conflicts and stale exercise versions stop before AI generation',async()=>{
 await harness(async({handle,inputs})=>{assert.equal((await handle(payload)).status,429);assert.equal(inputs.length,0);},{rpcError:'LIMIT:Aguarde.'});
 await harness(async({handle,inputs})=>{assert.equal((await handle({...payload,context:{...payload.context,version:'old'}})).status,409);assert.equal(inputs.length,0);});
});
test('provider failures produce an explicit error and never a simulated answer',()=>harness(async({handle,calls})=>{
 const text=await (await handle(payload)).text();assert.match(text,/event: error/);assert.ok(!text.includes('provider internal secret'));assert.ok(!text.includes('event: done'));
 assert.ok(calls.some(c=>c.p_op==='fail'));assert.ok(!calls.some(c=>c.p_op==='finish'));
},{providerError:true}));
test('old memory is summarized by the provider before the final response',()=>harness(async({handle,inputs,calls})=>{
 await (await handle(payload)).text();assert.equal(inputs.length,2);assert.equal(inputs[0].input.stream,false);assert.equal(inputs[1].input.stream,true);
 assert.equal(calls.find(c=>c.p_op==='finish').p_body.summary,'Resumo contextual');
},{history:Array.from({length:24},(_,i)=>({seq:i+1,role:i%2?'assistant':'user',content:'Previous turn '+i}))}));
test('server diagnostic prevents study answer keys in model context',()=>harness(async({handle,inputs})=>{
 await (await handle(payload)).text();const raw=JSON.stringify(inputs[0].input.messages);assert.ok(raw.includes('diagnostic'));assert.ok(!raw.includes('"answer":'));
},{diagnostic:true}));
test('oversized requests are rejected without provider usage',()=>harness(async({handle,inputs})=>{
 assert.equal((await handle({...payload,message:'x'.repeat(15000)})).status,413);assert.equal(inputs.length,0);
}));
test('disconnect cancels reading and cannot persist a partial assistant answer',()=>harness(async({handle,calls,tasks})=>{
 const response=await handle(payload);await response.body.cancel();await Promise.all(tasks);
 assert.ok(!calls.some(c=>c.p_op==='finish'));assert.ok(calls.some(c=>c.p_op==='fail'));
}));
