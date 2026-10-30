const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm');
const html=fs.readFileSync(require('path').join(__dirname,'../index.html'),'utf8');
function engine(){const ctx=vm.createContext({});const curriculum=[...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map(m=>m[1]).find(s=>s.includes('root.Curriculum=data'));vm.runInContext(curriculum,ctx);for(const name of ['study-content.js','adaptive.js'])vm.runInContext(fs.readFileSync(require('path').join(__dirname,'..',name),'utf8'),ctx);return {A:ctx.Adaptive,C:ctx.Curriculum};}
const {A,C}=engine(),today='2026-10-30';
function state(grade=7){const s=A.blank();s.profile=A.profileInput({name:'Aluno de teste',age:13,grade,difficulties:[]});return s;}
test('all available grades, subjects and fixed levels generate safe, distinct plans',()=>{
 let count=0;for(let grade=1;grade<=12;grade++)for(const subject of A.subjects(state(grade)))for(const level of ['auto',...A.levels]){
 const s=state(grade),pool=A.eligible(s,subject.id,level==='auto'?null:level);if(!pool.length)continue;
 const p=A.makePlan(s,subject.id,today,level);assert.ok(p,`${grade}/${subject.id}/${level}`);assert.ok(p.questionIds.length>=1&&p.questionIds.length<=3);
 const ids=[p.exampleId,...p.questionIds];assert.equal(new Set(ids.map(A.canonical)).size,ids.length);
 for(const id of ids){const q=A.question(id);assert.ok(q.minGrade<=grade);assert.equal(q.band,A.band(grade));if(level!=='auto')assert.equal(q.level,level);}count++;
 }assert.ok(count>350);
});
test('regeneration changes a practice, intentional repeat preserves IDs and history',()=>{
 for(const grade of [1,4,7,10])for(const sub of A.subjects(state(grade)))for(const level of ['auto','facil']){
 const s=state(grade),p=A.makePlan(s,sub.id,today,level);if(!p)continue;s.plan=p;
 const next=A.makePlan(s,sub.id,today,level);assert.notEqual(next.questionIds.join(','),p.questionIds.join(','),`${grade}/${sub.id}`);
 const replay=A.repeatPlan(s);assert.equal(replay.questionIds.join(','),p.questionIds.join(','));assert.equal(replay.started,false);assert.equal(s.observations.length,0);
 }
});
test('exhaustion stays usable and reports short fixed-level plans honestly',()=>{
 const s=state();for(let i=0;i<120;i++){s.plan=A.makePlan(s,'historia',today,'facil');assert.ok(s.plan);assert.equal(s.plan.questionIds.length,1);assert.ok(s.plan.limited&&s.plan.notice);}
 assert.equal(s.presentations.length,100);
});
test('priority gives prerequisite support without prohibiting explicit advance',()=>{
 const s=state(8);for(let i=0;i<3;i++)A.observe(s,A.question('learn-m-razoes-'+(i+1)),false,`2026-10-${27+i}`);
 assert.equal(A.learningPath(s,'matematica',today)[0].unit.id,'m-razoes');
 assert.ok(A.makePlan(s,'matematica',today,'auto','m-equacoes'));
 const unknown=state(8);const option=A.learningPath(unknown,'matematica',today).find(x=>x.unit.id==='m-equacoes');assert.equal(option.prerequisites[0].stats.count,0);
});
test('missing and cyclic prerequisites do not recurse or crash',()=>{
 const u=C.units.find(u=>u.id==='m-razoes'),v=C.units.find(u=>u.id==='m-equacoes');const old=[u.prerequisites,v.prerequisites];
 try{u.prerequisites=['missing','m-equacoes','m-razoes'];v.prerequisites=['m-razoes'];const s=state(8);assert.ok(A.learningPath(s,'matematica',today).length);}finally{[u.prerequisites,v.prerequisites]=old;}
});
test('diversity, due reviews, upcoming assessment and topic affect recommendations',()=>{
 const s=state();s.profile.difficulties=['matematica'];const chosen=new Set();
 for(let i=0;i<30;i++){const day=new Date(Date.UTC(2026,8,1+i)).toISOString().slice(0,10);const rec=A.recommend(s,day)[0];chosen.add(rec.id);A.observe(s,A.select(s,rec.id,day),false,day);}
 assert.ok(chosen.size>1);
 A.setPreferences(s,{subject:'ingles',assessment:'2026-11-01',topic:'equações',minutes:5});assert.match(A.recommend(s,today).find(x=>x.id==='ingles').reason,/avaliação/);
 assert.equal(A.minutes(s),5);assert.equal(A.makePlan(s,'matematica',today).questionIds.length,1);
});
test('skips produce no observations, helped correct answers do not promote independently',()=>{
 const s=state();A.startDiagnostic(s,today);while(!s.diagnostic.finished)A.diagnosticAnswer(s,null,today);assert.equal(s.observations.length,0);
 const q=A.select(s,'matematica',today);for(let i=1;i<=20;i++)A.observe(s,q,true,`2026-09-${String(i).padStart(2,'0')}`,{helped:true});assert.equal(A.model(s,'matematica').independent,0);assert.equal(A.model(s,'matematica').level,'facil');
});
test('validates calendars and imported invalid observations without mutating original',()=>{
 for(const value of ['2026-02-31','2026-02-29','2026-13-01','bad',null])assert.equal(A.validDate(value),false);
 assert.equal(A.validDate('2024-02-29'),true);
 const s=state();assert.equal(A.observe(s,A.select(s,'matematica',today),true,'2026-02-31'),false);
 const raw=JSON.parse(JSON.stringify(s));raw.observations=[{questionId:'missing',date:today,correct:true,grade:7}];assert.equal(A.load(raw).observations.length,0);assert.equal(raw.observations.length,1);
});
test('v1 migration retains more than 5000 observations and is stable on repeated load',()=>{
 const old=state();old.version=1;old.observations=Array.from({length:6000},(_,i)=>({questionId:C.questions[i%558].id,date:new Date(Date.UTC(2020,0,1+Math.floor(i/558))).toISOString().slice(0,10),correct:true,helped:false,grade:7,source:'practice'}));
 const next=A.load(JSON.parse(JSON.stringify(old)));assert.equal(next.version,2);assert.equal(next.observations.length,6000);assert.equal(old.version,1);
 assert.equal(JSON.stringify(A.load(JSON.parse(JSON.stringify(next)))),JSON.stringify(next));
});
test('cache invalidates on answer, profile change, restore and midnight review',()=>{
 const s=state(),q=A.select(s,'matematica',today);assert.equal(A.model(s,'matematica').count,0);A.observe(s,q,false,today);assert.equal(A.model(s,'matematica').count,1);
 assert.equal(A.reviewInfo(s,q,today).overdue,false);assert.equal(A.reviewInfo(s,q,'2026-10-31').overdue,true);
 s.profile.difficulties=['ingles'];assert.equal(A.model(s,'ingles').chosen,true);
 s.observations=[];assert.equal(A.model(s,'matematica').count,0);
});
test('equivalent question IDs share first-attempt evidence but keep stored IDs',()=>{
 const s=state(10),a=A.question('fisica-em-gw157w'),b=A.question('learn-f-eletricidade-6');assert.equal(A.canonical(a.id),A.canonical(b.id));
 assert.equal(A.observe(s,a,false,today),true);assert.equal(A.observe(s,b,true,today),false);assert.equal(s.observations[0].questionId,a.id);assert.equal(A.model(s,'fisica').count,1);
 assert.equal(A.unitStats(s,A.unit(b.unitId),today).count,1);
});
test('spaced review, first attempt and confidence stay separate from scores',()=>{
 const s=state(),q=A.select(s,'matematica',today);for(let i=0;i<4;i++){const d=`2026-10-${20+i}`;A.observe(s,q,true,d,{confidence:'guess'});assert.equal(A.reviewInfo(s,q,d).days,[1,3,7,14][i]);}
 assert.equal(A.observe(s,q,false,'2026-10-23'),false);assert.equal(s.observations[0].confidence,'guess');
 A.observe(s,q,false,today);assert.equal(A.reviewInfo(s,q,today).days,1);
});
test('new questions have safe unique choices and documented editorial status',()=>{
 const expected=[8,5,'20 − 12',8,16,'17 + 15 = 32','2/6',4,'1/3 é maior que 1/4','3/4 de litro',18,'1/4 de metro',36,6,170,'40%','Mercado A',150];
 const additions=C.questions.filter(q=>q.id.startsWith('study-v2-'));assert.equal(additions.length,18);
 additions.forEach((q,i)=>{assert.equal(q.answers[q.correct],String(expected[i]));assert.equal(new Set(q.answers).size,4);assert.ok(q.hints[0]);assert.equal(q.editorialStatus,'pending-pedagogical-review');assert.ok(q.feedback);});
 for(const unit of ['m-somas','m-fracoes','m-razoes'])for(const level of A.levels){const s=state(unit==='m-somas'?3:unit==='m-fracoes'?5:7);assert.equal(A.makePlan(s,'matematica',today,level,unit).questionIds.length,3);}
});

test('empty banks, missing units and canonical exclusions remain safe',()=>{
 const s=state(10);assert.equal(A.makePlan(s,'matematica',today,'auto','not-a-unit'),null);
 const selected=A.select(s,'fisica',today,{exclude:['fisica-em-gw157w']});assert.notEqual(A.canonical(selected.id),A.canonical('fisica-em-gw157w'));
 const old=C.questions;try{C.questions=[];const blank=state();assert.equal(A.makePlan(blank,'matematica',today),null);assert.equal(A.startDiagnostic(blank,today),null);assert.equal(A.diagnosticAnswer(blank,0,today),false);}finally{C.questions=old;}
});
