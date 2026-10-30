begin;
create table if not exists public.social_profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 nickname text not null check(char_length(nickname) between 2 and 24),
 code text not null unique default upper(substr(replace(gen_random_uuid()::text,'-',''),1,12)),
 avatar text not null default '✦' check(avatar in ('✦','☾','✿','♜')),
 tier integer not null default 0 check(tier between 0 and 3)
);
create table if not exists public.social_friendships (
 sender uuid references public.social_profiles(id) on delete cascade,
 recipient uuid references public.social_profiles(id) on delete cascade,
 status text not null default 'pending' check(status in ('pending','accepted')),
 primary key(sender,recipient), check(sender<>recipient)
);
create unique index if not exists social_pair on public.social_friendships(least(sender,recipient),greatest(sender,recipient));
create table if not exists public.social_blocks (
 owner uuid references public.social_profiles(id) on delete cascade,
 target uuid references public.social_profiles(id) on delete cascade,
 primary key(owner,target), check(owner<>target)
);
create table if not exists public.social_leagues (
 id uuid primary key default gen_random_uuid(), week date not null, tier integer not null
);
create table if not exists public.social_members (
 user_id uuid references public.social_profiles(id) on delete cascade,
 week date not null, league_id uuid references public.social_leagues(id),
 points integer not null default 0 check(points>=0), primary key(user_id,week)
);
create table if not exists public.social_sessions (
 id uuid primary key default gen_random_uuid(), user_id uuid references public.social_profiles(id) on delete cascade,
 week date not null, day date not null, created_at timestamptz not null default now(),
 questions jsonb not null, cursor integer not null default 0,
 results jsonb not null default '[]', correct_count integer not null default 0
);
create index if not exists social_sessions_owner_day on public.social_sessions(user_id,day);
-- No direct browser access. Every operation below is available only to the
-- Cloudflare backend after it verifies the user's Supabase access token.
alter table public.social_profiles enable row level security;
alter table public.social_friendships enable row level security;
alter table public.social_blocks enable row level security;
alter table public.social_leagues enable row level security;
alter table public.social_members enable row level security;
alter table public.social_sessions enable row level security;
revoke all on public.social_profiles, public.social_friendships, public.social_blocks, public.social_leagues, public.social_members, public.social_sessions from anon, authenticated;
create or replace function public.social_action(p_user uuid, p_op text, p_body jsonb default '{}')
returns jsonb language plpgsql security definer set search_path='' as $$
declare
 me public.social_profiles; target_id uuid; w date; d date; prev date; chosen uuid;
 t integer; n integer; pos integer; active public.social_sessions; q jsonb;
 result jsonb; ok boolean; points_added integer:=0; daily_correct integer;
 active_json jsonb:=null; profile_json jsonb; friends_json jsonb; incoming_json jsonb;
 outgoing_json jsonb; ranking_json jsonb; league_json jsonb; blocked_json jsonb;
begin
 if p_user is null then raise exception 'Conta inválida'; end if;
 -- Serialize all operations for this user, including concurrent answer retries.
 perform pg_advisory_xact_lock(hashtextextended(p_user::text,0));
 d:=(now() at time zone 'America/Sao_Paulo')::date;
 w:=date_trunc('week',now() at time zone 'America/Sao_Paulo')::date;
 select * into me from public.social_profiles where id=p_user for update;
 if p_op='register' then
  insert into public.social_profiles(id,nickname) values(p_user,trim(p_body->>'nickname'));
  select * into me from public.social_profiles where id=p_user;
 elsif me.id is null then
  if p_op='state' then return jsonb_build_object('registered',false); end if;
  raise exception 'Crie seu perfil primeiro';
 end if;
 if p_op='profile' then
  update public.social_profiles set nickname=trim(p_body->>'nickname'),avatar=p_body->>'avatar' where id=p_user;
 end if;
 if p_op in ('invite','accept','decline','remove','block','unblock') then
  if p_op='invite' then
   select id into target_id from public.social_profiles where code=upper(trim(p_body->>'code'));
  else target_id:=(p_body->>'target')::uuid; end if;
  if target_id is null or target_id=p_user then raise exception 'Código ou jogador inválido'; end if;
  -- Pair lock also serializes block/invite/accept in opposite directions.
  perform pg_advisory_xact_lock(hashtextextended(least(p_user,target_id)::text||greatest(p_user,target_id)::text,1));
  if p_op in ('invite','accept') and exists(select 1 from public.social_blocks where (owner=p_user and target=target_id) or (owner=target_id and target=p_user)) then raise exception 'Interação indisponível'; end if;
  if p_op='invite' then
   select count(*) into n from public.social_friendships where sender=p_user and status='pending';
   if n>=30 then raise exception 'Limite de 30 convites pendentes'; end if;
   insert into public.social_friendships(sender,recipient) values(p_user,target_id) on conflict do nothing;
  elsif p_op='accept' then
   update public.social_friendships set status='accepted' where sender=target_id and recipient=p_user and status='pending';
   if not found then raise exception 'Convite não encontrado'; end if;
  elsif p_op in ('remove','decline','block') then
   delete from public.social_friendships where (sender=p_user and recipient=target_id) or (sender=target_id and recipient=p_user);
   if p_op='block' then insert into public.social_blocks values(p_user,target_id) on conflict do nothing; end if;
  elsif p_op='unblock' then delete from public.social_blocks where owner=p_user and target=target_id;
  end if;
 end if;
 if p_op='join' then
  perform pg_advisory_xact_lock(hashtextextended('league:'||w::text,2));
  if not exists(select 1 from public.social_members where user_id=p_user and week=w) then
   select max(week) into prev from public.social_members where user_id=p_user and week<w;
   t:=me.tier;
   if prev is not null then
    select league_id into chosen from public.social_members where user_id=p_user and week=prev;
    select count(*) into n from public.social_members where league_id=chosen;
    select place into pos from (select user_id,row_number() over(order by points desc,user_id) place from public.social_members where league_id=chosen) b where user_id=p_user;
    if n>=4 and pos<=3 and exists(select 1 from public.social_members where user_id=p_user and week=prev and points>0) then t:=least(3,t+1); end if;
   end if;
   update public.social_profiles set tier=t where id=p_user;
   select l.id into chosen from public.social_leagues l where l.week=w and l.tier=t and (select count(*) from public.social_members m where m.league_id=l.id)<10 order by l.id limit 1;
   if chosen is null then insert into public.social_leagues(week,tier) values(w,t) returning id into chosen; end if;
   insert into public.social_members(user_id,week,league_id) values(p_user,w,chosen);
  end if;
 end if;
 if p_op='start' then
  if not exists(select 1 from public.social_members where user_id=p_user and week=w) then raise exception 'Entre na liga desta semana primeiro'; end if;
  select * into active from public.social_sessions where user_id=p_user and week=w and day=d and cursor<3 and created_at>now()-interval '30 minutes' order by created_at desc limit 1;
  if active.id is null then
   select count(*) into n from public.social_sessions where user_id=p_user and day=d;
   if n>=10 then raise exception 'Limite de dez sessões por dia atingido'; end if;
   if jsonb_array_length(p_body->'questions')<>3 then raise exception 'Sessão inválida'; end if;
   insert into public.social_sessions(user_id,week,day,questions) values(p_user,w,d,p_body->'questions') returning * into active;
  end if;
 end if;
 if p_op='answer' then
  select * into active from public.social_sessions where id=(p_body->>'session')::uuid and user_id=p_user for update;
  if active.id is null or active.week<>w or active.day<>d or active.created_at<=now()-interval '30 minutes' then raise exception 'Sessão expirada. Comece outra sessão'; end if;
  n:=(p_body->>'cursor')::integer;
  if n is null or n<0 or n>2 then raise exception 'Questão inválida'; end if;
  if n<active.cursor then return active.results->n; end if;
  if n<>active.cursor then raise exception 'Responda na ordem da sessão'; end if;
  if (p_body->>'answer') is null or (p_body->>'answer')::integer not between 0 and 3 then raise exception 'Resposta inválida'; end if;
  q:=active.questions->n; ok:=(p_body->>'answer')::integer=(q->>'correct')::integer;
  select coalesce(sum(correct_count),0) into daily_correct from public.social_sessions where user_id=p_user and day=d;
  if ok and daily_correct<20 then points_added:=10; end if;
  active.correct_count:=active.correct_count+case when ok then 1 else 0 end;
  if n=2 and active.correct_count>0 then
   select count(*) into t from public.social_sessions where user_id=p_user and day=d and cursor=3 and correct_count>0;
   if t<3 then points_added:=points_added+15; end if;
  end if;
  result:=jsonb_build_object('correct',ok,'explanation',q->>'explanation','correctAnswer',q->'answers'->>((q->>'correct')::integer),'points',points_added,'finished',n=2);
  update public.social_sessions set cursor=cursor+1,correct_count=active.correct_count,results=results||jsonb_build_array(result) where id=active.id;
  update public.social_members set points=points+points_added where user_id=p_user and week=w;
  return result;
 end if;
 select to_jsonb(p) into profile_json from public.social_profiles p where id=p_user;
 select coalesce(jsonb_agg(jsonb_build_object('id',p.id,'nickname',p.nickname,'avatar',p.avatar)),'[]') into friends_json from public.social_profiles p join public.social_friendships f on p.id=case when f.sender=p_user then f.recipient else f.sender end where (f.sender=p_user or f.recipient=p_user) and f.status='accepted';
 select coalesce(jsonb_agg(jsonb_build_object('id',p.id,'nickname',p.nickname,'avatar',p.avatar)),'[]') into incoming_json from public.social_friendships f join public.social_profiles p on p.id=f.sender where f.recipient=p_user and f.status='pending';
 select coalesce(jsonb_agg(jsonb_build_object('id',p.id,'nickname',p.nickname,'avatar',p.avatar)),'[]') into outgoing_json from public.social_friendships f join public.social_profiles p on p.id=f.recipient where f.sender=p_user and f.status='pending';
 select coalesce(jsonb_agg(jsonb_build_object('id',p.id,'nickname',p.nickname)),'[]') into blocked_json from public.social_blocks b join public.social_profiles p on p.id=b.target where b.owner=p_user;
 select coalesce(jsonb_agg(jsonb_build_object('id',p.id,'nickname',p.nickname,'avatar',p.avatar,'points',coalesce(m.points,0)) order by coalesce(m.points,0) desc,p.id),'[]') into ranking_json from public.social_profiles p left join public.social_members m on m.user_id=p.id and m.week=w where p.id=p_user or exists(select 1 from public.social_friendships f where f.status='accepted' and ((f.sender=p_user and f.recipient=p.id) or (f.recipient=p_user and f.sender=p.id)));
 select league_id into chosen from public.social_members where user_id=p_user and week=w;
 if chosen is not null then
  select jsonb_build_object('tier',l.tier,'board',(select jsonb_agg(jsonb_build_object('id',p.id,'nickname',case when exists(select 1 from public.social_blocks b where (b.owner=p_user and b.target=p.id) or (b.owner=p.id and b.target=p_user)) then 'Jogador' else p.nickname end,'points',m.points) order by m.points desc,p.id) from public.social_members m join public.social_profiles p on p.id=m.user_id where m.league_id=l.id)) into league_json from public.social_leagues l where l.id=chosen;
 end if;
 select * into active from public.social_sessions where user_id=p_user and week=w and day=d and cursor<3 and created_at>now()-interval '30 minutes' order by created_at desc limit 1;
 if active.id is not null then active_json:=jsonb_build_object('id',active.id,'cursor',active.cursor,'question',(active.questions->active.cursor)-'correct'-'explanation'); end if;
 return jsonb_build_object('registered',true,'me',profile_json,'week',w,'friends',friends_json,'incoming',incoming_json,'outgoing',outgoing_json,'blocked',blocked_json,'ranking',ranking_json,'league',league_json,'active',active_json);
end;
$$;
revoke all on function public.social_action(uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.social_action(uuid,text,jsonb) to service_role;
commit;
