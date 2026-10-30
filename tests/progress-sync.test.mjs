import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createProgressSync,fingerprint,validateBackup} from '../progress-sync.mjs';
const snapshot=(n=0)=>({progress:{version:3,events:[{id:'event-'+n}]},learner:{version:2,observations:[],profile:null},routine:{version:1,sessions:[]}});
const copy=value=>structuredClone(value);
async function fixture({local=snapshot(1),remote={revision:2,snapshot:snapshot(2)},meta=null,userId='user-a',canApply=true}={}){
 const f={local:copy(local),remote:copy(remote),meta:copy(meta),archives:[],saves:[],statuses:[],canApply};
 f.sync=createProgressSync({userId,getLocal:()=>f.local,readMeta:()=>f.meta,writeMeta:m=>{f.meta=copy(m);},archiveLocal:s=>f.archives.push(copy(s)),canApply:()=>f.canApply,applyRemote:s=>{f.local=s?copy(s):snapshot(0);},fetchRemote:async()=>copy(f.remote),saveRemote:async(s,revision)=>{
 if(revision!==(f.remote?.revision||0))throw Object.assign(Error('Conflict'),{status:409});
 f.saves.push(copy(s));f.remote={revision:revision+1,snapshot:copy(s)};return [copy(f.remote)];
 },onStatus:s=>f.statuses.push(s)});return f;
}
test('login loads latest cloud snapshot and archives the existing local progress',async()=>{
 const f=await fixture();await f.sync.tick();assert.deepEqual(f.local,snapshot(2));assert.deepEqual(f.archives,[snapshot(1)]);assert.equal(f.saves.length,0);assert.equal(f.meta.revision,2);
});
test('new account without backup saves guest progress, never another account progress',async()=>{
 const guest=await fixture({remote:null});await guest.sync.tick();assert.deepEqual(guest.remote.snapshot,snapshot(1));
 const other=await fixture({remote:null,meta:{userId:'user-b',revision:4,baseline:'old'}});await other.sync.tick();assert.deepEqual(other.remote.snapshot,snapshot(0));assert.deepEqual(other.archives,[snapshot(1)]);
});
test('local changes are automatically uploaded with the expected revision',async()=>{
 const f=await fixture();await f.sync.tick();f.local=snapshot(3);await f.sync.tick();assert.equal(f.remote.revision,3);assert.deepEqual(f.remote.snapshot,snapshot(3));
 await f.sync.tick();assert.equal(f.saves.length,1);
});
test('latest revision from another device loads automatically if this device is clean',async()=>{
 const f=await fixture();await f.sync.tick();f.remote={revision:3,snapshot:snapshot(9)};await f.sync.tick();assert.deepEqual(f.local,snapshot(9));assert.equal(f.saves.length,0);
});
test('conflicting device changes pause synchronization; explicit choices work',async()=>{
 const f=await fixture();await f.sync.tick();f.local=snapshot(4);f.remote={revision:3,snapshot:snapshot(5)};await f.sync.tick();assert.equal(f.sync.getState().paused,true);assert.deepEqual(f.local,snapshot(4));assert.equal(f.saves.length,0);
 await f.sync.useRemote();assert.deepEqual(f.local,snapshot(5));assert.equal(f.sync.getState().paused,false);
 f.local=snapshot(6);f.remote={revision:4,snapshot:snapshot(7)};await f.sync.keepLocal();assert.deepEqual(f.remote.snapshot,snapshot(6));assert.equal(f.remote.revision,5);
});
test('offline local work survives reload and uploads when its base revision still matches',async()=>{
 const local=snapshot(4),meta={userId:'user-a',revision:2,baseline:await fingerprint(snapshot(2))};
 const f=await fixture({local,meta});await f.sync.tick();assert.deepEqual(f.remote.snapshot,local);assert.equal(f.archives.length,0);
 const conflict=await fixture({local,meta,remote:{revision:3,snapshot:snapshot(8)}});await conflict.sync.tick();assert.equal(conflict.sync.getState().paused,true);assert.deepEqual(conflict.local,local);assert.equal(conflict.saves.length,0);
});
test('invalid backups and future learner versions cannot replace local progress',async()=>{
 const f=await fixture({remote:{revision:3,snapshot:{...snapshot(),learner:{version:999,observations:[]}}}});await f.sync.tick();assert.deepEqual(f.local,snapshot(1));assert.equal(f.statuses.at(-1).kind,'error');assert.equal(f.saves.length,0);
 assert.throws(()=>validateBackup({revision:1,snapshot:{}}));
});
test('unsaved editing postpones incoming updates and retries after editing ends',async()=>{
 const f=await fixture({canApply:false});await f.sync.tick();assert.deepEqual(f.local,snapshot(1));assert.equal(f.statuses.at(-1).kind,'editing');
 f.canApply=true;await f.sync.tick();assert.deepEqual(f.local,snapshot(2));
});
test('stopping a controller during a fetch prevents stale account data from applying',async()=>{
 let finish;const archives=[];let local=snapshot(1);const sync=createProgressSync({userId:'old',getLocal:()=>local,applyRemote:s=>{local=s;},archiveLocal:s=>archives.push(s),readMeta:()=>null,writeMeta:()=>{},fetchRemote:()=>new Promise(r=>{finish=r;}),saveRemote:()=>{throw Error('Must not save');}});
 const pending=sync.tick();while(!finish)await new Promise(r=>setTimeout(r,1));sync.stop();finish({revision:2,snapshot:snapshot(2)});await pending;assert.deepEqual(local,snapshot(1));assert.equal(archives.length,0);
});
test('network and storage failures retain local data and remain retryable',async()=>{
 let online=false,storage=false,local=snapshot(1);const statuses=[];
 const sync=createProgressSync({userId:'a',getLocal:()=>local,applyRemote:s=>{local=s;},archiveLocal:()=>{if(!storage)throw Error('Storage full');},readMeta:()=>null,writeMeta:()=>{},fetchRemote:async()=>{if(!online)throw Error('Offline');return {revision:2,snapshot:snapshot(2)};},saveRemote:()=>{},onStatus:s=>statuses.push(s)});
 await sync.tick();assert.deepEqual(local,snapshot(1));online=true;await sync.tick();assert.deepEqual(local,snapshot(1));storage=true;await sync.tick();assert.deepEqual(local,snapshot(2));
});
test('CAS conflict during upload never silently overwrites the winning snapshot',async()=>{
 let local=snapshot(1),meta=null,remote={revision:1,snapshot:snapshot(1)};
 const sync=createProgressSync({userId:'a',getLocal:()=>local,applyRemote:s=>{local=s;},archiveLocal:()=>{},readMeta:()=>meta,writeMeta:m=>{meta=m;},fetchRemote:async()=>copy(remote),saveRemote:async()=>{remote={revision:2,snapshot:snapshot(8)};throw Object.assign(Error('conflict'),{status:409});}});
 await sync.tick();local=snapshot(3);await sync.tick();assert.equal(sync.getState().paused,true);assert.deepEqual(remote.snapshot,snapshot(8));assert.deepEqual(local,snapshot(3));
});
test('answers made during an incoming request are retained and stop automatic replacement',async()=>{
 let finish,local=snapshot(1);const statuses=[];
 const sync=createProgressSync({userId:'a',getLocal:()=>local,applyRemote:s=>{local=s;},archiveLocal:()=>{},readMeta:()=>null,writeMeta:()=>{},fetchRemote:()=>new Promise(r=>{finish=r;}),saveRemote:()=>{},onStatus:s=>statuses.push(s)});
 const pending=sync.tick();while(!finish)await new Promise(r=>setTimeout(r,1));local=snapshot(3);finish({revision:2,snapshot:snapshot(2)});await pending;
 assert.deepEqual(local,snapshot(3));assert.equal(statuses.at(-1).kind,'conflict');
});
test('local changes made while uploading remain dirty until a later successful upload',async()=>{
 let local=snapshot(1),meta=null,remote={revision:1,snapshot:snapshot(1)},finish;
 const sync=createProgressSync({userId:'a',getLocal:()=>local,applyRemote:s=>{local=s;},archiveLocal:()=>{},readMeta:()=>meta,writeMeta:m=>{meta=m;},fetchRemote:async()=>copy(remote),saveRemote:(value,revision)=>new Promise(resolve=>{finish=()=>{remote={revision:revision+1,snapshot:copy(value)};resolve([copy(remote)]);};})});
 await sync.tick();local=snapshot(3);const pending=sync.tick();while(!finish)await new Promise(r=>setTimeout(r,1));local=snapshot(4);finish();await pending;
 assert.deepEqual(remote.snapshot,snapshot(3));assert.notEqual(meta.baseline,await fingerprint(local));
});
