import {test} from 'node:test';
import assert from 'node:assert/strict';
import worker from '../worker.mjs';

test('serves browser assets from the asset binding', async()=>{
 const request=new Request('https://school.example/adaptive.js');
 const response=await worker.fetch(request,{ASSETS:{fetch:async received=>{
  assert.equal(received,request);return new Response('browser-asset');
 }}});
 assert.equal(await response.text(),'browser-asset');
});
test('routes the social API to the existing authenticated backend',async()=>{
 const response=await worker.fetch(new Request('https://school.example/api/social',{
  method:'POST',body:JSON.stringify({op:'state'})
 }),{SUPABASE_SERVICE_ROLE_KEY:'test-only',ASSETS:{fetch:()=>{throw Error('API must not be served as HTML');}}});
 assert.equal(response.status,401);
 assert.match((await response.json()).error,/conta/);
});
test('unknown API routes return JSON 404 instead of a frontend fallback',async()=>{
 const response=await worker.fetch(new Request('https://school.example/api/missing'),{});
 assert.equal(response.status,404);assert.match(response.headers.get('Content-Type'),/application\/json/);
});
test('tutor belongs to Supabase rather than the Cloudflare Worker',async()=>{
 const response=await worker.fetch(new Request('https://school.example/api/tutor',{method:'POST',body:'{}'}),{ASSETS:{fetch(){throw Error('Tutor must not be served as an asset');}}});
 assert.equal(response.status,404);
});
