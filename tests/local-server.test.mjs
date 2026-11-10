import {spawn} from 'node:child_process';
import {once} from 'node:events';
import assert from 'node:assert/strict';
const child=spawn(process.execPath,['scripts/serve-local.mjs'],{env:{...process.env,LOCAL_PORT:'4187',SUPABASE_SERVICE_ROLE_KEY:''},stdio:['ignore','pipe','pipe']});
try{
 await Promise.race([once(child.stdout,'data'),once(child,'error').then(([e])=>{throw e;}),new Promise((_,reject)=>setTimeout(()=>reject(Error('Local server startup timed out')),5000).unref())]);
 const base='http://localhost:4187';
 assert.equal((await fetch(base)).status,200);
 assert.equal((await fetch(base+'/assets/brand/logo.svg')).headers.get('Content-Type'),'image/svg+xml');
 assert.equal((await fetch(base+'/tutor-ui.js')).headers.get('Content-Type'),'text/javascript; charset=utf-8');
 for(const path of ['/package.json','/account-secrets.env','/%2e%2e/package.json','/supabase/social.sql'])assert.notEqual((await fetch(base+path)).status,200);
 const unavailable=await fetch(base+'/api/social',{method:'POST',headers:{'Content-Type':'application/json',Origin:base},body:'{"op":"state"}'});
 assert.equal(unavailable.status,503);assert.match((await unavailable.json()).error,/teste local/);
 assert.equal((await fetch(base+'/api/missing')).status,404);
 console.log('PASS local server: static assets/modules, private-source isolation, unknown routes and honest unconfigured social backend.');
}finally{child.kill();await once(child,'exit').catch(()=>{});}
