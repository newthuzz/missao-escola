begin;
create table if not exists public.tutor_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  context_key text not null check (length(context_key) between 1 and 240),
  context jsonb not null,
  summary text not null default '' check (length(summary)<=3000),
  summary_seq integer not null default 0,
  next_seq integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id,context_key)
);
create table if not exists public.tutor_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.tutor_conversations(id) on delete cascade,
  seq integer not null,
  role text not null check (role in ('user','assistant')),
  content text not null check (length(content) between 1 and 12000),
  created_at timestamptz not null default now(),
  unique(conversation_id,seq)
);
create table if not exists public.tutor_requests (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  conversation_id uuid not null references public.tutor_conversations(id) on delete cascade,
  message_hash text not null,
  user_seq integer not null,
  status text not null check (status in ('processing','complete','failed')),
  response text,
  started_at timestamptz not null default now()
);
create table if not exists public.tutor_usage (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists tutor_messages_recent on public.tutor_messages(conversation_id,seq desc);
create index if not exists tutor_usage_recent on public.tutor_usage(user_id,created_at);
create index if not exists tutor_usage_global_recent on public.tutor_usage(created_at);
create index if not exists tutor_conversations_owner on public.tutor_conversations(user_id,updated_at desc);
alter table public.tutor_conversations enable row level security;
alter table public.tutor_messages enable row level security;
alter table public.tutor_requests enable row level security;
alter table public.tutor_usage enable row level security;
revoke all on public.tutor_conversations,public.tutor_messages,public.tutor_requests,public.tutor_usage from public,anon,authenticated;
grant select on public.tutor_conversations,public.tutor_messages to authenticated;
grant all on public.tutor_conversations,public.tutor_messages,public.tutor_requests,public.tutor_usage to service_role;
grant usage,select on sequence public.tutor_usage_id_seq to service_role;
drop policy if exists tutor_own_conversations on public.tutor_conversations;
create policy tutor_own_conversations on public.tutor_conversations for select to authenticated using ((select auth.uid())=user_id);
drop policy if exists tutor_own_messages on public.tutor_messages;
create policy tutor_own_messages on public.tutor_messages for select to authenticated using (
  exists(select 1 from public.tutor_conversations c where c.id=conversation_id and c.user_id=(select auth.uid()))
);

create or replace function public.tutor_action(p_user uuid,p_op text,p_body jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare c public.tutor_conversations; r public.tutor_requests; messages jsonb; conversations jsonb; message_text text; current_id uuid;
begin
  if p_user is null then raise exception 'Authentication required'; end if;
  -- Serialize reservations for the same account, including calls from other devices.
  perform pg_advisory_xact_lock(hashtext('tutor:'||p_user::text));
  if p_op in ('state','reserve') then
    if p_body->>'conversation_id' is not null then
      select * into c from public.tutor_conversations where id=(p_body->>'conversation_id')::uuid and user_id=p_user;
      if c.id is null then raise exception 'Conversation unavailable'; end if;
    else
      select * into c from public.tutor_conversations where user_id=p_user and context_key=p_body->>'context_key';
    end if;
  end if;
  if p_op='delete' then
    delete from public.tutor_conversations where id=(p_body->>'conversation_id')::uuid and user_id=p_user returning id into current_id;
    if current_id is null then raise exception 'Conversation unavailable'; end if;
    return jsonb_build_object('deleted',true);
  elsif p_op='reserve' then
    message_text=p_body->>'message';
    if length(message_text) not between 1 and 7000 then raise exception 'Invalid message'; end if;
    select * into r from public.tutor_requests where id=(p_body->>'request_id')::uuid;
    if r.id is not null then
      if r.user_id<>p_user or r.message_hash<>p_body->>'message_hash' then raise exception 'Request mismatch'; end if;
      if r.status='complete' then return jsonb_build_object('cached',true,'response',r.response,'conversation_id',r.conversation_id); end if;
      if r.status='processing' and r.started_at>now()-interval '2 minutes' then raise exception 'BUSY:Uma resposta ainda está sendo preparada.'; end if;
      select * into c from public.tutor_conversations where id=r.conversation_id and user_id=p_user;
      if c.context_key<>p_body->>'context_key' or c.next_seq<>r.user_seq then raise exception 'Request no longer current'; end if;
    end if;
    update public.tutor_requests set status='failed' where user_id=p_user and status='processing' and started_at<=now()-interval '2 minutes';
    if exists(select 1 from public.tutor_requests where user_id=p_user and status='processing') then raise exception 'BUSY:Aguarde a resposta atual antes de enviar outra pergunta.'; end if;
    if (select count(*) from public.tutor_usage where user_id=p_user and created_at>now()-interval '1 minute')>=8
      or (select count(*) from public.tutor_usage where user_id=p_user and created_at>=(date_trunc('day',now() at time zone 'UTC') at time zone 'UTC'))>=80
      then raise exception 'LIMIT:Você atingiu o limite de perguntas. Tente novamente mais tarde.'; end if;
    -- Global ceiling protects the account in addition to per-student quotas.
    perform pg_advisory_xact_lock(hashtext('tutor-global-budget'));
    if (select count(*) from public.tutor_usage where created_at>=(date_trunc('day',now() at time zone 'UTC') at time zone 'UTC'))>=2000 then raise exception 'LIMIT:O tutor atingiu o limite de uso de hoje. Volte amanhã.'; end if;
    if (select count(*) from public.tutor_messages m join public.tutor_conversations tc on tc.id=m.conversation_id where tc.user_id=p_user)>=2000 then raise exception 'LIMIT:Seu histórico está cheio. Apague uma conversa antiga para continuar.'; end if;
    insert into public.tutor_usage(user_id) values(p_user);
    if c.id is null then
      if (select count(*) from public.tutor_conversations where user_id=p_user)>=80 then raise exception 'LIMIT:Apague uma conversa antiga para abrir outra.'; end if;
      insert into public.tutor_conversations(user_id,context_key,context) values(p_user,p_body->>'context_key',p_body->'context') returning * into c;
    end if;
    if r.id is null then
      update public.tutor_conversations set next_seq=next_seq+1,updated_at=now() where id=c.id returning * into c;
      insert into public.tutor_messages(conversation_id,seq,role,content) values(c.id,c.next_seq,'user',message_text);
      insert into public.tutor_requests(id,user_id,conversation_id,message_hash,user_seq,status)
      values((p_body->>'request_id')::uuid,p_user,c.id,p_body->>'message_hash',c.next_seq,'processing') returning * into r;
    else
      update public.tutor_requests set status='processing',started_at=now() where id=r.id returning * into r;
    end if;
  elsif p_op in ('finish','fail') then
    select * into r from public.tutor_requests where id=(p_body->>'request_id')::uuid and user_id=p_user for update;
    if r.id is null then raise exception 'Request unavailable'; end if;
    if p_op='fail' then
      update public.tutor_requests set status='failed' where id=r.id and status='processing';
      return jsonb_build_object('failed',true);
    end if;
    if r.status='complete' then return jsonb_build_object('saved',true); end if;
    if r.status<>'processing' or length(p_body->>'response') not between 1 and 12000 then raise exception 'Invalid response'; end if;
    update public.tutor_conversations set next_seq=next_seq+1,updated_at=now(),
      summary=case when p_body ? 'summary' then left(p_body->>'summary',3000) else summary end,
      summary_seq=case when p_body ? 'summary_seq' then (p_body->>'summary_seq')::integer else summary_seq end
      where id=r.conversation_id returning * into c;
    insert into public.tutor_messages(conversation_id,seq,role,content) values(c.id,c.next_seq,'assistant',p_body->>'response');
    update public.tutor_requests set status='complete',response=p_body->>'response' where id=r.id;
    return jsonb_build_object('saved',true);
  elsif p_op<>'state' then raise exception 'Invalid operation';
  end if;
  select coalesce(jsonb_agg(to_jsonb(m) order by m.seq),'[]') into messages
    from (select id,seq,role,content,created_at from public.tutor_messages where conversation_id=c.id
      and (p_body->>'before_seq' is null or seq<(p_body->>'before_seq')::integer) order by seq desc limit 40) m;
  select coalesce(jsonb_agg(to_jsonb(t) order by t.updated_at desc),'[]') into conversations
    from (select id,context->>'title' as title,context->>'exerciseId' as exercise_id,context->>'mode' as mode,updated_at
      from public.tutor_conversations where user_id=p_user order by updated_at desc limit 80) t;
  return jsonb_build_object('conversation',case when c.id is null then null else to_jsonb(c) end,'messages',messages,'conversations',conversations,
    'request_id',r.id,'user_seq',r.user_seq,'cached',false,
    'hasMore',exists(select 1 from public.tutor_messages where conversation_id=c.id and seq<(messages->0->>'seq')::integer));
end;
$$;
revoke all on function public.tutor_action(uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.tutor_action(uuid,text,jsonb) to service_role;
commit;
