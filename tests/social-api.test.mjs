import {test} from 'node:test';
import assert from 'node:assert/strict';
import {onRequest,questions} from '../functions/api/social.js';
const env={SUPABASE_SERVICE_ROLE_KEY:'server-secret'};
const context=(body,headers={Authorization:'Bearer user-token'})=>({env,request:new Request('https://school.example/api/social',{method:'POST',headers,body:JSON.stringify(body)})});
test('requires login and rejects cross-origin calls',async()=>{
 assert.equal((await onRequest(context({op:'state'},{}))).status,401);
 assert.equal((await onRequest(context({op:'state'},{Origin:'https://evil.example'}))).status,403);
});
test('verifies the token remotely, discards forged identity and score',async()=>{
 let call=0;
 globalThis.fetch=async(url,options)=>{
  if(call++===0){assert.match(url,/auth\/v1\/user$/);assert.equal(options.headers.Authorization,'Bearer user-token');return Response.json({id:'verified-user'});}
  const body=JSON.parse(options.body);assert.equal(body.p_user,'verified-user');assert.deepEqual(body.p_body,{});
  assert.equal(options.headers.Authorization,'Bearer server-secret');
  return Response.json({registered:true});
 };
 const response=await onRequest(context({op:'state',p_user:'attacker',points:99999,questions:[{correct:0}]}));
 assert.equal(response.status,200);assert.deepEqual(await response.json(),{registered:true});
});
test('server generates fresh session questions instead of using supplied questions',async()=>{
 let call=0;
 globalThis.fetch=async(url,options)=>{
  if(call++===0)return Response.json({id:'verified-user'});
  const body=JSON.parse(options.body);assert.equal(body.p_body.questions.length,3);
  for(const q of body.p_body.questions){assert.equal(q.answers.length,4);assert.ok(q.correct>=0&&q.correct<4);assert.notEqual(q.question,'forged');}
  return Response.json({registered:true});
 };
 assert.equal((await onRequest(context({op:'start',questions:[{question:'forged'}]}))).status,200);
});
test('rejects invalid answers and invalid JWTs before database mutation',async()=>{
 globalThis.fetch=async()=>Response.json({id:'verified-user'});
 assert.equal((await onRequest(context({op:'answer',answer:9,cursor:0}))).status,400);
 globalThis.fetch=async()=>new Response('',{status:401});
 assert.equal((await onRequest(context({op:'join'}))).status,401);
});
test('question answer indexes match arithmetic and choices are unique',()=>{
 for(let j=0;j<100;j++)for(const q of questions()){
 const [a,b]=q.question.match(/\d+/g).map(Number);const value=q.question.includes('−')?a-b:a+b;
 assert.equal(Number(q.answers[q.correct]),value);assert.equal(new Set(q.answers).size,4);
 }
});
