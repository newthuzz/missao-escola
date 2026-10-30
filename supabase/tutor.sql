begin;
-- Compatible with the ai_* tables shown in the project's Supabase dashboard.
-- Existing IDs, titles, exercise_id values and message text are preserved.
create table if not exists public.ai_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text,
  created_at timestamptz not null default now()
);
create table if not exists public.ai_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.ai_conversations(id) on delete cascade,
  role text not null check (role in ('user','assistant')),
  content text not null,
  exercise_id text,
  created_at timestamptz not null default now()
);
alter table public.ai_conversations add column if not exists context_key text;
alter table public.ai_conversations add column if not exists context jsonb not null default '{}'::jsonb;
alter table public.ai_conversations add column if not exists summary text not null default '';
alter table public.ai_conversations add column if not exists summary_seq integer not null default 0;
alter table public.ai_conversations add column if not exists next_seq integer not null default 0;
alter table public.ai_conversations add column if not exists updated_at timestamptz not null default now();
alter table public.ai_messages add column if not exists seq integer;
-- Old conversations may contain several exercises: keep them as separate legacy histories.
update public.ai_conversations set context_key='legacy:'||id::text where context_key is null;
update public.ai_conversations set context=jsonb_build_object('title',coalesce(title,'Conversa anterior'),'mode','legacy','exerciseId',null,'version',null)
  where context='{}'::jsonb;
with numbered as (
  select m.id,coalesce((select max(old.seq) from public.ai_messages old where old.conversation_id=m.conversation_id),0)
    +row_number() over(partition by m.conversation_id order by m.created_at,m.id) as position
  from public.ai_messages m where m.seq is null
)
update public.ai_messages m set seq=n.position from numbered n where m.id=n.id;
update public.ai_conversations c set next_seq=greatest(c.next_seq,coalesce((select max(m.seq) from public.ai_messages m where m.conversation_id=c.id),0));
alter table public.ai_conversations alter column context_key set not null;
alter table public.ai_messages alter column seq set not null;
create unique index if not exists ai_conversations_context_unique on public.ai_conversations(user_id,context_key);
create unique index if not exists ai_messages_sequence_unique on public.ai_messages(conversation_id,seq);
-- Ensure account deletion also removes its private chat history.
do $$
declare constraint_name text;
begin
  if not exists(select 1 from pg_constraint where conrelid='public.ai_conversations'::regclass and confrelid='auth.users'::regclass and confdeltype='c') then
    for constraint_name in select conname from pg_constraint where conrelid='public.ai_conversations'::regclass and confrelid='auth.users'::regclass loop
      execute format('alter table public.ai_conversations drop constraint %I',constraint_name);
    end loop;
    alter table public.ai_conversations add constraint ai_conversations_user_id_fkey foreign key(user_id) references auth.users(id) on delete cascade;
  end if;
end $$;
create table if not exists public.ai_requests (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  conversation_id uuid not null references public.ai_conversations(id) on delete cascade,
  message_hash text not null,
  user_seq integer not null,
  status text not null check (status in ('processing','complete','failed')),
  response text,
  started_at timestamptz not null default now()
);
create table if not exists public.ai_usage (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists ai_messages_recent on public.ai_messages(conversation_id,seq desc);
create index if not exists ai_usage_recent on public.ai_usage(user_id,created_at);
create index if not exists ai_usage_global_recent on public.ai_usage(created_at);
create index if not exists ai_conversations_owner on public.ai_conversations(user_id,updated_at desc);
alter table public.ai_conversations enable row level security;
alter table public.ai_messages enable row level security;
alter table public.ai_requests enable row level security;
alter table public.ai_usage enable row level security;
do $$
declare p record;
begin
  for p in select schemaname,tablename,policyname from pg_policies where schemaname='public' and tablename in ('ai_conversations','ai_messages') loop
    execute format('drop policy %I on %I.%I',p.policyname,p.schemaname,p.tablename);
  end loop;
end $$;
revoke all on public.ai_conversations,public.ai_messages,public.ai_requests,public.ai_usage from public,anon,authenticated;
grant select on public.ai_conversations,public.ai_messages to authenticated;
grant all on public.ai_conversations,public.ai_messages,public.ai_requests,public.ai_usage to service_role;
grant usage,select on sequence public.ai_usage_id_seq to service_role;
drop policy if exists ai_own_conversations on public.ai_conversations;
create policy ai_own_conversations on public.ai_conversations for select to authenticated using ((select auth.uid())=user_id);
drop policy if exists ai_own_messages on public.ai_messages;
create policy ai_own_messages on public.ai_messages for select to authenticated using (
  exists(select 1 from public.ai_conversations c where c.id=conversation_id and c.user_id=(select auth.uid()))
);

create or replace function public.tutor_action(p_user uuid,p_op text,p_body jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare c public.ai_conversations; r public.ai_requests; messages jsonb; conversations jsonb; message_text text; current_id uuid;
begin
  if p_user is null then raise exception 'Authentication required'; end if;
  -- Serialize reservations for the same account, including calls from other devices.
  perform pg_advisory_xact_lock(hashtext('tutor:'||p_user::text));
  if p_op in ('state','reserve') then
    if p_body->>'conversation_id' is not null then
      select * into c from public.ai_conversations where id=(p_body->>'conversation_id')::uuid and user_id=p_user;
      if c.id is null then raise exception 'Conversation unavailable'; end if;
    else
      select * into c from public.ai_conversations where user_id=p_user and context_key=p_body->>'context_key';
    end if;
  end if;
  if p_op='delete' then
    delete from public.ai_conversations where id=(p_body->>'conversation_id')::uuid and user_id=p_user returning id into current_id;
    if current_id is null then raise exception 'Conversation unavailable'; end if;
    return jsonb_build_object('deleted',true);
  elsif p_op='reserve' then
    message_text=p_body->>'message';
    if length(message_text) not between 1 and 7000 then raise exception 'Invalid message'; end if;
    select * into r from public.ai_requests where id=(p_body->>'request_id')::uuid;
    if r.id is not null then
      if r.user_id<>p_user or r.message_hash<>p_body->>'message_hash' then raise exception 'Request mismatch'; end if;
      if r.status='complete' then return jsonb_build_object('cached',true,'response',r.response,'conversation_id',r.conversation_id); end if;
      if r.status='processing' and r.started_at>now()-interval '2 minutes' then raise exception 'BUSY:Uma resposta ainda está sendo preparada.'; end if;
      select * into c from public.ai_conversations where id=r.conversation_id and user_id=p_user;
      if c.context_key<>p_body->>'context_key' or c.next_seq<>r.user_seq then raise exception 'Request no longer current'; end if;
    end if;
    update public.ai_requests set status='failed' where user_id=p_user and status='processing' and started_at<=now()-interval '2 minutes';
    if exists(select 1 from public.ai_requests where user_id=p_user and status='processing') then raise exception 'BUSY:Aguarde a resposta atual antes de enviar outra pergunta.'; end if;
    if (select count(*) from public.ai_usage where user_id=p_user and created_at>now()-interval '1 minute')>=8
      or (select count(*) from public.ai_usage where user_id=p_user and created_at>=(date_trunc('day',now() at time zone 'UTC') at time zone 'UTC'))>=80
      then raise exception 'LIMIT:Você atingiu o limite de perguntas. Tente novamente mais tarde.'; end if;
    -- Global ceiling protects the account in addition to per-student quotas.
    perform pg_advisory_xact_lock(hashtext('tutor-global-budget'));
    if (select count(*) from public.ai_usage where created_at>=(date_trunc('day',now() at time zone 'UTC') at time zone 'UTC'))>=2000 then raise exception 'LIMIT:O tutor atingiu o limite de uso de hoje. Volte amanhã.'; end if;
    if (select count(*) from public.ai_messages m join public.ai_conversations tc on tc.id=m.conversation_id where tc.user_id=p_user)>=2000 then raise exception 'LIMIT:Seu histórico está cheio. Apague uma conversa antiga para continuar.'; end if;
    insert into public.ai_usage(user_id) values(p_user);
    if c.id is null then
      if (select count(*) from public.ai_conversations where user_id=p_user)>=80 then raise exception 'LIMIT:Apague uma conversa antiga para abrir outra.'; end if;
      insert into public.ai_conversations(user_id,title,context_key,context) values(p_user,p_body->'context'->>'title',p_body->>'context_key',p_body->'context') returning * into c;
    end if;
    if r.id is null then
      update public.ai_conversations set next_seq=next_seq+1,updated_at=now() where id=c.id returning * into c;
      insert into public.ai_messages(conversation_id,seq,role,content,exercise_id) values(c.id,c.next_seq,'user',message_text,c.context->>'exerciseId');
      insert into public.ai_requests(id,user_id,conversation_id,message_hash,user_seq,status)
      values((p_body->>'request_id')::uuid,p_user,c.id,p_body->>'message_hash',c.next_seq,'processing') returning * into r;
    else
      update public.ai_requests set status='processing',started_at=now() where id=r.id returning * into r;
    end if;
  elsif p_op in ('finish','fail') then
    select * into r from public.ai_requests where id=(p_body->>'request_id')::uuid and user_id=p_user for update;
    if r.id is null then raise exception 'Request unavailable'; end if;
    if p_op='fail' then
      update public.ai_requests set status='failed' where id=r.id and status='processing';
      return jsonb_build_object('failed',true);
    end if;
    if r.status='complete' then return jsonb_build_object('saved',true); end if;
    if r.status<>'processing' or length(p_body->>'response') not between 1 and 12000 then raise exception 'Invalid response'; end if;
    update public.ai_conversations set next_seq=next_seq+1,updated_at=now(),
      summary=case when p_body ? 'summary' then left(p_body->>'summary',3000) else summary end,
      summary_seq=case when p_body ? 'summary_seq' then (p_body->>'summary_seq')::integer else summary_seq end
      where id=r.conversation_id returning * into c;
    insert into public.ai_messages(conversation_id,seq,role,content,exercise_id) values(c.id,c.next_seq,'assistant',p_body->>'response',c.context->>'exerciseId');
    update public.ai_requests set status='complete',response=p_body->>'response' where id=r.id;
    return jsonb_build_object('saved',true);
  elsif p_op<>'state' then raise exception 'Invalid operation';
  end if;
  select coalesce(jsonb_agg(to_jsonb(m) order by m.seq),'[]') into messages
    from (select id,seq,role,content,created_at from public.ai_messages where conversation_id=c.id
      and (p_body->>'before_seq' is null or seq<(p_body->>'before_seq')::integer) order by seq desc limit 40) m;
  select coalesce(jsonb_agg(to_jsonb(t) order by t.updated_at desc),'[]') into conversations
    from (select id,context->>'title' as title,context->>'exerciseId' as exercise_id,context->>'mode' as mode,updated_at
      from public.ai_conversations where user_id=p_user order by updated_at desc limit 80) t;
  return jsonb_build_object('conversation',case when c.id is null then null else to_jsonb(c) end,'messages',messages,'conversations',conversations,
    'request_id',r.id,'user_seq',r.user_seq,'cached',false,
    'hasMore',exists(select 1 from public.ai_messages where conversation_id=c.id and seq<(messages->0->>'seq')::integer));
end;
$$;
revoke all on function public.tutor_action(uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.tutor_action(uuid,text,jsonb) to service_role;
commit;
