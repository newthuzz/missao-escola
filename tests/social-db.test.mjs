import {PGlite} from '@electric-sql/pglite';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const db=new PGlite();
await db.exec(`create schema auth; create table auth.users(id uuid primary key); create role anon; create role authenticated; create role service_role;`);
await db.exec(fs.readFileSync(new URL('../supabase/social.sql', import.meta.url),'utf8'));
const a='00000000-0000-4000-8000-000000000001',b='00000000-0000-4000-8000-000000000002',c='00000000-0000-4000-8000-000000000003';
await db.query('insert into auth.users values ($1),($2),($3)',[a,b,c]);
const api=async(user,op,body={})=>(await db.query('select public.social_action($1,$2,$3) as result',[user,op,JSON.stringify(body)])).rows[0].result;
assert.equal((await api(a,'state')).registered,false);
await api(a,'register',{nickname:'Explorador A'});const bs=await api(b,'register',{nickname:'Explorador B'});await api(c,'register',{nickname:'Explorador C'});
await api(a,'invite',{code:bs.me.code});assert.equal((await api(b,'state')).incoming.length,1);
await assert.rejects(()=>api(c,'accept',{target:a}));
await api(b,'accept',{target:a});assert.equal((await api(a,'state')).friends[0].id,b);
await api(a,'join');await api(b,'join');
assert.equal((await api(a,'state')).league.board.length,2);
const qs=Array.from({length:3},()=>({question:'1 + 1?',answers:['1','2','3','4'],correct:1,explanation:'1 + 1 = 2'}));
const started=await api(a,'start',{questions:qs});
assert.equal(started.active.question.correct,undefined);assert.equal(started.active.question.explanation,undefined);
const sid=started.active.id;
await assert.rejects(()=>api(b,'answer',{session:sid,cursor:0,answer:1}));
await assert.rejects(()=>api(a,'answer',{session:sid,cursor:2,answer:1}));
const first=await api(a,'answer',{session:sid,cursor:0,answer:1});assert.equal(first.points,10);
assert.deepEqual(await api(a,'answer',{session:sid,cursor:0,answer:0}),first);
assert.equal((await api(a,'state')).league.board[0].points,10);
await api(a,'answer',{session:sid,cursor:1,answer:1});assert.equal((await api(a,'answer',{session:sid,cursor:2,answer:1})).points,25);
assert.equal((await api(a,'state')).league.board[0].points,45);
await api(b,'block',{target:a});assert.equal((await api(a,'state')).friends.length,0);
await assert.rejects(()=>api(a,'invite',{code:bs.me.code}));
const allowed=await db.query("select has_function_privilege('authenticated','public.social_action(uuid,text,jsonb)','execute') as allowed");assert.equal(allowed.rows[0].allowed,false);
await db.exec('set role authenticated');await assert.rejects(()=>db.query('select * from public.social_sessions'));await db.exec('reset role');
// Ten sessions, only 20 correct-answer awards and three session bonuses.
for(let i=1;i<10;i++){
 const s=(await api(a,'start',{questions:qs})).active;
 for(let cursor=0;cursor<3;cursor++)await api(a,'answer',{session:s.id,cursor,answer:1});
}
await assert.rejects(()=>api(a,'start',{questions:qs}));
assert.equal((await api(a,'state')).league.board.find(p=>p.id===a).points,245);
// Expired sessions cannot be answered; no mutation of another player's session.
await api(c,'join');const exp=(await api(c,'start',{questions:qs})).active;
await db.query("update public.social_sessions set created_at=now()-interval '31 minutes' where id=$1",[exp.id]);
await assert.rejects(()=>api(c,'answer',{session:exp.id,cursor:0,answer:1}));
// Group capacity is capped at ten.
for(let i=4;i<=12;i++) {
 const id='00000000-0000-4000-8000-'+String(i).padStart(12,'0');
 await db.query('insert into auth.users values($1)',[id]);await api(id,'register',{nickname:'Pessoa '+i});await api(id,'join');
}
const capacity=await db.query('select max(n)::int as maximum from (select count(*) n from public.social_members group by league_id) counts');
assert.equal(capacity.rows[0].maximum,10);
// Prior-week winners promote once on the next participation.
const promoted='00000000-0000-4000-8000-000000000020';
const peers=[promoted,...[21,22,23].map(i=>'00000000-0000-4000-8000-'+String(i).padStart(12,'0'))];
for(const id of peers){await db.query('insert into auth.users values($1)',[id]);await api(id,'register',{nickname:'Anterior '+id.slice(-2)});}
const old=(await db.query("insert into public.social_leagues(week,tier) values(date_trunc('week',now() at time zone 'America/Sao_Paulo')::date-7,0) returning *")).rows[0];
for(let i=0;i<peers.length;i++)await db.query('insert into public.social_members(user_id,week,league_id,points) values($1,$2,$3,$4)',[peers[i],old.week,old.id,40-i*10]);
assert.equal((await api(promoted,'join')).league.tier,1);
assert.equal((await api(promoted,'join')).league.tier,1);
await db.exec(fs.readFileSync(new URL('../supabase/social.sql', import.meta.url),'utf8'));
console.log('SQL OK: repeatable migration, friendship authorization, blocking, sanitized questions, ownership, replay protection, daily limits and browser privilege restrictions.');
await db.close();
