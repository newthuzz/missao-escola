const fs=require('fs'),vm=require('vm'),{performance}=require('perf_hooks'),assert=require('assert/strict');
const root=require('path').resolve(__dirname,'../..');
const html=fs.readFileSync(root+'/index.html','utf8');
const scripts=[...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
const ctx=vm.createContext({});
vm.runInContext(scripts.find(s=>s.includes('root.Curriculum=data')),ctx);
if(fs.existsSync(root+'/study-content.js'))vm.runInContext(fs.readFileSync(root+'/study-content.js','utf8'),ctx);
vm.runInContext(scripts.find(s=>s.includes('function profileInput(input)'))||fs.readFileSync(root+'/adaptive.js','utf8'),ctx);
const C=ctx.Curriculum,A=ctx.Adaptive,date='2026-10-30';
const results={revision:'a6d18cbb54d00e8d8027b1e71d667da474f619c3',counts:{subjects:C.subjects.length,questions:C.questions.length,units:C.units.length},checks:[],matrix:[],findings:{},performance:[]};
function check(name,fn){try{const detail=fn();results.checks.push({name,passed:true,detail});}catch(e){results.checks.push({name,passed:false,error:e.message});}}
function state(grade=7,age=13){const s=A.blank();s.profile=A.profileInput({name:'Aluno de teste',age,grade,difficulties:[]});return s;}
const getDate=i=>new Date(Date.UTC(2025,0,1+i)).toISOString().slice(0,10);
for(let grade=1;grade<=12;grade++)for(const sub of A.subjects(state(grade))){
 const s=state(grade),qs=A.eligible(s,sub.id),plan=A.makePlan(s,sub.id,date);
 results.matrix.push({grade,subject:sub.id,eligible:qs.length,levels:Object.fromEntries(A.levels.map(l=>[l,A.eligible(s,sub.id,l).length])),plan:plan&&{example:plan.exampleId,practice:plan.questionIds.length,skills:[plan.exampleId,...plan.questionIds].map(id=>A.question(id).skill)}});
}
check('Planos válidos para todos os anos/matérias disponíveis',()=>{for(const m of results.matrix){assert.ok(m.plan,JSON.stringify(m));assert.ok(m.plan.practice>0);}return results.matrix.length+' combinações';});
check('Seleção respeita ano mínimo e ciclo em todos os níveis',()=>{let count=0;for(const m of results.matrix)for(const level of ['auto',...A.levels]){const q=A.select(state(m.grade),m.subject,date,{level});if(q){assert.ok(q.minGrade<=m.grade);assert.equal(q.band,A.band(m.grade));count++;}}return count;});
check('IDs, alternativas, explicações e referências de unidades consistentes',()=>{assert.equal(new Set(C.questions.map(q=>q.id)).size,C.questions.length);for(const q of C.questions){assert.ok(q.answers.length>=2);assert.ok(Number.isInteger(q.correct)&&q.correct>=0&&q.correct<q.answers.length);assert.ok(q.explanation);if(q.unitId)assert.ok(C.units.find(u=>u.id===q.unitId)?.questionIds.includes(q.id));}return C.questions.length;});
check('Primeira tentativa por questão/dia preservada',()=>{const s=state(),q=A.select(s,'matematica',date);assert.equal(A.observe(s,q,false,date),true);assert.equal(A.observe(s,q,true,date),false);assert.equal(s.observations[0].correct,false);assert.equal(A.observe(s,q,true,'2026-10-31'),true);});
check('Pular diagnóstico não é registrado como erro',()=>{const s=state();const d=A.startDiagnostic(s,date);for(const id of d.questionIds)A.diagnosticAnswer(s,null,date);assert.equal(s.observations.length,0);assert.ok(A.diagnosticResult(s).every(r=>r.skipped));});
check('Dificuldade reage a acertos e erros, com amostra mínima',()=>{const samples=[];for(const grade of [3,7,10])for(const success of [true,false]){const s=state(grade);for(let i=0;i<30;i++){const q=A.select(s,'matematica',getDate(i));A.observe(s,q,success,getDate(i));}const m=A.model(s,'matematica');samples.push({grade,success,ability:m.ability,level:m.level});assert.equal(m.level,success?'dificil':'facil');}return samples;});
check('Acertos com ajuda não promovem sozinhos para difícil',()=>{const s=state();for(let i=0;i<30;i++)A.observe(s,A.select(s,'matematica',getDate(i)),true,getDate(i),{helped:true});assert.equal(A.model(s,'matematica').independent,0);assert.equal(A.model(s,'matematica').level,'facil');});
check('Revisão cresce 1/3/7/14 dias e erro reinicia',()=>{const s=state(),q=A.select(s,'matematica',date);const intervals=[];for(let i=0;i<4;i++){A.observe(s,q,true,getDate(i));intervals.push(A.reviewInfo(s,q,getDate(i)).days);}assert.equal(intervals.join(','),'1,3,7,14');A.observe(s,q,false,getDate(4));assert.equal(A.reviewInfo(s,q,getDate(4)).days,1);return intervals;});
results.findings.units=C.units.map(u=>({id:u.id,subject:u.subject,band:u.band,questions:u.questionIds.length,skills:[...new Set(u.questionIds.map(id=>A.question(id).skill))],levels:Object.fromEntries(A.levels.map(l=>[l,u.questionIds.filter(id=>A.question(id).level===l).length])),maxGrade:u.maxGrade,minGrade:u.minGrade}));
results.findings.planLevels=results.matrix.flatMap(m=>A.levels.map(level=>({grade:m.grade,subject:m.subject,level,available:m.levels[level],practice:A.makePlan(state(m.grade),m.subject,date,level)?.questionIds.length||0})));
results.findings.prerequisites=C.units.map(u=>({id:u.id,prerequisites:u.prerequisites}));
results.findings.repeatedStems=Object.entries(C.questions.reduce((o,q)=>{(o[q.question]??=[]).push(q.id);return o;},{})).filter(([k,v])=>v.length>1).map(([question,ids])=>({question,ids}));
const fresh=state();results.findings.rebuildSamePlan=JSON.stringify(A.makePlan(fresh,'matematica',date))===JSON.stringify(A.makePlan(fresh,'matematica',date));
results.findings.longtermRecommendations=[];
for(const sub of C.subjects.filter(s=>s.minGrade<=7)){
 const s=state();s.profile.difficulties=[sub.id];for(let i=0;i<120;i++){const today=getDate(i);const selected=A.recommend(s,today)[0].id;results.findings.longtermRecommendations.push({marked:sub.id,day:i,selected});A.observe(s,A.select(s,selected,today),false,today);}
}
const mastery=[];for(const u of C.units){const s=state(u.maxGrade);for(let day=0;day<3;day++)for(const id of u.questionIds)A.observe(s,A.question(id),true,getDate(day));mastery.push({id:u.id,mastered:A.unitStats(s,u,date).mastered,distinct:u.questionIds.length});}
results.findings.mastery=mastery;
const dateState=state();results.findings.invalidCalendarDateAccepted=A.observe(dateState,A.select(dateState,'matematica',date),true,'2026-02-31');
for(const n of [0,500,2000,5000,10000]){
 const s=state(10);s.observations=Array.from({length:n},(_,i)=>({questionId:C.questions[i%C.questions.length].id,date:getDate(Math.floor(i/C.questions.length)),correct:i%4!==0,helped:false,grade:10,source:'practice'}));
 const ops={recommend:()=>A.recommend(s,date),learningPath:()=>A.learningPath(s,'matematica',date),select:()=>A.select(s,'matematica',date),makePlan:()=>A.makePlan(s,'matematica',date),allPaths:()=>A.subjects(s).map(x=>A.learningPath(s,x.id,date)),serialize:()=>JSON.stringify(s)};
 for(const [op,fn]of Object.entries(ops)){fn();const times=[];for(let i=0;i<12;i++){const start=performance.now();fn();times.push(performance.now()-start);}times.sort((a,b)=>a-b);results.performance.push({observations:n,op,medianMs:+times[6].toFixed(3),p95Ms:+times[11].toFixed(3)});}
 if(n===10000)results.findings.loadTruncation={before:s.observations.length,after:A.load(JSON.parse(JSON.stringify(s))).observations.length};
}
const prerequisiteState=state(8,14);
for(let i=0;i<3;i++)A.observe(prerequisiteState,A.question('learn-m-razoes-'+(i+1)),false,'2026-10-'+(27+i));
results.findings.prerequisiteExample=A.learningPath(prerequisiteState,'matematica',date).map(x=>({id:x.unit.id,priority:x.priority,status:x.stats.status,prerequisites:x.unit.prerequisites}));
results.findings.assets={htmlBytes:Buffer.byteLength(html),inlineScripts:scripts.length,curriculumScriptBytes:Buffer.byteLength(scripts.find(s=>s.includes('root.Curriculum=data'))),questionFields:Object.keys(C.questions[30]),unitFields:Object.keys(C.units[0])};
fs.writeFileSync((process.env.STUDY_AUDIT_OUTPUT_DIR||__dirname)+'/results.json',JSON.stringify(results,null,2));
console.log(JSON.stringify({counts:results.counts,checks:results.checks,matrix:results.matrix.length,findings:{unitsWithFewerThan4:mastery.filter(x=>x.distinct<4).length,unmasterable:mastery.filter(x=>!x.mastered).length,repeatedStems:results.findings.repeatedStems.length,samePlan:results.findings.rebuildSamePlan,invalidDate:results.findings.invalidCalendarDateAccepted,truncation:results.findings.loadTruncation},performance:results.performance},null,2));
