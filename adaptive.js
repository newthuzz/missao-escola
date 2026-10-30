/* Modelo local do aluno: estima habilidade com atualizações logísticas online.
 * Não é um modelo de linguagem. Sugestões pedagógicas são estimativas, não notas.
 */
(function(root,factory){const api=factory(typeof module==='object'&&module.exports?require('./curriculum.js'):root.Curriculum);if(typeof module==='object'&&module.exports)module.exports=api;else root.Adaptive=api;})(typeof globalThis!=='undefined'?globalThis:this,function(C){
 'use strict';
 const questionMap=new Map(C.questions.map(q=>[q.id,q])), subjectMap=new Map(C.subjects.map(s=>[s.id,s]));
 const levels=['facil','medio','dificil'], difficulty={facil:-1.3,medio:0,dificil:1.25};
 const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
 const validDate=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(Date.parse(s+'T12:00:00Z'))&&new Date(s+'T12:00:00Z').toISOString().slice(0,10)===s;
 const canonicalMap=new Map(),stems=new Map();
 for(const q of C.questions){const key=q.question.normalize('NFKC').toLowerCase().replace(/\s+/g,' ').trim();const id=stems.get(key)||q.id;stems.set(key,id);canonicalMap.set(q.id,id);}
 const duplicateGroups=new Map();for(const q of C.questions){const old=canonicalMap.get(q.id);if(!duplicateGroups.has(old))duplicateGroups.set(old,[]);duplicateGroups.get(old).push(q);}for(const group of duplicateGroups.values()){const preferred=group.find(q=>!q.legacy)||group[0];group.forEach(q=>canonicalMap.set(q.id,preferred.id));}
 const canonical=id=>canonicalMap.get(id)||id;
 const caches=new WeakMap();
 function index(s){
  const signature=JSON.stringify([s.profile,s.preferences]),old=caches.get(s);
  if(old&&old.array===s.observations&&old.length===s.observations.length&&old.signature===signature)return old;
  const ix={array:s.observations,length:s.observations.length,signature,bySubject:new Map(),byQuestion:new Map(),byUnit:new Map(),models:new Map(),reviews:new Map(),stats:new Map(),paths:new Map(),recommendations:new Map()};
  const seen=new Set();
  for(const o of s.observations){const q=questionMap.get(o.questionId);if(!q)continue;const key=o.date+':'+canonical(q.id);if(seen.has(key))continue;seen.add(key);
   const cid=canonical(q.id),uid=questionMap.get(cid)?.unitId||q.unitId;
   if(!ix.bySubject.has(q.subject))ix.bySubject.set(q.subject,[]);ix.bySubject.get(q.subject).push(o);
   if(!ix.byQuestion.has(cid))ix.byQuestion.set(cid,[]);ix.byQuestion.get(cid).push(o);
   if(!ix.byUnit.has(uid))ix.byUnit.set(uid,[]);ix.byUnit.get(uid).push(o);
  }
  caches.set(s,ix);return ix;
 }
 function invalidate(s){caches.delete(s);}
 function preferences(raw={}){return {minutes:[5,10,15].includes(Number(raw?.minutes))?Number(raw.minutes):null,topic:typeof raw?.topic==='string'?raw.topic.trim().slice(0,80):'',subject:subjectMap.has(raw?.subject)?raw.subject:'',assessment:validDate(raw?.assessment)?raw.assessment:null};}
 function setPreferences(s,value){s.preferences=preferences(value);invalidate(s);return s.preferences;}
 function planMinutes(s,count){return Math.min(minutes(s),2+count*2);}
 const band=grade=>grade<=5?'f1':grade<=9?'f2':'em';
 function blank(){return {version:2,preferences:{},presentations:[],profile:null,observations:[],diagnostic:null,plan:null,introDismissed:false};}
 function profileInput(input){
  const name=typeof input?.name==='string'?input.name.trim().replace(/\s+/g,' ').slice(0,60):'';
  const age=Number(input?.age),grade=Number(input?.grade);
  if(!name||!Number.isInteger(age)||age<5||age>100||!Number.isInteger(grade)||grade<1||grade>12)return null;
  const difficulties=Array.isArray(input.difficulties)?[...new Set(input.difficulties.filter(id=>subjectMap.has(id)&&subjectMap.get(id).minGrade<=grade))]:[];
  return {name,age,grade,difficulties};
 }
 function load(raw){
  const s=blank();if(!raw||![1,2].includes(raw.version))return s;
  s.preferences=preferences(raw.preferences);
  s.presentations=Array.isArray(raw.presentations)?raw.presentations.filter(p=>p&&validDate(p.date)&&Array.isArray(p.ids)).slice(-100).map(p=>({date:p.date,ids:p.ids.filter(id=>questionMap.has(id))})):[];
  s.profile=profileInput(raw.profile);s.introDismissed=Boolean(raw.introDismissed);
  const seen=new Set();
  if(Array.isArray(raw.observations))s.observations=raw.observations.filter(o=>o&&questionMap.has(o.questionId)&&validDate(o.date)&&typeof o.correct==='boolean'&&Number.isInteger(o.grade)&&o.grade>=1&&o.grade<=12&&!seen.has(o.date+':'+o.questionId)&&(seen.add(o.date+':'+o.questionId),true)).map(o=>({questionId:o.questionId,date:o.date,correct:o.correct,helped:!!o.helped,grade:o.grade,source:['diagnostic','online'].includes(o.source)?o.source:'practice',confidence:['guess','unsure','sure'].includes(o.confidence)?o.confidence:null}));
  const d=raw.diagnostic;
  if(d&&validDate(d.date)&&Number.isInteger(d.grade)&&d.grade>=1&&d.grade<=12&&Array.isArray(d.questionIds)&&d.questionIds.length<=12&&d.questionIds.length>0&&d.questionIds.every(id=>questionMap.has(id))&&new Set(d.questionIds).size===d.questionIds.length&&Array.isArray(d.answers)){
   const answers=[];
   for(let i=0;i<Math.min(d.answers.length,d.questionIds.length);i++){const a=d.answers[i],q=questionMap.get(d.questionIds[i]);if(a===null||Number.isInteger(a)&&a>=0&&a<q.answers.length)answers.push(a);else break;}
   s.diagnostic={date:d.date,grade:d.grade,questionIds:[...d.questionIds],answers,finished:answers.length===d.questionIds.length};
  }
  const p=raw.plan;
  if(p&&validDate(p.date)&&subjectMap.has(p.subject)&&questionMap.get(p.exampleId)?.subject===p.subject&&Array.isArray(p.questionIds)&&p.questionIds.length>0&&p.questionIds.length<=3&&p.questionIds.every(id=>questionMap.get(id)?.subject===p.subject)&&levels.includes(p.level))s.plan={date:p.date,subject:p.subject,level:p.level,exampleId:p.exampleId,questionIds:[...new Set(p.questionIds)],started:!!p.started,reviewed:!!p.reviewed,answeredIds:Array.isArray(p.answeredIds)?[...new Set(p.answeredIds.filter(id=>p.questionIds.includes(id)))]:[],finished:!!p.finished,unitId:questionMap.get(p.exampleId)?.unitId||null,estimatedMinutes:planMinutes(s,p.questionIds.length),limited:!!p.limited,notice:typeof p.notice==='string'?p.notice.slice(0,300):'',...(p.explicitFoundation?{explicitFoundation:true}:{})};
  if(s.plan&&!s.plan.explicitFoundation&&s.profile&&questionMap.get(s.plan.exampleId)?.band!==band(s.profile.grade))s.plan=null;
  if(s.plan){const ids=[s.plan.exampleId,...s.plan.questionIds];const grade=s.profile?.grade||7;if(new Set(ids.map(canonical)).size!==ids.length||ids.some(id=>questionMap.get(id).minGrade>grade||(!s.plan.explicitFoundation&&questionMap.get(id).band!==band(grade))))s.plan=null;}
  return s;
 }
 function subjects(s){const grade=s.profile?.grade||7;return C.subjects.filter(c=>c.minGrade<=grade);}
 function eligible(s,subject,level=null,{unitId=null,includeEarlier=false}={}){const grade=s.profile?.grade||7;return C.questions.filter(q=>q.subject===subject&&q.minGrade<=grade&&(includeEarlier||q.band===band(grade))&&(!unitId||q.unitId===unitId)&&(!level||q.level===level));}
 function observe(s,q,correct,date,{helped=false,source='practice',confidence=null}={}){
  if(!questionMap.has(q.id)||!validDate(date)||typeof correct!=='boolean'||(index(s).byQuestion.get(canonical(q.id))||[]).some(o=>o.date===date))return false;
  s.observations.push({questionId:q.id,date,correct,helped:!!helped,source:['diagnostic','online'].includes(source)?source:'practice',grade:s.profile?.grade||7,confidence:['guess','unsure','sure'].includes(confidence)?confidence:null});invalidate(s);return true;
 }
 function model(s,subject){
  const ix=index(s);if(ix.models.has(subject))return ix.models.get(subject);
  const chosen=s.profile?.difficulties.includes(subject),m={ability:chosen?-.65:-.2,skills:{},count:0,correct:0,independent:0,recent:[],chosen};
  for(const observation of ix.bySubject.get(subject)||[]){
   const q=questionMap.get(observation.questionId);if(q?.subject!==subject)continue;
   const skill=m.skills[q.skill]||{offset:0,count:0,correct:0};
   const b=difficulty[q.level],prediction=1/(1+Math.exp(-(m.ability+skill.offset*.45-b)));
   const weight=(observation.helped?.35:1)*(q.band===band(s.profile?.grade||7)?1:.2),rate=.62/Math.sqrt(1+m.count/25),error=(Number(observation.correct)-prediction)*weight;
   m.ability=clamp(m.ability+rate*error,-2.8,3);skill.offset=clamp(skill.offset+.35*error,-1.4,1.4);skill.count++;skill.correct+=Number(observation.correct);m.skills[q.skill]=skill;
   m.count++;m.correct+=Number(observation.correct);if(!observation.helped&&q.band===band(s.profile?.grade||7))m.independent++;m.recent.push(observation);
  }
  m.recent=m.recent.slice(-5);m.accuracy=m.count?m.correct/m.count:null;
  m.level=m.independent>=8&&m.ability>=.9?'dificil':m.independent>=3&&m.ability>=-.05?'medio':'facil';
  ix.models.set(subject,m);return m;
 }
 function predict(m,q,grade){const b=difficulty[q.level]+(q.band===band(grade)?0:-.6);return 1/(1+Math.exp(-(m.ability+(m.skills[q.skill]?.offset||0)*.45-b)));}
 function recommend(s,today){
  const ix=index(s);if(ix.recommendations.has(today))return ix.recommendations.get(today);
  const output=subjects(s).map(subject=>{
   const m=model(s,subject.id),obs=ix.bySubject.get(subject.id)||[],days=new Set(obs.map(o=>o.date));
   let streak=0;for(let i=1;i<=4&&days.has(addDays(today,-i));i++)streak++;
   const due=unitsFor(s,subject.id).some(u=>u.questionIds.some(id=>reviewInfo(s,questionMap.get(id),today).overdue));
   const exam=s.preferences?.subject===subject.id&&s.preferences.assessment&&s.preferences.assessment>=today&&s.preferences.assessment<=addDays(today,14);
   const priority=(m.chosen?.6:0)+(m.count?1-m.accuracy:.5)*.9+.45/(m.count+1)-m.recent.filter(o=>o.date===today).length*.15-Math.min(1.4,streak*.5)+(due?.3:0)+(exam?.6:0);
   const reason=exam?'Você informou uma avaliação próxima nesta matéria.':streak>=2?'Você já reforçou esta matéria em dias seguidos; pode alternar com outra.':due?'Há conteúdos com revisão prevista para hoje.':m.chosen?'Você marcou esta matéria como um ponto de atenção.':m.count?'Continue um conteúdo que você já começou.':'Explore outra matéria: ainda temos poucas evidências.';
   return {...subject,model:m,priority,reason};
  }).sort((a,b)=>b.priority-a.priority||a.id.localeCompare(b.id));
  ix.recommendations.set(today,output);return output;
 }
 const unit=id=>(C.units||[]).find(u=>u.id===id);
 function unitsFor(s,subject,{allCycles=false}={}){const grade=s.profile?.grade||7;return(C.units||[]).filter(u=>u.subject===subject&&u.minGrade<=grade&&(allCycles||u.band===band(grade)));}
 const addDays=(date,n)=>{const d=new Date(date+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10);};
 function reviewInfo(s,q,today){const ix=index(s),key=canonical(q.id)+':'+today;if(ix.reviews.has(key))return ix.reviews.get(key);const history=[...(ix.byQuestion.get(canonical(q.id))||[])].sort((a,b)=>a.date.localeCompare(b.date)),last=history.at(-1);if(!last)return{due:null,overdue:false,days:0};let streak=0;for(let i=history.length-1;i>=0;i--){if(!history[i].correct||history[i].helped)break;streak++;}const days=!last.correct||last.helped?1:[1,3,7,14][Math.min(3,streak-1)];const due=addDays(last.date,days);const result={due,overdue:due<=today,days,last};ix.reviews.set(key,result);return result;}
 function unitStats(s,u,today){const ix=index(s),key=u.id+':'+today;if(ix.stats.has(key))return ix.stats.get(key);const observations=ix.byUnit.get(u.id)||[],independent=observations.filter(o=>!o.helped),correct=independent.filter(o=>o.correct),distinct=new Set(independent.map(o=>canonical(o.questionId))).size,days=new Set(correct.map(o=>o.date)).size;let weight=0,success=0;for(const o of observations){const w=o.helped?.35:1;weight+=w;if(o.correct)success+=w;}const estimate=(1+success)/(2+weight),mastered=independent.length>=5&&distinct>=4&&days>=2&&correct.length/independent.length>=.8;const due=u.questionIds.map(id=>reviewInfo(s,questionMap.get(id),today)).filter(r=>r.due).sort((a,b)=>a.due.localeCompare(b.due))[0]?.due||null;const recent=observations.slice(-3),struggling=recent.filter(o=>!o.correct).length>=2;const result={count:observations.length,independent:independent.length,distinct,estimate,mastered,due,confidence:distinct>=4&&days>=2?'moderada':observations.length>=3?'inicial':'poucos dados',status:!observations.length?'Novo':struggling?'Reforçar':due&&due<=today?'Revisar':mastered?'Consolidado':'Em prática'};ix.stats.set(key,result);return result;}
 function learningPath(s,subject,today){
  const ix=index(s),key=subject+':'+today;if(ix.paths.has(key))return ix.paths.get(key);
  const grade=s.profile?.grade||7,available=unitsFor(s,subject),allowed=new Set(available.map(u=>u.id));
  const paths=available.map(u=>{const stats=unitStats(s,u,today),prerequisites=(u.prerequisites||[]).filter(id=>id!==u.id&&allowed.has(id)).map(id=>({unit:unit(id),stats:unitStats(s,unit(id),today)}));
   const topic=s.preferences?.topic?.toLocaleLowerCase('pt-BR'),match=topic&&(u.title+' '+u.objective+' '+u.area).toLocaleLowerCase('pt-BR').includes(topic);
   const reason=stats.status==='Reforçar'?'Vamos rever esta base: houve dificuldades recentes.':stats.status==='Revisar'?'Recupere este conteúdo sem consultar a resposta.':match?'Este conteúdo corresponde ao tema que você informou.':stats.count?'Continue praticando em outro contexto.':'Comece com uma checagem curta; ainda temos poucas evidências.';
   return {unit:u,stats,prerequisites,reason,priority:(grade<=u.maxGrade?3:0)+(stats.status==='Reforçar'?3:0)+(stats.status==='Revisar'?2.4:0)+(1-stats.estimate)+(stats.count===0?.5:0)-(stats.mastered?1:0)+(match?2:0)};
  });
  for(const p of paths){const weak=p.prerequisites.filter(x=>x.stats.status==='Reforçar');if(weak.length){p.reason='Antes de '+p.unit.title+', vale rever '+weak.map(x=>x.unit.title).join(', ')+'. Você pode avançar se preferir.';for(const x of weak){const base=paths.find(p=>p.unit.id===x.unit.id);base.priority=Math.max(base.priority,p.priority+1);base.reason='Reforce esta base para seguir em '+p.unit.title+'.';}}}
  paths.sort((a,b)=>b.priority-a.priority||a.unit.id.localeCompare(b.unit.id));ix.paths.set(key,paths);return paths;
 }
 function select(s,subject,today,{level='auto',exclude=[],skill=null,unitId=null,includeEarlier=false}={}){
  const m=model(s,subject),grade=s.profile?.grade||7,targetLevel=level==='auto'?m.level:level;
  const options={unitId,includeEarlier},excluded=new Set(exclude.map(canonical));let pool=eligible(s,subject,targetLevel,options).filter(q=>!excluded.has(canonical(q.id)));if(!pool.length&&level==='auto')pool=eligible(s,subject,null,options).filter(q=>!excluded.has(canonical(q.id)));if(!pool.length)return null;const unique=new Set();pool=pool.filter(q=>!unique.has(canonical(q.id))&&(unique.add(canonical(q.id)),true));
  if(skill&&pool.some(q=>q.skill===skill))pool=pool.filter(q=>q.skill===skill);
  const observations=index(s).bySubject.get(subject)||[];const seenToday=new Set(observations.filter(o=>o.date===today).map(o=>canonical(o.questionId)));
  const seen=new Map(observations.map(o=>[canonical(o.questionId),o]));
  const targetUnit=unitId||learningPath(s,subject,today)[0]?.unit.id;
  const scored=pool.map(q=>({q,score:(seenToday.has(canonical(q.id))?-12:0)+(seen.has(canonical(q.id))?0:1)+(q.legacy?0:3)+(q.unitId===targetUnit?2:0)+(q.maxGrade>=grade?1:0)+(reviewInfo(s,q,today).overdue?2.5:0)-Math.abs(levels.indexOf(q.level)-levels.indexOf(targetLevel))*1.3-Math.abs(predict(m,q,grade)-.7)*2+(seen.get(canonical(q.id))?.correct===false?.4:0)})).sort((a,b)=>b.score-a.score||a.q.id.localeCompare(b.q.id));
  return scored[0]?.q||null;
 }
 function makePlan(s,subject,today,level='auto',unitId=null){
  const chosen=unitId||learningPath(s,subject,today)[0]?.unit.id;
  let pool=eligible(s,subject,level==='auto'?null:level,{unitId:chosen});
  const unique=new Set();pool=pool.filter(q=>!unique.has(canonical(q.id))&&(unique.add(canonical(q.id)),true));
  if(pool.length<2)return null;
  const previous=s.plan?.subject===subject&&s.plan?.date===today?s.plan:null;
  const presentations=(s.presentations||[]).slice(-10),latest=new Map();presentations.forEach((p,i)=>p.ids.forEach(id=>latest.set(canonical(id),i+1)));
  const preferred=select(s,subject,today,{level,unitId:chosen});
  const score=q=>(reviewInfo(s,q,today).overdue?8:0)+(q.level===preferred?.level?3:0)-(latest.get(canonical(q.id))||0)*.4;
  pool.sort((a,b)=>score(b)-score(a)||a.id.localeCompare(b.id));
  // Use a different example on explicit regeneration; this leaves the old
  // example available as practice even in a two-question bank.
  const first=pool.find(q=>q.id!==previous?.exampleId)||pool[0];
  let practice=pool.filter(q=>q.id!==first.id);
  practice.sort((a,b)=>Number(previous?.questionIds.includes(a.id))-Number(previous?.questionIds.includes(b.id))||score(b)-score(a)||a.id.localeCompare(b.id));
  const capacity=Math.min(3,Math.max(1,Math.floor((minutes(s)-2)/2)));
  practice=practice.slice(0,capacity);
  const limited=practice.length<capacity;
  const notice=limited?'O acervo adequado permite uma sessão menor. Você pode revisitar conteúdos depois.':level==='auto'&&practice.some(q=>q.level!==first.level)?'As etapas variam de dificuldade para consolidar o conteúdo.':'';
  const plan={date:today,subject,unitId:chosen,level:first.level,exampleId:first.id,questionIds:practice.map(q=>q.id),started:false,reviewed:false,answeredIds:[],finished:false,limited,notice,estimatedMinutes:planMinutes(s,practice.length)};
  s.presentations=[...(s.presentations||[]),{date:today,ids:[first.id,...plan.questionIds]}].slice(-100);return plan;
 }
 function repeatPlan(s){if(!s.plan)return null;return {...s.plan,started:false,reviewed:false,answeredIds:[],finished:false};}
 function sessionSummary(s,plan,today){const ids=plan.questionIds;const obs=(index(s).bySubject.get(plan.subject)||[]).filter(o=>o.date===plan.date&&ids.some(id=>canonical(id)===canonical(o.questionId)));const dates=ids.map(id=>reviewInfo(s,questionMap.get(id),today).due).filter(Boolean).sort();return {independent:obs.filter(o=>o.correct&&!o.helped).length,support:obs.filter(o=>o.helped||!o.correct).length,nextReview:dates[0]||null};}
 function startDiagnostic(s,today){
  if(!s.profile)return null;
  if(s.diagnostic&&s.diagnostic.date===today&&s.diagnostic.grade===s.profile.grade)return s.diagnostic;
  const ids=subjects(s).map(subject=>{
   const first=select(s,subject.id,today,{level:'facil'});return first?.id;
  }).filter(Boolean);
  if(!ids.length){s.diagnostic=null;return null;}
  s.diagnostic={date:today,grade:s.profile.grade,questionIds:ids,answers:[],finished:false};return s.diagnostic;
 }
 function diagnosticAnswer(s,index,date){const d=s.diagnostic;if(!d||d.finished||!validDate(date))return false;const q=questionMap.get(d.questionIds[d.answers.length]);if(!q)return false;if(index!==null&&(!Number.isInteger(index)||index<0||index>=q.answers.length))return false;d.answers.push(index);if(index!==null)observe(s,q,index===q.correct,date,{source:'diagnostic'});d.finished=d.answers.length===d.questionIds.length;return true;}
 function diagnosticResult(s){const d=s.diagnostic;if(!d?.finished)return [];return d.questionIds.map((id,i)=>{const q=questionMap.get(id),answer=d.answers[i];return {subject:q.subject,questionId:id,skipped:answer===null,correct:answer===q.correct};});}
 function minutes(s){if(s.preferences?.minutes)return s.preferences.minutes;const age=s.profile?.age||13;return age<=10?5:age<=14?10:15;}
 return {validDate,canonical,invalidate,preferences,setPreferences,repeatPlan,sessionSummary,blank,load,profileInput,subjects,eligible,model,predict,recommend,select,makePlan,observe,startDiagnostic,diagnosticAnswer,diagnosticResult,minutes,band,levels,unit,unitsFor,unitStats,learningPath,reviewInfo,question:id=>questionMap.get(id),subject:id=>subjectMap.get(id)};
});
