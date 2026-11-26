import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createPedagogyDB, seedPedagogy, asUser, uuid} from './pedagogy-db.test.mjs';

const sql = file => readFileSync(new URL('../supabase/'+file,import.meta.url),'utf8');
const db=await createPedagogyDB();
try {
 const ids=await seedPedagogy(db);
 await db.exec(sql('social.sql'));
 await db.exec(sql('migrations/20261126161316_mission_rewards.sql'));
 await db.query('insert into public.edu_workspace_owners(user_id) values($1)',[ids.admin]);
 const call=(user,mode,operation,body={})=>asUser(db,user,async()=>{
  const rows=(await db.query('select public.mission_rewards_action($1,$2,$3) result',[mode,operation,JSON.stringify(body)])).rows;
  return rows[0].result;
 });
 const student=(op,b)=>call(ids.student,'real',op,b);
 const owner=(op,b)=>call(ids.admin,'real',op,b);
 const demo=(op,b)=>call(ids.student,'demo',op,b);
 const complete=(action,code,answers)=>action('complete',{code,answers});
 const reason='Validação institucional de teste.';
 const adjusts=(user_id,delta,key=uuid(999))=>({user_id,delta,request_key:key,reason});
 const redeem=(code,cost,n)=>({code,cost,request_key:uuid(n)});

 assert.equal((await student('state')).balance,0);
 assert.equal((await student('state')).catalog.length,0);
 assert.equal((await demo('state')).catalog.length,3);
 assert.equal((await owner('state')).canAdmin,true);
 assert.equal((await call(ids.admin2,'real','state')).canAdmin,false);
 for(const user of [null,ids.student,ids.admin2,ids.teacher]){
  await assert.rejects(()=>call(user,'real','admin_adjust',adjusts(ids.student,100)),error=>error.code==='42501');
 }
 await assert.rejects(()=>call(null,'real','state'),error=>error.code==='42501');
 await asUser(db,ids.student,async()=>{
  await assert.rejects(()=>db.query("update mission_rewards.wallets set balance=9999"),error=>error.code==='42501');
  await assert.rejects(()=>db.query("insert into mission_rewards.transactions(mode,user_id,kind,ref,description,delta) values('real',auth.uid(),'earn','forged','forged',99)"),error=>error.code==='42501');
  await assert.rejects(()=>db.query("select mission_rewards.post('real',auth.uid(),'adjust','forged','forged',99)"),error=>error.code==='42501');
  await assert.rejects(()=>db.query("select * from mission_rewards.catalog"),error=>error.code==='42501');
 });

 const activity='atividade-fracoes';
 const recovery='recuperacao-leitura';
 assert.ok((await student('challenge',{code:activity})).questions.every(q=>q.answer===undefined));
 assert.deepEqual(await complete(student,activity,[0,2]),{review:[0]});
 assert.equal((await student('balance')).balance,0);
 await student('set_goal',{target:3});
 await assert.rejects(()=>student('claim_goal'),/Conclua a meta/);
 assert.deepEqual(await complete(student,activity,[1,2]),{earned:20});
 assert.deepEqual(await complete(student,activity,[1,2]),{earned:0,duplicate:true});
 assert.equal((await complete(student,recovery,[2,0])).earned,40);
 assert.equal((await complete(student,'missao-planejamento',[1,2])).earned,50);
 assert.equal((await student('claim_goal')).earned,50);
 assert.equal((await student('claim_goal')).earned,0);
 assert.equal((await student('state')).total,160);
 assert.equal((await demo('state')).balance,0);
 assert.equal((await demo('state')).goal,null);

 const schoolProject={code:'projeto-escolar',kind:'project',title:'Projeto de leitura',
  instructions:'Participação validada pela escola.',school_id:ids.school,active:true};
 await owner('admin_campaign',schoolProject);
 await assert.rejects(()=>student('complete',{code:schoolProject.code,answers:[]}),/Missão indisponível/);
 await assert.rejects(()=>owner('admin_verify',{code:schoolProject.code,user_id:ids.other,reason}),/Missão indisponível/);
 assert.equal((await owner('admin_verify',{code:schoolProject.code,user_id:ids.student,reason})).earned,30);
 assert.equal((await owner('admin_verify',{code:schoolProject.code,user_id:ids.student,reason})).duplicate,true);
 await owner('admin_rule',{code:'activity',points:25,daily_limit:1,active:true});
 assert.equal((await complete(student,'atividade-ciencias',[1,1])).earned,0);
 await owner('admin_rule',{code:'activity',points:25,daily_limit:3,active:true});
 assert.equal((await complete(student,'atividade-ciencias',[1,1])).duplicate,true);
 await db.query("insert into public.social_profiles(id,nickname) values($1,'Aluno fixture')",[ids.student]);
 await db.query(`insert into public.social_sessions(id,user_id,week,day,questions,cursor) values($1,$2,date_trunc('week',now())::date,(now() at time zone 'America/Sao_Paulo')::date,'[]',3),($3,$2,date_trunc('week',now())::date,(now() at time zone 'America/Sao_Paulo')::date,'[]',3)`,[uuid(80),ids.student,uuid(81)]);
 assert.equal((await student('state')).verifiedStudies.length,1);
 await assert.rejects(()=>demo('claim_verified',{id:uuid(80)}),error=>error.code==='42501');
 await assert.rejects(()=>call(ids.other,'real','claim_verified',{id:uuid(80)}),error=>error.code==='42501');
 assert.equal((await student('claim_verified',{id:uuid(80)})).earned,25);
 assert.equal((await student('claim_verified',{id:uuid(81)})).earned,0);

 const item={code:'kit-local',title:'Kit local',description:'Materiais escolares de teste.',category:'retention',image:'school',
  cost:80,stock:1,partner_code:'parceiro-local',conditions:'Retirada na secretaria da escola.',confirmation:'Disponibilidade confirmada na fixture.',supplemental:true,active:true};
 await assert.rejects(()=>owner('admin_item',item),/confirme um parceiro/);
 await owner('admin_partner',{code:'parceiro-local',name:'Instituição de teste',summary:'Parceria local para testar a entrega.',confirmed:true,active:true});
 await assert.rejects(()=>owner('admin_item',{...item,confirmation:''}),error=>error.code==='23514');
 await assert.rejects(()=>owner('admin_item',{...item,supplemental:false}),/benefício complementar/);
 await owner('admin_item',item);
 await assert.rejects(()=>call(ids.other,'real','redeem',redeem(item.code,80,90)),/Saldo.*insuficiente/);
 assert.equal((await owner('admin_state')).stockInconsistencies,0);
 assert.equal((await student('state')).catalog[0].available,1);
 await assert.rejects(()=>student('redeem',redeem(item.code,1,91)),/custo mudou/);
 const request=await student('redeem',redeem(item.code,80,92));
 assert.deepEqual(await student('redeem',redeem(item.code,80,92)),request);
 assert.equal((await student('balance')).balance,135);
 await assert.rejects(()=>student('redeem',redeem(item.code,80,94)),/sem disponibilidade/);
 await assert.rejects(()=>call(ids.other,'real','cancel',{id:request.id}),error=>error.code==='42501');
 await assert.rejects(()=>demo('cancel',{id:request.id}),error=>error.code==='42501');
 await assert.rejects(()=>student('demo_advance',{id:request.id}),error=>error.code==='42501');
 await student('cancel',{id:request.id});
 await student('cancel',{id:request.id});
 assert.equal((await student('balance')).balance,215);
 assert.equal((await student('state')).history.filter(t=>t.kind==='refund').length,1);

 const second=await student('redeem',redeem(item.code,80,95));
 await assert.rejects(()=>owner('admin_status',{id:second.id,status:'delivered',reason}),/mudança de status/);
 for(const status of ['pending','approved','preparing','delivered'])await owner('admin_status',{id:second.id,status,reason});
 await owner('admin_status',{id:second.id,status:'delivered',reason});
 await assert.rejects(()=>student('cancel',{id:second.id}),/mudança de status/);
 assert.equal((await student('state')).history.filter(t=>t.kind==='deliver').length,1);
 assert.deepEqual((await call(ids.other,'real','state')).redemptions,[]);
 await assert.rejects(()=>owner('admin_adjust',{...adjusts(ids.student,1),reason:''}),/justificativa/);
 await assert.rejects(()=>owner('admin_adjust',adjusts(ids.student,-1000)),/insuficiente/);
 await owner('admin_adjust',adjusts(ids.student,5));
 await owner('admin_adjust',adjusts(ids.student,5));
 assert.equal((await student('balance')).balance,140);

 await complete(demo,activity,[1,2]);
 const simulated=await demo('redeem',redeem('emblema-ilustrativo',20,92));
 let expected_status='requested';
 for(const status of ['pending','approved','preparing','delivered']){
  const body={id:simulated.id,expected_status};
  assert.equal((await demo('demo_advance',body)).status,status);
  assert.equal((await demo('demo_advance',body)).status,status);
  expected_status=status;
 }
 assert.equal((await student('balance')).balance,140);
 assert.equal((await demo('balance')).balance,0);
 assert.equal((await demo('state')).redemptions.length,1);
 const admin=await owner('admin_state');
 assert.ok(admin.audit.some(entry=>entry.action==='admin_adjust'&&entry.details.reason===reason));
 assert.equal(admin.walletInconsistencies,0);
 assert.equal(admin.stockInconsistencies,0);

 const session=uuid(102);
 await db.query('insert into auth.sessions(id,user_id) values($1,$2)',[session,ids.student]);
 await db.query("select set_config('request.jwt.claims',$1,false)",[JSON.stringify({session_id:session})]);
 assert.equal((await student('balance')).balance,140);
 await db.query('delete from auth.sessions where id=$1',[session]);
 await assert.rejects(()=>student('balance'),error=>error.code==='42501');
 console.log('PASS Mission Rewards SQL: verified activity and personalized goal, duplicates, rules and school projects, reserve/stock/status/refund/delivery, ownership, admin audit, demo isolation, revoked session.');
}finally{await db.close();}
