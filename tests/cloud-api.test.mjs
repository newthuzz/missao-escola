import {test} from 'node:test';
import assert from 'node:assert/strict';
import {request,saveBackup,KEY} from '../cloud-api.mjs';
test('login uses public key without inventing a user bearer token',async()=>{
 globalThis.fetch=async(url,options)=>{
  assert.match(url,/\/auth\/v1\/token/);assert.equal(options.headers.apikey,KEY);
  assert.equal(options.headers.Authorization,undefined);
  assert.deepEqual(JSON.parse(options.body),{email:'student@example.com',password:'test-password'});
  return {ok:true,json:async()=>({access_token:'user-token'})};
 };
 assert.equal((await request('/auth/v1/token?grant_type=password',{method:'POST',body:{email:'student@example.com',password:'test-password'}})).access_token,'user-token');
});
test('backup sends authenticated snapshot and expected revision to atomic RPC',async()=>{
 const snapshot={progress:{events:[]},learner:{},routine:{}};
 globalThis.fetch=async(url,options)=>{
  assert.match(url,/\/rest\/v1\/rpc\/save_learner_backup$/);
  assert.equal(options.headers.Authorization,'Bearer user-token');
  assert.deepEqual(JSON.parse(options.body),{p_snapshot:snapshot,p_revision:3});
  return {ok:true,json:async()=>[{revision:4}]};
 };
 assert.equal((await saveBackup('user-token',snapshot,3))[0].revision,4);
});
test('conflicting backup is reported as a conflict rather than success',async()=>{
 globalThis.fetch=async()=>({ok:false,status:409,json:async()=>({code:'40001'})});
 await assert.rejects(()=>saveBackup('user-token',{},2),e=>e.status===409&&e.message.includes('outro aparelho'));
});
test('unexpected non-JSON server failure remains a failure',async()=>{
 globalThis.fetch=async()=>({ok:false,status:502,json:async()=>{throw Error('invalid JSON');}});
 await assert.rejects(()=>request('/rest/v1/learner_backups'),e=>e.status===502);
});
