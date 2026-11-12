import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createPedagogyDB,seedPedagogy,action,asUser,uuid} from './pedagogy-db.test.mjs';
const db=await createPedagogyDB();try{
 const i=await seedPedagogy(db),call=(u,op,b={})=>action(db,u,op,b);
 for(const u of [i.admin,i.admin2,i.teacher,i.student]){assert.equal((await call(u,'context')).canSwitchWorkspace,false);await assert.rejects(()=>call(u,'switch_workspace',{workspace:'admin',canSwitchWorkspace:true,user_id:i.admin}));}
 await db.query('insert into public.edu_workspace_owners(user_id)values($1)',[i.admin]);
 const ctx=await call(i.admin,'context');assert.equal(ctx.role,'admin');assert.equal(ctx.canSwitchWorkspace,true);assert.equal(ctx.assignments.length,0);assert.equal(ctx.memberships.length,0);
 for(const workspace of ['admin','teacher','student'])assert.equal((await call(i.admin,'switch_workspace',{workspace})).workspace,workspace);
 await assert.rejects(()=>call(i.admin,'switch_workspace',{workspace:'superadmin'}));
 for(const u of [i.admin2,i.student,i.teacher]){assert.equal((await call(u,'context')).canSwitchWorkspace,false);await assert.rejects(()=>call(u,'switch_workspace',{workspace:'teacher',user_id:i.admin}));await assert.rejects(()=>call(u,'teacher_metrics'));}
 await assert.rejects(()=>db.query('insert into public.edu_workspace_owners(user_id)values($1)',[i.admin2]));
 await asUser(db,i.student,async()=>{assert.equal((await db.query('select * from public.edu_workspace_owners')).rows.length,0);await assert.rejects(()=>db.query('insert into public.edu_workspace_owners(user_id)values($1)',[i.student]));await assert.rejects(()=>db.query('update public.edu_workspace_owners set user_id=$1',[i.student]));await assert.rejects(()=>db.query('select pedagogy.is_workspace_owner()'));});
 assert.equal((await call(i.admin,'teacher_metrics')).waiting,0);
 // Real authorized teacher behavior survives the facade; owner gets no fabricated assignment.
 const app=await call(i.teacher,'apply',{school_id:i.school,class_ids:[i.class],subject_ids:[i.subject],full_name:'Professor local'});await call(i.admin,'approve',{id:app.id,confirmed:true,assignments:[{class_id:i.class,subject_id:i.subject}]});assert.equal((await call(i.teacher,'context')).role,'teacher');assert.equal((await call(i.teacher,'context')).canSwitchWorkspace,false);assert.equal((await call(i.teacher,'teacher_metrics')).waiting,0);
 const base={class_id:i.class,subject_id:i.subject,title:'Dúvida de atividade local',description:'Preciso compreender como começar a resolução desta atividade.',difficulty:'activity'};
 const req=await call(i.student,'create_request',{...base,client_id:uuid(500)});const reserved=await call(i.student,'create_request',{...base,difficulty:'sensitive',client_id:uuid(501)});
 assert.equal((await call(i.admin,'requests',{workspace:'teacher'})).items.length,1);assert.equal((await call(i.admin,'requests',{workspace:'admin'})).items.length,2);assert.equal((await call(i.admin,'teacher_metrics')).waiting,1);await assert.rejects(()=>call(i.admin,'thread',{id:reserved.id,workspace:'teacher'}));await assert.rejects(()=>call(i.admin2,'thread',{id:req.id,workspace:'teacher'}));
 await call(i.admin,'claim',{id:req.id,workspace:'teacher'});await call(i.admin,'message',{id:req.id,workspace:'teacher',client_id:uuid(502),body:'Vamos organizar a resolução em etapas.'});assert.equal((await call(i.student,'thread',{id:req.id})).messages.at(-1).sender_id,i.admin);
 await db.query("delete from public.user_roles where user_id=$1 and role='admin'",[i.admin]);assert.equal((await call(i.admin,'context')).canSwitchWorkspace,false);await assert.rejects(()=>call(i.admin,'switch_workspace',{workspace:'teacher'}));await assert.rejects(()=>call(i.admin,'teacher_metrics'));await db.query("insert into public.user_roles(user_id,role)values($1,'admin')",[i.admin]);
 await db.query('delete from public.edu_workspace_owners');assert.equal((await call(i.admin,'context')).canSwitchWorkspace,false);await assert.rejects(()=>call(i.admin,'switch_workspace',{workspace:'student'}));
 const bootstrap=fs.readFileSync(new URL('../supabase/bootstrap-owner-workspaces.sql',import.meta.url),'utf8');await assert.rejects(()=>db.exec(bootstrap));await db.exec('rollback');await db.query("delete from public.user_roles where user_id=$1 and role='admin'",[i.admin2]);await db.exec(fs.readFileSync(new URL('../supabase/bootstrap-pitagoras.sql',import.meta.url),'utf8'));await db.exec(bootstrap);await db.exec(bootstrap);assert.equal((await db.query('select count(*)::int n from public.edu_workspace_owners')).rows[0].n,1);assert.equal((await call(i.admin,'context')).canSwitchWorkspace,true);
 console.log('PASS owner workspaces: explicit singleton capability, three authorized modes, other admins/teachers/students denied, spoofing and direct grants denied, scoped teacher work, reserved-case separation, immediate revocation and safe idempotent owner bootstrap.');
}finally{await db.close();}
