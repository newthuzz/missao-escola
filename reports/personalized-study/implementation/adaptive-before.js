/* Modelo local do aluno: estima habilidade com atualizações logísticas online.
 * Não é um modelo de linguagem. Sugestões pedagógicas são estimativas, não notas.
 */
(function(root,factory){const api=factory(typeof module==='object'&&module.exports?require('./curriculum.js'):root.Curriculum);if(typeof module==='object'&&module.exports)module.exports=api;else root.Adaptive=api;})(typeof globalThis!=='undefined'?globalThis:this,function(C){
 'use strict';
 const questionMap=new Map(C.questions.map(q=>[q.id,q])), subjectMap=new Map(C.subjects.map(s=>[s.id,s]));
 const levels=['facil','medio','dificil'], difficulty={facil:-1.3,medio:0,dificil:1.25};
 const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
 const validDate=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&!Number.isNaN(Date.parse(s+'T12:00:00'));
 const band=grade=>grade<=5?'f1':grade<=9?'f2':'em';
 function blank(){return {version:1,profile:null,observations:[],diagnostic:null,plan:null,introDismissed:false};}
 function profileInput(input){
  const name=typeof input?.name==='string'?input.name.trim().replace(/\s+/g,' ').slice(0,60):'';
  const age=Number(input?.age),grade=Number(input?.grade);
  if(!name||!Number.isInteger(age)||age<5||age>100||!Number.isInteger(grade)||grade<1||grade>12)return null;
  const difficulties=Array.isArray(input.difficulties)?[...new Set(input.difficulties.filter(id=>subjectMap.has(id)&&subjectMap.get(id).minGrade<=grade))]:[];
  return {name,age,grade,difficulties};
 }
 function load(raw){
  const s=blank();if(!raw||raw.version!==1)return s;
  s.profile=profileInput(raw.profile);s.introDismissed=Boolean(raw.introDismissed);
  const seen=new Set();
  if(Array.isArray(raw.observations))s.observations=raw.observations.filter(o=>o&&questionMap.has(o.questionId)&&validDate(o.date)&&typeof o.correct==='boolean'&&Number.isInteger(o.grade)&&o.grade>=1&&o.grade<=12&&!seen.has(o.date+':'+o.questionId)&&(seen.add(o.date+':'+o.questionId),true)).slice(-5000).map(o=>({questionId:o.questionId,date:o.date,correct:o.correct,helped:!!o.helped,grade:o.grade,source:['diagnostic','online'].includes(o.source)?o.source:'practice'}));
  const d=raw.diagnostic;
  if(d&&validDate(d.date)&&Number.isInteger(d.grade)&&d.grade>=1&&d.grade<=12&&Array.isArray(d.questionIds)&&d.questionIds.length<=12&&d.questionIds.length>0&&d.questionIds.every(id=>questionMap.has(id))&&new Set(d.questionIds).size===d.questionIds.length&&Array.isArray(d.answers)){
   const answers=[];
   for(let i=0;i<Math.min(d.answers.length,d.questionIds.length);i++){const a=d.answers[i],q=questionMap.get(d.questionIds[i]);if(a===null||Number.isInteger(a)&&a>=0&&a<q.answers.length)answers.push(a);else break;}
   s.diagnostic={date:d.date,grade:d.grade,questionIds:[...d.questionIds],answers,finished:answers.length===d.questionIds.length};
  }
  const p=raw.plan;
  if(p&&validDate(p.date)&&subjectMap.has(p.subject)&&questionMap.get(p.exampleId)?.subject===p.subject&&Array.isArray(p.questionIds)&&p.questionIds.length>0&&p.questionIds.length<=3&&p.questionIds.every(id=>questionMap.get(id)?.subject===p.subject)&&levels.includes(p.level))s.plan={date:p.date,subject:p.subject,level:p.level,exampleId:p.exampleId,questionIds:[...new Set(p.questionIds)],started:!!p.started,reviewed:!!p.reviewed,answeredIds:Array.isArray(p.answeredIds)?[...new Set(p.answeredIds.filter(id=>p.questionIds.includes(id)))]:[],finished:!!p.finished,...(p.explicitFoundation?{explicitFoundation:true}:{})};
  if(s.plan&&!s.plan.explicitFoundation&&s.profile&&questionMap.get(s.plan.exampleId)?.band!==band(s.profile.grade))s.plan=null;
  return s;
 }
 function subjects(s){const grade=s.profile?.grade||7;return C.subjects.filter(c=>c.minGrade<=grade);}
 function eligible(s,subject,level=null,{unitId=null,includeEarlier=false}={}){const grade=s.profile?.grade||7;return C.questions.filter(q=>q.subject===subject&&q.minGrade<=grade&&(includeEarlier||q.band===band(grade))&&(!unitId||q.unitId===unitId)&&(!level||q.level===level));}
 function observe(s,q,correct,date,{helped=false,source='practice'}={}){
  if(!questionMap.has(q.id)||!validDate(date)||typeof correct!=='boolean'||s.observations.some(o=>o.date===date&&o.questionId===q.id))return false;
  s.observations.push({questionId:q.id,date,correct,helped:!!helped,source:['diagnostic','online'].includes(source)?source:'practice',grade:s.profile?.grade||7});return true;
 }
 function model(s,subject){
  const chosen=s.profile?.difficulties.includes(subject),m={ability:chosen?-.65:-.2,skills:{},count:0,correct:0,independent:0,recent:[],chosen};
  for(const observation of s.observations){
   const q=questionMap.get(observation.questionId);if(q?.subject!==subject)continue;
   const skill=m.skills[q.skill]||{offset:0,count:0,correct:0};
   const b=difficulty[q.level],prediction=1/(1+Math.exp(-(m.ability+skill.offset*.45-b)));
   const weight=(observation.helped?.35:1)*(q.band===band(s.profile?.grade||7)?1:.2),rate=.62/Math.sqrt(1+m.count/25),error=(Number(observation.correct)-prediction)*weight;
   m.ability=clamp(m.ability+rate*error,-2.8,3);skill.offset=clamp(skill.offset+.35*error,-1.4,1.4);skill.count++;skill.correct+=Number(observation.correct);m.skills[q.skill]=skill;
   m.count++;m.correct+=Number(observation.correct);if(!observation.helped&&q.band===band(s.profile?.grade||7))m.independent++;m.recent.push(observation);
  }
  m.recent=m.recent.slice(-5);m.accuracy=m.count?m.correct/m.count:null;
  m.level=m.independent>=8&&m.ability>=.9?'dificil':m.independent>=3&&m.ability>=-.05?'medio':'facil';
  return m;
 }
 function predict(m,q,grade){const b=difficulty[q.level]+(q.band===band(grade)?0:-.6);return 1/(1+Math.exp(-(m.ability+(m.skills[q.skill]?.offset||0)*.45-b)));}
 function recommend(s,today){
  return subjects(s).map(subject=>{
   const m=model(s,subject.id),recent=m.recent.filter(o=>o.date===today),weak=m.count?1-m.accuracy:.5;
   let priority=(m.chosen?.9:0)+weak*.9+.45/(m.count+1)-recent.length*.09;
   const reason=m.chosen?(m.count?'Você marcou esta matéria e suas respostas ajudam a ajustar os próximos passos.':'Você escolheu esta matéria como um ponto de atenção.'):m.count?(m.recent.filter(o=>!o.correct).length>=2?'Nas últimas tentativas, alguns conceitos merecem uma revisão com apoio.':'Vamos consolidar o que você já começou a estudar.'):'Ainda estamos conhecendo seu ritmo nesta matéria.';
   return {...subject,model:m,priority,reason};
  }).sort((a,b)=>b.priority-a.priority||C.subjects.findIndex(s=>s.id===a.id)-C.subjects.findIndex(s=>s.id===b.id));
 }
 const unit=id=>(C.units||[]).find(u=>u.id===id);
 function unitsFor(s,subject,{allCycles=false}={}){const grade=s.profile?.grade||7;return(C.units||[]).filter(u=>u.subject===subject&&u.minGrade<=grade&&(allCycles||u.band===band(grade)));}
 const addDays=(date,n)=>{const d=new Date(date+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10);};
 function reviewInfo(s,q,today){const history=s.observations.filter(o=>o.questionId===q.id).sort((a,b)=>a.date.localeCompare(b.date)),last=history.at(-1);if(!last)return{due:null,overdue:false,days:0};let streak=0;for(let i=history.length-1;i>=0;i--){if(!history[i].correct||history[i].helped)break;streak++;}const days=!last.correct||last.helped?1:[1,3,7,14][Math.min(3,streak-1)];const due=addDays(last.date,days);return{due,overdue:due<=today,days,last};}
 function unitStats(s,u,today){const observations=s.observations.filter(o=>questionMap.get(o.questionId)?.unitId===u.id),independent=observations.filter(o=>!o.helped),correct=independent.filter(o=>o.correct),distinct=new Set(independent.map(o=>o.questionId)).size,days=new Set(correct.map(o=>o.date)).size;let weight=0,success=0;for(const o of observations){const w=o.helped?.35:1;weight+=w;if(o.correct)success+=w;}const estimate=(1+success)/(2+weight),mastered=independent.length>=5&&distinct>=4&&days>=2&&correct.length/independent.length>=.8;const due=u.questionIds.map(id=>reviewInfo(s,questionMap.get(id),today)).filter(r=>r.due).sort((a,b)=>a.due.localeCompare(b.due))[0]?.due||null;const recent=observations.slice(-3),struggling=recent.filter(o=>!o.correct).length>=2;return{count:observations.length,independent:independent.length,distinct,estimate,mastered,due,confidence:distinct>=4&&days>=2?'moderada':observations.length>=3?'inicial':'poucos dados',status:!observations.length?'Novo':struggling?'Reforçar':due&&due<=today?'Revisar':mastered?'Consolidado':'Em prática'};}
 function learningPath(s,subject,today){const grade=s.profile?.grade||7;return unitsFor(s,subject).map(u=>{const stats=unitStats(s,u,today),current=grade<=u.maxGrade;const reason=stats.status==='Reforçar'?'Algumas primeiras tentativas indicam que vale rever este conceito.':stats.status==='Revisar'?'Está na hora de recuperar este conteúdo sem consultar a resposta.':stats.mastered?'Pratique em outro contexto para verificar a retenção.':stats.count?'Continue com exemplos e questões diferentes.':current?'Uma unidade da faixa escolar informada, ainda sem evidências de prática.':'Revisão de uma unidade anterior do mesmo ciclo.';return{unit:u,stats,reason,priority:(current?3:0)+(stats.status==='Reforçar'?3:0)+(stats.status==='Revisar'?2.4:0)+(1-stats.estimate)+(stats.count===0?.5:0)-(stats.mastered?1:0)};}).sort((a,b)=>b.priority-a.priority||a.unit.minGrade-b.unit.minGrade||a.unit.id.localeCompare(b.unit.id));}
 function select(s,subject,today,{level='auto',exclude=[],skill=null,unitId=null,includeEarlier=false}={}){
  const m=model(s,subject),grade=s.profile?.grade||7,targetLevel=level==='auto'?m.level:level;
  const options={unitId,includeEarlier};let pool=eligible(s,subject,targetLevel,options).filter(q=>!exclude.includes(q.id));if(!pool.length&&level==='auto')pool=eligible(s,subject,null,options).filter(q=>!exclude.includes(q.id));if(!pool.length)return null;
  if(skill&&pool.some(q=>q.skill===skill))pool=pool.filter(q=>q.skill===skill);
  const seenToday=new Set(s.observations.filter(o=>o.date===today).map(o=>o.questionId));
  const seen=new Map(s.observations.map(o=>[o.questionId,o]));
  const targetUnit=unitId||learningPath(s,subject,today)[0]?.unit.id;
  const scored=pool.map(q=>({q,score:(seenToday.has(q.id)?-12:0)+(seen.has(q.id)?0:1)+(q.legacy?0:3)+(q.unitId===targetUnit?2:0)+(q.maxGrade>=grade?1:0)+(reviewInfo(s,q,today).overdue?2.5:0)-Math.abs(levels.indexOf(q.level)-levels.indexOf(targetLevel))*1.3-Math.abs(predict(m,q,grade)-.7)*2+(seen.get(q.id)?.correct===false?.4:0)})).sort((a,b)=>b.score-a.score||a.q.id.localeCompare(b.q.id));
  return scored[0]?.q||null;
 }
 function makePlan(s,subject,today,level='auto',unitId=null){
  const chosen=unitId||learningPath(s,subject,today)[0]?.unit.id;
  const first=select(s,subject,today,{level,unitId:chosen});if(!first)return null;
  const ids=[];for(let i=0;i<3;i++){const q=select(s,subject,today,{level,unitId:first.unitId||null,exclude:[first.id,...ids]});if(q)ids.push(q.id);}
  if(!ids.length)return null;
  return {date:today,subject,level:first.level,exampleId:first.id,questionIds:ids,started:false,reviewed:false,answeredIds:[],finished:false};
 }
 function startDiagnostic(s,today){
  if(!s.profile)return null;
  if(s.diagnostic&&s.diagnostic.date===today&&s.diagnostic.grade===s.profile.grade)return s.diagnostic;
  const ids=subjects(s).map(subject=>{
   const first=select(s,subject.id,today,{level:'facil'});return first?.id;
  }).filter(Boolean);
  s.diagnostic={date:today,grade:s.profile.grade,questionIds:ids,answers:[],finished:false};return s.diagnostic;
 }
 function diagnosticAnswer(s,index,date){const d=s.diagnostic;if(!d||d.finished)return false;const q=questionMap.get(d.questionIds[d.answers.length]);if(index!==null&&(!Number.isInteger(index)||index<0||index>=q.answers.length))return false;d.answers.push(index);if(index!==null)observe(s,q,index===q.correct,date,{source:'diagnostic'});d.finished=d.answers.length===d.questionIds.length;return true;}
 function diagnosticResult(s){const d=s.diagnostic;if(!d?.finished)return [];return d.questionIds.map((id,i)=>{const q=questionMap.get(id),answer=d.answers[i];return {subject:q.subject,questionId:id,skipped:answer===null,correct:answer===q.correct};});}
 function minutes(s){const age=s.profile?.age||13;return age<=10?5:age<=14?10:15;}
 return {blank,load,profileInput,subjects,eligible,model,predict,recommend,select,makePlan,observe,startDiagnostic,diagnosticAnswer,diagnosticResult,minutes,band,levels,unit,unitsFor,unitStats,learningPath,reviewInfo,question:id=>questionMap.get(id),subject:id=>subjectMap.get(id)};
});
