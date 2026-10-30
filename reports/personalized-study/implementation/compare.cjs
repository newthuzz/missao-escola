const fs=require('fs'),vm=require('vm'),{performance}=require('perf_hooks'),path=require('path');
const root=path.resolve(__dirname,'../../..'),html=fs.readFileSync(root+'/index.html','utf8');
const curriculum=[...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map(m=>m[1]).find(s=>s.includes('root.Curriculum=data'));
const output=[];
for(const variant of ['before','after']){
 const ctx=vm.createContext({});vm.runInContext(curriculum,ctx);
 // Same 558-question corpus in both engines to isolate algorithm changes.
 vm.runInContext(fs.readFileSync(variant==='before'?__dirname+'/adaptive-before.js':root+'/adaptive.js','utf8'),ctx);
 const {Adaptive:A,Curriculum:C}=ctx;
 for(const count of [0,500,2000,5000]){
 const s=A.blank();s.profile=A.profileInput({name:'Carga comparável',age:16,grade:10,difficulties:[]});
 s.observations=Array.from({length:count},(_,i)=>({questionId:C.questions[i%558].id,date:new Date(Date.UTC(2024,0,1+Math.floor(i/558))).toISOString().slice(0,10),correct:i%4!==0,helped:false,grade:10,source:'practice'}));
 const operations={recommend:()=>A.recommend(s,'2026-10-30'),makePlan:()=>A.makePlan(s,'matematica','2026-10-30')};
 for(const [operation,fn]of Object.entries(operations))for(const mode of ['warm','cold']){
 const times=[];
 for(let i=0;i<16;i++){
 if(mode==='cold'){s.observations=[...s.observations];A.invalidate?.(s);}
 const t=performance.now();fn();if(i>=4)times.push(performance.now()-t);
 }
 times.sort((a,b)=>a-b);output.push({variant,count,operation,mode,medianMs:+times[6].toFixed(3),maxMs:+times.at(-1).toFixed(3)});
 }
 }
}
fs.writeFileSync(__dirname+'/comparison.json',JSON.stringify(output,null,2));console.log(JSON.stringify(output.filter(x=>x.count===5000),null,2));
