const {chromium}=require('/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const http=require('http'),fs=require('fs'),path=require('path'),assert=require('assert/strict');
const root=path.resolve(__dirname,'../..'),out=process.env.STUDY_AUDIT_OUTPUT_DIR||__dirname;
(async()=>{
const server=http.createServer((req,res)=>{const name=req.url.split('?')[0];const file=path.resolve(root,'.'+(name==='/'?'/index.html':name));if(!file.startsWith(root+'/')){res.writeHead(403);res.end();return;}try{res.setHeader('Content-Type',/\.(mjs|js)$/.test(file)?'text/javascript':file.endsWith('.css')?'text/css':'text/html');res.end(fs.readFileSync(file));}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(8125,'127.0.0.1',r));let browser;
const results={checks:[],performance:[],errors:[]};
try{
browser=await chromium.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox']});const page=await browser.newPage({viewport:{width:1280,height:900}});
page.setDefaultTimeout(7000);page.on('pageerror',e=>results.errors.push(e.message));await page.route('https://**/*',r=>r.abort());
const dismiss=async()=>{if(await page.locator('dialog[open] .close-dialog').count())await page.locator('dialog[open] .close-dialog').first().click();};
const check=async(name,fn)=>{try{results.checks.push({name,passed:true,detail:await (async()=>{await dismiss();return fn();})()});console.log('PASS',name);}catch(e){results.checks.push({name,passed:false,error:e.message});console.log('FAIL',name,e.message.slice(0,400));}};
await page.goto('http://127.0.0.1:8125/');await page.waitForFunction(()=>typeof Adaptive!=='undefined');
await check('Criar perfil pela interface e restaurar após recarregar',async()=>{
 await page.evaluate(()=>navigate('perfil'));await page.locator('#student-name').fill('Aluno Auditoria');await page.locator('#student-age').fill('13');await page.locator('#student-grade').selectOption('7');await page.locator('[name="difficulty"][value="matematica"]').check();await page.locator('#profile-form button[type="submit"]').click();
 await page.reload();assert.equal(await page.evaluate(()=>learner.profile.grade),7);return await page.evaluate(()=>learner.profile);
});
await check('Diagnóstico completo com uma pergunta pulada',async()=>{
 await page.evaluate(()=>{navigate('perfil');beginDiagnostic();});
 const count=await page.evaluate(()=>learner.diagnostic.questionIds.length);
 for(let i=0;i<count;i++){
  if(i===0)await page.locator('#skip-diagnostic-question').click();
  else{const correct=await page.evaluate(()=>A.question(learner.diagnostic.questionIds[learner.diagnostic.answers.length]).correct);await page.locator(`[data-diagnostic-answer="${correct}"]`).click();await page.locator('#next-diagnostic').click();}
 }
 const data=await page.evaluate(()=>({finished:learner.diagnostic.finished,observations:learner.observations.length,results:A.diagnosticResult(learner)}));assert.ok(data.finished);assert.equal(data.observations,count-1);return {questions:count,observations:data.observations};
});
await check('Caminho dirigido: início, exemplo, três práticas e conclusão',async()=>{
 await page.evaluate(()=>startPersonalized('matematica'));await page.locator('#start-plan').click();await page.locator('[data-plan-review]').click();await page.locator('#complete-summary').click();await dismiss();
 const ids=await page.evaluate(()=>[...learner.plan.questionIds]);
 for(const id of ids){await page.evaluate(()=>selectTool('recuperacao'));await page.locator(`[data-plan-question="${id}"]`).click();const correct=await page.evaluate(()=>state.currentQuestion.correct);await page.locator(`[data-answer-index="${correct}"]`).click();await dismiss();}
 await page.evaluate(()=>{renderPlan();selectTool('recuperacao');});await page.locator('#finish-plan').click();await dismiss();assert.equal(await page.evaluate(()=>learner.plan.finished),true);return {practices:ids.length};
});
await check('Erro seguido de acerto não vira acerto independente no histórico',async()=>{
 await page.evaluate(()=>{openLearning('exercicios','portugues');state.currentQuestion=A.select(learner,'portugues',today,{exclude:learner.observations.filter(o=>o.date===today).map(o=>o.questionId)});renderQuestion();});
 const q=await page.evaluate(()=>({id:state.currentQuestion.id,correct:state.currentQuestion.correct}));await page.locator(`[data-answer-index="${(q.correct+1)%4}"]`).click();await page.locator(`[data-answer-index="${q.correct}"]`).click();
 const o=await page.evaluate(id=>learner.observations.find(o=>o.questionId===id&&o.date===today),q.id);assert.equal(o.correct,false);return o;
});
await check('Dica é registrada como ajuda',async()=>{
 await page.evaluate(()=>{openLearning('exercicios','ciencias');state.currentQuestion=A.select(learner,'ciencias',today,{exclude:learner.observations.filter(o=>o.date===today).map(o=>o.questionId)});renderQuestion();});await page.locator('#next-hint').click();const q=await page.evaluate(()=>({id:state.currentQuestion.id,correct:state.currentQuestion.correct}));await page.locator(`[data-answer-index="${q.correct}"]`).click();assert.equal(await page.evaluate(id=>learner.observations.find(o=>o.questionId===id&&o.date===today).helped,q.id),true);
});
results.samePlan=await page.evaluate(()=>{learner=A.blank();learner.profile=A.profileInput({name:'Teste',age:13,grade:7});startPersonalized('matematica');const a=JSON.stringify(learner.plan);document.querySelector('#rebuild-plan').click();return a===JSON.stringify(learner.plan);});
await check('Preferências opcionais ajustam duração e tema sem exigir cadastro extra',async()=>{
 await page.evaluate(()=>navigate('aprendizagem'));await page.locator('#study-settings summary').click();await page.locator('#study-settings [name="minutes"]').selectOption('5');await page.locator('#study-settings [name="topic"]').fill('razões');await page.getByRole('button',{name:'Aplicar preferências',exact:true}).click();
 await page.locator('#rebuild-plan').click();assert.equal(await page.evaluate(()=>learner.preferences.minutes),5);assert.equal(await page.evaluate(()=>learner.plan.questionIds.length),1);assert.match(await page.locator('.personal-time').textContent(),/1 prática/);
});
await check('Novo caminho varia e repetir mantém a sequência sem apagar histórico',async()=>{
 const before=await page.evaluate(()=>[...learner.plan.questionIds]);await page.locator('#rebuild-plan').click();assert.notEqual((await page.evaluate(()=>learner.plan.questionIds)).join(','),before.join(','));
 const ids=await page.evaluate(()=>[learner.plan.exampleId,...learner.plan.questionIds]);page.once('dialog',d=>d.accept());await page.locator('#repeat-study').click();assert.equal((await page.evaluate(()=>[learner.plan.exampleId,...learner.plan.questionIds])).join(','),ids.join(','));
});
await check('Pré-requisito pode ser checado e unidade desejada continua acessível',async()=>{
 await page.evaluate(()=>{learner=A.blank();learner.profile=A.profileInput({name:'Teste',age:14,grade:8});for(let i=0;i<3;i++)A.observe(learner,A.question('learn-m-razoes-'+(i+1)),false,'2026-10-'+(27+i));state.subject='matematica';learner.plan=A.makePlan(learner,'matematica',today,'auto','m-equacoes');renderPersonalization();renderPlan();selectTool('recuperacao');});
 assert.match(await page.locator('.study-plan-context').textContent(),/Razões/);await page.locator('.study-plan-context summary').click();await page.locator('[data-study-base="m-razoes"]').click();assert.equal(await page.evaluate(()=>learner.plan.unitId),'m-razoes');
 await page.evaluate(()=>{learner.plan=A.makePlan(learner,'matematica',today,'auto','m-equacoes');renderPlan();});assert.equal(await page.evaluate(()=>learner.plan.unitId),'m-equacoes');
});
await check('Confiança, dica gradual e feedback específico funcionam sem duplicar evidência',async()=>{
 await page.evaluate(()=>{openLearning('exercicios','matematica');state.currentQuestion=A.question('study-v2-m-razoes-15');renderQuestion();});
 await page.locator('#study-confidence select').selectOption('unsure');await page.locator('#next-hint').click();const hint=await page.locator('#practice-hint').textContent();assert.match(hint,/Pista conceitual/);assert.ok(!hint.includes('R$ 170'));
 const q=await page.evaluate(()=>({id:state.currentQuestion.id,correct:state.currentQuestion.correct}));await page.locator(`[data-answer-index="${(q.correct+1)%4}"]`).click();assert.match(await page.locator('#exercise-result').textContent(),/Vamos revisar/);
 const observation=await page.evaluate(id=>learner.observations.find(o=>o.questionId===id),q.id);assert.equal(observation.helped,true);assert.equal(observation.confidence,'unsure');assert.equal(observation.correct,false);
});
await check('Falha de armazenamento mantém memória e permite recuperação',async()=>{
 const result=await page.evaluate(()=>{const original=Storage.prototype.setItem;const before=learner.observations.length;Storage.prototype.setItem=function(k,v){if(k===PERSONAL_KEY)throw new DOMException('Quota','QuotaExceededError');return original.call(this,k,v);};try{A.observe(learner,A.question('study-v2-m-razoes-16'),true,'2026-10-29');saveLearner();return {retained:learner.observations.length===before+1,message:document.querySelector('#study-storage-status').textContent};}finally{Storage.prototype.setItem=original;}});assert.ok(result.retained);assert.match(result.message,/Não foi possível salvar/);await page.evaluate(()=>saveLearner());assert.equal(await page.locator('#study-storage-status').textContent(),'');
});
await check('Editar ano escolar reinicia plano e diagnóstico sem apagar respostas',async()=>{
 const count=await page.evaluate(()=>learner.observations.length);await page.evaluate(()=>{navigate('perfil');fillProfile();});await page.locator('#student-grade').selectOption('10');await page.locator('#student-age').fill('16');await page.locator('#profile-form button[type="submit"]').click();assert.equal(await page.evaluate(()=>learner.profile.grade),10);assert.equal(await page.evaluate(()=>learner.plan),null);assert.equal(await page.evaluate(()=>learner.observations.length),count);
});
await check('Preferências e evidências continuam após recarregar',async()=>{
 await page.evaluate(()=>{A.setPreferences(learner,{minutes:10,topic:'funções'});saveLearner();});const before=await page.evaluate(()=>learner.observations.length);await page.reload();assert.equal(await page.evaluate(()=>learner.observations.length),before);assert.equal(await page.evaluate(()=>learner.preferences.minutes),10);
});
await check('Migração preserva uma cópia v1 anterior e mantém o histórico',async()=>{
 const migration=await page.evaluate(()=>{const old={version:1,profile:{name:'Anterior',age:13,grade:7,difficulties:[]},observations:[],diagnostic:null,plan:null,introDismissed:false};localStorage.removeItem('missao-escola-personal-before-v2');localStorage.setItem(PERSONAL_KEY,JSON.stringify(old));learner=A.load(old);saveLearner();return {before:JSON.parse(localStorage.getItem('missao-escola-personal-before-v2')),after:JSON.parse(localStorage.getItem(PERSONAL_KEY))};});assert.equal(migration.before.version,1);assert.equal(migration.before.profile.name,'Anterior');assert.equal(migration.after.version,2);
});
await check('Preferências acessíveis pelo teclado e exportação de cópia funciona',async()=>{
 await page.evaluate(()=>navigate('aprendizagem'));const summary=page.locator('#study-settings summary');await summary.focus();const wasOpen=await page.locator('#study-settings details').getAttribute('open');await page.keyboard.press('Enter');assert.notEqual(await page.locator('#study-settings details').getAttribute('open'),wasOpen);
 const download=page.waitForEvent('download');await page.locator('#export-study-data').click();assert.equal((await download).suggestedFilename(),'missao-escola-estudos.json');
});
for(const width of [1280,390,320]){
 await page.setViewportSize({width,height:900});
 for(const section of ['perfil','aprendizagem','diagnostico']){
  await page.evaluate(section=>{if(section==='diagnostico'){A.startDiagnostic(learner,today);renderDiagnostic();}navigate(section);},section);
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);results.checks.push({name:`Layout ${section} ${width}px sem transbordamento horizontal`,passed:!overflow});
 }
}
await page.setViewportSize({width:390,height:900});await page.evaluate(()=>{startPersonalized('matematica');document.querySelector('#plan-result').scrollIntoView();});await page.screenshot({path:out+'/study-mobile.png'});
const cdp=await page.context().newCDPSession(page);
for(const slowdown of [1,4]){
 await cdp.send('Emulation.setCPUThrottlingRate',{rate:slowdown});
 for(const count of [0,500,2000,5000]){
 const values=await page.evaluate(({count})=>{
  learner=A.blank();learner.profile=A.profileInput({name:'Carga sintética',age:16,grade:10});
  learner.observations=Array.from({length:count},(_,i)=>({questionId:C.questions[i%C.questions.length].id,date:new Date(Date.UTC(2024,0,1+Math.floor(i/C.questions.length))).toISOString().slice(0,10),correct:i%4!==0,helped:false,grade:10,source:'practice'}));
  state.subject='matematica';navigate('aprendizagem');
  const operations={renderPersonalization:()=>renderPersonalization(),renderPlan:()=>{learner.plan=A.makePlan(learner,'matematica',today);renderPlan();},renderQuestion:()=>{state.currentQuestion=A.select(learner,'matematica',today);renderQuestion();},saveLearner:()=>saveLearner()};
  const output=[];
  for(const [op,fn]of Object.entries(operations)){fn();const times=[];for(let i=0;i<10;i++){const t=performance.now();fn();times.push(performance.now()-t);}times.sort((a,b)=>a-b);output.push({op,medianMs:+times[5].toFixed(2),maxMs:+times[9].toFixed(2)});}
  return output;
 },{count});results.performance.push({slowdown,count,operations:values});
 }
}
console.log(JSON.stringify(results,null,2));
}finally{fs.writeFileSync(out+'/browser-results.json',JSON.stringify(results,null,2));if(browser)await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
