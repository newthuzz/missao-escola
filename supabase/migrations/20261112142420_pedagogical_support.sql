begin;
create schema if not exists pedagogy;
revoke all on schema pedagogy from public, anon;
grant usage on schema pedagogy to authenticated;
create table if not exists public.user_roles(user_id uuid not null references auth.users(id) on delete cascade,role text not null check(role in ('student','teacher','admin')),created_at timestamptz not null default now(),primary key(user_id,role));
alter table public.user_roles enable row level security;
revoke insert,update,delete,truncate,references,trigger on public.user_roles from anon,authenticated;
grant select on public.user_roles to authenticated;
do $$begin if not exists(select 1 from pg_policies where schemaname='public' and tablename='user_roles' and cmd='SELECT') then create policy edu_roles_self_read on public.user_roles for select to authenticated using(user_id=(select auth.uid()));end if;end$$;
-- Institutional authorization lives here, not in user-editable JWT metadata.
create table if not exists public.edu_schools(id uuid primary key default gen_random_uuid(),name text not null check(length(name) between 2 and 160),active boolean not null default true,coordination_enabled boolean not null default false,support_contact text not null default '' check(length(support_contact)<=300),retention_days integer not null default 365 check(retention_days between 30 and 1095),created_at timestamptz not null default now());
create table if not exists public.edu_classes(id uuid primary key default gen_random_uuid(),school_id uuid not null references public.edu_schools on delete cascade,name text not null check(length(name) between 1 and 100),active boolean not null default true,unique(id,school_id),unique(school_id,name));
create table if not exists public.edu_subjects(id uuid primary key default gen_random_uuid(),school_id uuid not null references public.edu_schools on delete cascade,name text not null check(length(name) between 2 and 100),active boolean not null default true,unique(id,school_id),unique(school_id,name));
create table if not exists public.edu_profiles(id uuid primary key references auth.users on delete cascade,display_name text not null check(length(display_name) between 2 and 120),updated_at timestamptz not null default now());
create table if not exists public.edu_admin_scopes(user_id uuid not null references auth.users on delete cascade,school_id uuid not null references public.edu_schools on delete cascade,can_sensitive boolean not null default false,created_at timestamptz not null default now(),primary key(user_id,school_id));
create table if not exists public.edu_memberships(student_id uuid not null references auth.users on delete cascade,school_id uuid not null,class_id uuid not null,active boolean not null default true,created_at timestamptz not null default now(),primary key(student_id,class_id),foreign key(class_id,school_id) references public.edu_classes(id,school_id) on delete cascade);
create table if not exists public.edu_teacher_applications(id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users on delete cascade,school_id uuid not null references public.edu_schools on delete cascade,full_name text not null check(length(full_name) between 2 and 120),class_ids uuid[] not null,subject_ids uuid[] not null,notes text not null default '' check(length(notes)<=2000),status text not null default 'pending' check(status in ('pending','approved','rejected','cancelled')),public_reason text not null default '' check(length(public_reason)<=500),reviewed_by uuid references auth.users on delete set null,reviewed_at timestamptz,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create unique index if not exists edu_application_pending on public.edu_teacher_applications(user_id,school_id) where status='pending';
create table if not exists public.edu_teacher_assignments(teacher_id uuid not null references auth.users on delete cascade,school_id uuid not null,class_id uuid not null,subject_id uuid not null,application_id uuid references public.edu_teacher_applications on delete set null,authorized boolean not null default true,active boolean not null default true,created_at timestamptz not null default now(),primary key(teacher_id,class_id,subject_id),foreign key(class_id,school_id) references public.edu_classes(id,school_id) on delete cascade,foreign key(subject_id,school_id) references public.edu_subjects(id,school_id) on delete cascade);
create table if not exists public.edu_support_requests(id uuid primary key default gen_random_uuid(),student_id uuid not null references auth.users on delete cascade,school_id uuid not null,class_id uuid not null,subject_id uuid not null,assigned_to uuid references auth.users on delete set null,title text not null check(length(title) between 5 and 140),difficulty text not null check(difficulty in ('content','activity','pace','organization','other','sensitive')),description text not null check(length(description) between 20 and 4000),status text not null default 'open' check(status in ('open','in_progress','answered','closed')),client_id uuid not null,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(student_id,client_id),foreign key(class_id,school_id) references public.edu_classes(id,school_id),foreign key(subject_id,school_id) references public.edu_subjects(id,school_id));
create table if not exists public.edu_support_messages(id uuid primary key default gen_random_uuid(),request_id uuid not null references public.edu_support_requests on delete cascade,sender_id uuid not null references auth.users on delete cascade,body text not null check(length(body) between 1 and 4000),client_id uuid not null,created_at timestamptz not null default now(),unique(sender_id,client_id));
create table if not exists public.edu_notifications(id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users on delete cascade,kind text not null check(kind in ('application','review','request','message','status')),request_id uuid references public.edu_support_requests on delete cascade,application_id uuid references public.edu_teacher_applications on delete cascade,read_at timestamptz,created_at timestamptz not null default now());
create table if not exists public.edu_audit_logs(id uuid primary key default gen_random_uuid(),actor_id uuid references auth.users on delete set null,school_id uuid not null references public.edu_schools on delete cascade,action text not null,resource_id uuid,details jsonb not null default '{}',created_at timestamptz not null default now());
create index if not exists edu_applications_school_status on public.edu_teacher_applications(school_id,status,created_at desc);
create index if not exists edu_applications_user on public.edu_teacher_applications(user_id,created_at desc);
create index if not exists edu_assignments_scope on public.edu_teacher_assignments(school_id,class_id,subject_id) where active;
create index if not exists edu_memberships_class on public.edu_memberships(school_id,class_id) where active;
create index if not exists edu_requests_student on public.edu_support_requests(student_id,created_at desc,id);
create index if not exists edu_requests_queue on public.edu_support_requests(school_id,class_id,subject_id,status,updated_at desc);
create index if not exists edu_requests_assignee on public.edu_support_requests(assigned_to,status,updated_at desc);
create index if not exists edu_messages_order on public.edu_support_messages(request_id,created_at,id);
create index if not exists edu_notifications_unread on public.edu_notifications(user_id,created_at desc) where read_at is null;
create index if not exists edu_notifications_user on public.edu_notifications(user_id,created_at desc,id);
create index if not exists edu_audit_school on public.edu_audit_logs(school_id,created_at desc);
create index if not exists edu_admin_school on public.edu_admin_scopes(school_id,user_id);
create index if not exists edu_assignment_application on public.edu_teacher_assignments(application_id);
create index if not exists edu_assignment_subject on public.edu_teacher_assignments(subject_id,school_id);
create index if not exists edu_requests_subject on public.edu_support_requests(subject_id,school_id);
create index if not exists edu_application_reviewer on public.edu_teacher_applications(reviewed_by);
create index if not exists edu_notifications_request on public.edu_notifications(request_id) where request_id is not null;
create index if not exists edu_notifications_application on public.edu_notifications(application_id) where application_id is not null;
create index if not exists edu_audit_actor on public.edu_audit_logs(actor_id);
-- Modern Auth JWTs carry session_id. A revoked/expired session must not keep
-- accessing private support rows through an otherwise unexpired access token.
create or replace function pedagogy.session_ok() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from auth.users where id=(select auth.uid()) and email_confirmed_at is not null) and
 (nullif((select auth.jwt())->>'session_id','') is null or exists(select 1 from auth.sessions s where s.id=((select auth.jwt())->>'session_id')::uuid and s.user_id=(select auth.uid()) and (s.not_after is null or s.not_after>now())))
$$;
-- Definer helpers are isolated in a non-exposed schema, with fixed search_path.
create or replace function pedagogy.is_admin(s uuid,sensitive boolean default false) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.edu_admin_scopes a join public.user_roles r on r.user_id=a.user_id and r.role='admin' join public.edu_schools sc on sc.id=a.school_id and sc.active where a.user_id=(select auth.uid()) and a.school_id=s and (not sensitive or a.can_sensitive))
$$;
create or replace function pedagogy.is_teacher(s uuid,c uuid,sub uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.edu_teacher_assignments a join public.user_roles r on r.user_id=a.teacher_id and r.role='teacher' join public.edu_schools sc on sc.id=a.school_id and sc.active join public.edu_classes cl on cl.id=a.class_id and cl.active join public.edu_subjects su on su.id=a.subject_id and su.active where a.teacher_id=(select auth.uid()) and a.school_id=s and a.class_id=c and a.subject_id=sub and a.active)
$$;
create or replace function pedagogy.can_read_request(rid uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.edu_support_requests r where r.id=rid and (r.student_id=(select auth.uid()) or pedagogy.is_admin(r.school_id,r.difficulty='sensitive') or (r.difficulty<>'sensitive' and (r.assigned_to is null or r.assigned_to=(select auth.uid())) and pedagogy.is_teacher(r.school_id,r.class_id,r.subject_id))))
$$;
create or replace function pedagogy.in_school(s uuid) returns boolean language sql stable security definer set search_path='' as $$
 select pedagogy.is_admin(s) or exists(select 1 from public.edu_memberships m where m.student_id=(select auth.uid()) and m.school_id=s and m.active) or exists(select 1 from public.edu_teacher_assignments a join public.user_roles ur on ur.user_id=a.teacher_id and ur.role='teacher' where a.teacher_id=(select auth.uid()) and a.school_id=s and a.active)
$$;
-- Reads are scoped by RLS. All mutations go through the authenticated RPC below.
do $$declare t text;begin
 foreach t in array array['edu_schools','edu_classes','edu_subjects','edu_profiles','edu_admin_scopes','edu_memberships','edu_teacher_applications','edu_teacher_assignments','edu_support_requests','edu_support_messages','edu_notifications','edu_audit_logs'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from anon,authenticated',t);
  execute format('grant select on public.%I to authenticated',t);
  execute format('drop policy if exists edu_session_guard on public.%I',t);
  execute format('create policy edu_session_guard on public.%I as restrictive for select to authenticated using ((select pedagogy.session_ok()))',t);
 end loop;
end$$;
drop policy if exists edu_school_read on public.edu_schools;
create policy edu_school_read on public.edu_schools for select to authenticated using(pedagogy.in_school(id));
drop policy if exists edu_class_read on public.edu_classes;
create policy edu_class_read on public.edu_classes for select to authenticated using(pedagogy.in_school(school_id));
drop policy if exists edu_subject_read on public.edu_subjects;
create policy edu_subject_read on public.edu_subjects for select to authenticated using(pedagogy.in_school(school_id));
drop policy if exists edu_profile_read on public.edu_profiles;
create policy edu_profile_read on public.edu_profiles for select to authenticated using(id=(select auth.uid()));
drop policy if exists edu_admin_read on public.edu_admin_scopes;
create policy edu_admin_read on public.edu_admin_scopes for select to authenticated using(user_id=(select auth.uid()));
drop policy if exists edu_membership_read on public.edu_memberships;
create policy edu_membership_read on public.edu_memberships for select to authenticated using(student_id=(select auth.uid()) or pedagogy.is_admin(school_id));
drop policy if exists edu_application_read on public.edu_teacher_applications;
create policy edu_application_read on public.edu_teacher_applications for select to authenticated using(user_id=(select auth.uid()) or pedagogy.is_admin(school_id));
drop policy if exists edu_assignment_read on public.edu_teacher_assignments;
create policy edu_assignment_read on public.edu_teacher_assignments for select to authenticated using(teacher_id=(select auth.uid()) or pedagogy.is_admin(school_id));
drop policy if exists edu_request_read on public.edu_support_requests;
create policy edu_request_read on public.edu_support_requests for select to authenticated using(pedagogy.can_read_request(id));
drop policy if exists edu_message_read on public.edu_support_messages;
create policy edu_message_read on public.edu_support_messages for select to authenticated using(pedagogy.can_read_request(request_id));
drop policy if exists edu_notification_read on public.edu_notifications;
create policy edu_notification_read on public.edu_notifications for select to authenticated using(user_id=(select auth.uid()));
drop policy if exists edu_audit_read on public.edu_audit_logs;
create policy edu_audit_read on public.edu_audit_logs for select to authenticated using(pedagogy.is_admin(school_id));
create or replace function pedagogy.catalog() returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('schools',coalesce((select jsonb_agg(jsonb_build_object('id',id,'name',name) order by name) from public.edu_schools where active),'[]'::jsonb),'classes',coalesce((select jsonb_agg(jsonb_build_object('id',c.id,'school_id',c.school_id,'name',c.name) order by c.name) from public.edu_classes c join public.edu_schools s on s.id=c.school_id where c.active and s.active),'[]'::jsonb),'subjects',coalesce((select jsonb_agg(jsonb_build_object('id',c.id,'school_id',c.school_id,'name',c.name) order by c.name) from public.edu_subjects c join public.edu_schools s on s.id=c.school_id where c.active and s.active),'[]'::jsonb))
$$;
create or replace function public.pedagogy_catalog() returns jsonb language sql stable security invoker set search_path='' as $$select pedagogy.catalog()$$;
-- Signup metadata is untrusted input: it can only enqueue a validated PENDING
-- application. Neither a role nor an approval can be taken from that metadata.
create or replace function pedagogy.enqueue_application(u uuid,b jsonb) returns uuid language plpgsql security invoker set search_path='' as $$
declare s uuid:=(b->>'school_id')::uuid;cs uuid[];ss uuid[];rid uuid;nm text:=trim(b->>'full_name');
begin
 select array_agg(distinct value::uuid) into cs from jsonb_array_elements_text(b->'class_ids');
 select array_agg(distinct value::uuid) into ss from jsonb_array_elements_text(b->'subject_ids');
 if nm is null or length(nm) not between 2 and 120 or coalesce(cardinality(cs),0) not between 1 and 20 or coalesce(cardinality(ss),0) not between 1 and 20 or length(coalesce(b->>'notes',''))>2000 then raise exception 'Confira o nome, as turmas e as disciplinas.';end if;
 if not exists(select 1 from public.edu_schools where id=s and active) or (select count(*) from public.edu_classes where id=any(cs) and school_id=s and active)<>cardinality(cs) or (select count(*) from public.edu_subjects where id=any(ss) and school_id=s and active)<>cardinality(ss) then raise exception 'Instituição, turma ou disciplina indisponível.';end if;
 perform pg_advisory_xact_lock(hashtextextended(u::text,44));
 if exists(select 1 from public.edu_teacher_applications where user_id=u and school_id=s and status in ('pending','approved')) then raise exception 'Você já possui uma solicitação pendente ou aprovada nesta instituição.';end if;
 if (select count(*) from public.edu_teacher_applications where user_id=u and created_at>now()-interval '1 day')>=3 then raise exception 'Aguarde antes de enviar outra solicitação.';end if;
 insert into public.edu_teacher_applications(user_id,school_id,full_name,class_ids,subject_ids,notes) values(u,s,nm,cs,ss,coalesce(b->>'notes','')) returning id into rid;
 insert into public.edu_notifications(user_id,kind,application_id) select a.user_id,'application',rid from public.edu_admin_scopes a join public.user_roles r on r.user_id=a.user_id and r.role='admin' where a.school_id=s;
 return rid;
end$$;
create or replace function pedagogy.signup_application() returns trigger language plpgsql security definer set search_path='' as $$begin
 if new.raw_user_meta_data ? 'pedagogical_application' then perform pedagogy.enqueue_application(new.id,new.raw_user_meta_data->'pedagogical_application');end if;
 return new;
end$$;
drop trigger if exists edu_signup_application on auth.users;
create trigger edu_signup_application after insert on auth.users for each row execute function pedagogy.signup_application();
create or replace function pedagogy.notify_request(r public.edu_support_requests,actor uuid,k text) returns void language plpgsql security invoker set search_path='' as $$
begin
 if actor<>r.student_id then insert into public.edu_notifications(user_id,kind,request_id) values(r.student_id,k,r.id);if r.assigned_to is not null and r.assigned_to<>actor then insert into public.edu_notifications(user_id,kind,request_id) values(r.assigned_to,k,r.id);end if;end if;
 if actor=r.student_id then
  if r.assigned_to is not null then insert into public.edu_notifications(user_id,kind,request_id) values(r.assigned_to,k,r.id);
  elsif r.difficulty='sensitive' then
   insert into public.edu_notifications(user_id,kind,request_id) select a.user_id,k,r.id from public.edu_admin_scopes a join public.user_roles ur on ur.user_id=a.user_id and ur.role='admin' where a.school_id=r.school_id and a.can_sensitive and a.user_id<>actor;
  else
   insert into public.edu_notifications(user_id,kind,request_id) select distinct a.teacher_id,k,r.id from public.edu_teacher_assignments a join public.user_roles ur on ur.user_id=a.teacher_id and ur.role='teacher' where a.school_id=r.school_id and a.class_id=r.class_id and a.subject_id=r.subject_id and a.active and a.teacher_id<>actor;
  end if;
 end if;
end$$;
create or replace function pedagogy.action(op text,b jsonb default '{}') returns jsonb language plpgsql security definer set search_path='' as $$
#variable_conflict use_column
declare
 u uuid:=auth.uid();s uuid;c uuid;sub uuid;target uuid;rid uuid;cid uuid;nm text;content text;role_name text;d text;
 a public.edu_teacher_applications;r public.edu_support_requests;m public.edu_support_messages;
 cs uuid[];ss uuid[];pairs jsonb;chosen uuid;offset_n integer:=greatest(0,least(10000,coalesce((b->>'offset')::integer,0)));rows_json jsonb;more_json jsonb;msg_json jsonb;last_id uuid;total_n integer;id_list uuid[];
begin
 if u is null or not pedagogy.session_ok() then raise exception 'Entre em uma conta com e-mail confirmado.' using errcode='42501';end if;
 if b is null or jsonb_typeof(b)<>'object' then raise exception 'Dados inválidos.';end if;
 perform pg_advisory_xact_lock(hashtextextended(u::text,44));
 if op='context' then
  role_name:=case when exists(select 1 from public.user_roles where user_id=u and role='admin') then 'admin' when exists(select 1 from public.edu_teacher_assignments a join public.user_roles ur on ur.user_id=a.teacher_id and ur.role='teacher' where a.teacher_id=u and a.active and exists(select 1 from public.edu_schools sc where sc.id=a.school_id and sc.active)) then 'teacher' else 'student' end;
  return jsonb_build_object('role',role_name,'userId',u,'profile',coalesce((select to_jsonb(p) from public.edu_profiles p where id=u),'{}'),'schools',coalesce((select jsonb_agg(to_jsonb(sc) order by sc.name) from public.edu_schools sc where sc.active and pedagogy.in_school(sc.id)),'[]'),'memberships',coalesce((select jsonb_agg(to_jsonb(x)) from (select e.school_id,e.class_id,c.name class_name,sc.name school_name from public.edu_memberships e join public.edu_classes c on c.id=e.class_id join public.edu_schools sc on sc.id=e.school_id where e.student_id=u and e.active and sc.active and c.active)x),'[]'),'assignments',coalesce((select jsonb_agg(to_jsonb(x)) from (select t.school_id,t.class_id,t.subject_id,c.name class_name,su.name subject_name from public.edu_teacher_assignments t join public.edu_classes c on c.id=t.class_id join public.edu_subjects su on su.id=t.subject_id where t.teacher_id=u and t.active)x),'[]'),'applications',coalesce((select jsonb_agg(to_jsonb(x)) from (select a.*,sc.name school_name from public.edu_teacher_applications a join public.edu_schools sc on sc.id=a.school_id where a.user_id=u order by a.created_at desc limit 20)x),'[]'),'unread',(select count(*) from public.edu_notifications where user_id=u and read_at is null));
 elsif op='profile' then
  nm:=trim(b->>'display_name');if nm is null or length(nm) not between 2 and 120 then raise exception 'Use um nome de 2 a 120 caracteres.';end if;
  insert into public.edu_profiles(id,display_name) values(u,nm) on conflict(id) do update set display_name=excluded.display_name,updated_at=now();return jsonb_build_object('ok',true);
 elsif op='apply' then rid:=pedagogy.enqueue_application(u,b);return jsonb_build_object('id',rid);
 elsif op='cancel_application' then
  select * into a from public.edu_teacher_applications where id=(b->>'id')::uuid and user_id=u for update;
  if a.id is null or a.status<>'pending' then raise exception 'Solicitação indisponível.';end if;
  update public.edu_teacher_applications set status='cancelled',updated_at=now() where id=a.id;return jsonb_build_object('ok',true);
 elsif op in ('applications','metrics','configure','enroll','teacher_access','teachers','members','update_assignments') then
  s:=(b->>'school_id')::uuid;
  if not pedagogy.is_admin(s) then raise exception 'Acesso institucional não autorizado.' using errcode='42501';end if;
  if op='applications' then
   select coalesce(jsonb_agg(to_jsonb(x)),'[]') into rows_json from (select a.*,sc.name school_name,au.email from public.edu_teacher_applications a join public.edu_schools sc on sc.id=a.school_id join auth.users au on au.id=a.user_id where a.school_id=s and (coalesce(b->>'status','')='' or a.status=b->>'status') and (coalesce(b->>'q','')='' or a.full_name ilike '%'||left(b->>'q',100)||'%' or au.email ilike '%'||left(b->>'q',100)||'%') order by a.created_at desc,a.id limit 25 offset offset_n)x;
   return jsonb_build_object('items',rows_json,'offset',offset_n,'hasMore',jsonb_array_length(rows_json)=25);
  elsif op='metrics' then
   return jsonb_build_object('pending',(select count(*) from public.edu_teacher_applications where school_id=s and status='pending'),'approved',(select count(*) from public.edu_teacher_applications where school_id=s and status='approved'),'rejected',(select count(*) from public.edu_teacher_applications where school_id=s and status='rejected'),'activeTeachers',(select count(distinct teacher_id) from public.edu_teacher_assignments where school_id=s and active),'openRequests',(select count(*) from public.edu_support_requests r where r.school_id=s and status<>'closed' and pedagogy.can_read_request(r.id)),'closedRequests',(select count(*) from public.edu_support_requests r where r.school_id=s and status='closed' and pedagogy.can_read_request(r.id)));
  elsif op='configure' then
   nm:=trim(b->>'name');
   if b->>'kind'='class' then insert into public.edu_classes(school_id,name) values(s,nm) on conflict(school_id,name) do update set active=true returning id into rid;
   elsif b->>'kind'='subject' then insert into public.edu_subjects(school_id,name) values(s,nm) on conflict(school_id,name) do update set active=true returning id into rid;
   elsif b->>'kind'='settings' then update public.edu_schools set support_contact=trim(coalesce(b->>'support_contact','')),coordination_enabled=coalesce((b->>'coordination_enabled')::boolean,false) where id=s returning id into rid;
   else raise exception 'Configuração inválida.';end if;
   insert into public.edu_audit_logs(actor_id,school_id,action,resource_id) values(u,s,'configure_'||(b->>'kind'),rid);return jsonb_build_object('id',rid);
  elsif op='enroll' then
   c:=(b->>'class_id')::uuid;if not exists(select 1 from public.edu_classes where id=c and school_id=s and active) then raise exception 'Turma inválida.';end if;
   select id into target from auth.users where lower(email)=lower(trim(b->>'email')) and email_confirmed_at is not null;
   if target is null then raise exception 'A conta do aluno precisa existir e ter e-mail confirmado.';end if;
   if b->>'active'='false' then update public.edu_memberships set active=false where student_id=target and class_id=c;
   else insert into public.edu_memberships(student_id,school_id,class_id) values(target,s,c) on conflict(student_id,class_id) do update set active=true;
   insert into public.user_roles(user_id,role) values(target,'student') on conflict do nothing;end if;
   insert into public.edu_audit_logs(actor_id,school_id,action,resource_id) values(u,s,'student_membership',target);return jsonb_build_object('ok',true);
  elsif op='members' then
   select coalesce(jsonb_agg(to_jsonb(x)),'[]') into rows_json from (select e.student_id,e.class_id,e.active,c.name class_name,p.display_name,au.email from public.edu_memberships e join public.edu_classes c on c.id=e.class_id join auth.users au on au.id=e.student_id left join public.edu_profiles p on p.id=e.student_id where e.school_id=s order by c.name,au.email limit 25 offset offset_n)x;return jsonb_build_object('items',rows_json,'hasMore',jsonb_array_length(rows_json)=25);
  elsif op='teachers' then
   select coalesce(jsonb_agg(to_jsonb(x)),'[]') into rows_json from (select t.teacher_id,p.display_name,bool_or(t.active) active,count(*) filter(where t.authorized) assignments,jsonb_agg(jsonb_build_object('class_id',t.class_id,'subject_id',t.subject_id,'active',t.active,'authorized',t.authorized)) links from public.edu_teacher_assignments t left join public.edu_profiles p on p.id=t.teacher_id where t.school_id=s group by t.teacher_id,p.display_name order by p.display_name,t.teacher_id limit 25 offset offset_n)x;return jsonb_build_object('items',rows_json,'hasMore',jsonb_array_length(rows_json)=25);
  elsif op='update_assignments' then
   target:=(b->>'teacher_id')::uuid;pairs:=b->'assignments';
   select * into a from public.edu_teacher_applications where user_id=target and school_id=s and status='approved' order by reviewed_at desc limit 1;
   if a.id is null or not exists(select 1 from public.user_roles where user_id=target and role='teacher') then raise exception 'O professor precisa ter uma aprovação institucional válida.';end if;
   if coalesce(jsonb_typeof(pairs),'null')<>'array' or jsonb_array_length(pairs) not between 1 and 100 then raise exception 'Selecione entre uma e cem atribuições.';end if;
   if exists(select 1 from jsonb_to_recordset(pairs)x(class_id uuid,subject_id uuid) where not exists(select 1 from public.edu_classes c where c.id=x.class_id and c.school_id=s and c.active) or not exists(select 1 from public.edu_subjects su where su.id=x.subject_id and su.school_id=s and su.active)) then raise exception 'Atribuição fora da instituição ou indisponível.';end if;
   update public.edu_teacher_assignments set active=false,authorized=false where teacher_id=target and school_id=s;
   insert into public.edu_teacher_assignments(teacher_id,school_id,class_id,subject_id,application_id) select target,s,x.class_id,x.subject_id,a.id from jsonb_to_recordset(pairs)x(class_id uuid,subject_id uuid) on conflict(teacher_id,class_id,subject_id)do update set active=true,authorized=true,application_id=excluded.application_id;
   for r in update public.edu_support_requests r set assigned_to=null,status='open',updated_at=now() where r.assigned_to=target and r.school_id=s and r.status<>'closed' and r.difficulty<>'sensitive' and not exists(select 1 from public.edu_teacher_assignments t where t.teacher_id=target and t.class_id=r.class_id and t.subject_id=r.subject_id and t.active) returning r.* loop perform pedagogy.notify_request(r,u,'status');perform pedagogy.notify_request(r,r.student_id,'request');end loop;
   insert into public.edu_audit_logs(actor_id,school_id,action,resource_id,details)values(u,s,'teacher_assignments',target,jsonb_build_object('count',jsonb_array_length(pairs)));return jsonb_build_object('ok',true);
  elsif op='teacher_access' then
   target:=(b->>'teacher_id')::uuid;
   update public.edu_teacher_assignments set active=authorized and coalesce((b->>'active')::boolean,false) where teacher_id=target and school_id=s;
   if not found then raise exception 'Professor sem vínculo nesta instituição.';end if;
   if b->>'active'<>'true' then for r in update public.edu_support_requests set assigned_to=null,status='open',updated_at=now() where school_id=s and assigned_to=target and status<>'closed' and difficulty<>'sensitive' returning * loop perform pedagogy.notify_request(r,u,'status');perform pedagogy.notify_request(r,r.student_id,'request');end loop;end if;
   insert into public.edu_audit_logs(actor_id,school_id,action,resource_id,details) values(u,s,'teacher_access',target,jsonb_build_object('active',b->>'active'));return jsonb_build_object('ok',true);
  end if;
 elsif op in ('approve','reject') then
  select * into a from public.edu_teacher_applications where id=(b->>'id')::uuid for update;
  if a.id is null or not pedagogy.is_admin(a.school_id) then raise exception 'Solicitação indisponível.' using errcode='42501';end if;
  if a.user_id=u then raise exception 'A própria solicitação precisa de outro administrador.';end if;
  if a.status<>'pending' then raise exception 'Esta solicitação já foi analisada.';end if;
  if op='approve' then
   if coalesce(b->>'confirmed','')<>'true' or not exists(select 1 from auth.users where id=a.user_id and email_confirmed_at is not null) then raise exception 'Confirme o vínculo institucional e o e-mail do solicitante.';end if;
   pairs:=b->'assignments';
   if pairs is null then
    select array_agg(distinct value::uuid) into cs from jsonb_array_elements_text(b->'class_ids');select array_agg(distinct value::uuid) into ss from jsonb_array_elements_text(b->'subject_ids');
    if coalesce(cardinality(cs),0)<>1 or coalesce(cardinality(ss),0)<>1 then raise exception 'Autorize cada combinação de turma e disciplina explicitamente.';end if;
    pairs:=jsonb_build_array(jsonb_build_object('class_id',cs[1],'subject_id',ss[1]));
   end if;
   if coalesce(jsonb_typeof(pairs),'null')<>'array' or jsonb_array_length(pairs) not between 1 and 100 then raise exception 'Selecione ao menos uma combinação de turma e disciplina.';end if;
   select array_agg(distinct x.class_id),array_agg(distinct x.subject_id) into cs,ss from jsonb_to_recordset(pairs)x(class_id uuid,subject_id uuid);
   if coalesce(cardinality(cs),0)=0 or coalesce(cardinality(ss),0)=0 or not(cs<@a.class_ids) or not(ss<@a.subject_ids) or (select count(*) from public.edu_classes where id=any(cs) and school_id=a.school_id and active)<>cardinality(cs) or (select count(*) from public.edu_subjects where id=any(ss) and school_id=a.school_id and active)<>cardinality(ss) then raise exception 'Valide as turmas e disciplinas da solicitação.';end if;
   insert into public.user_roles(user_id,role) values(a.user_id,'teacher') on conflict do nothing;
   insert into public.edu_profiles(id,display_name) values(a.user_id,a.full_name) on conflict(id) do update set display_name=excluded.display_name,updated_at=now();
   insert into public.edu_teacher_assignments(teacher_id,school_id,class_id,subject_id,application_id) select a.user_id,a.school_id,x.class_id,x.subject_id,a.id from jsonb_to_recordset(pairs)x(class_id uuid,subject_id uuid) on conflict(teacher_id,class_id,subject_id) do update set active=true,authorized=true,application_id=excluded.application_id;
  end if;
  update public.edu_teacher_applications set status=case when op='approve' then 'approved' else 'rejected' end,public_reason=case when op='reject' then left(trim(coalesce(b->>'reason','')),500) else '' end,reviewed_by=u,reviewed_at=now(),updated_at=now() where id=a.id;
  insert into public.edu_audit_logs(actor_id,school_id,action,resource_id,details) values(u,a.school_id,op,a.id,jsonb_build_object('status',op));
  insert into public.edu_notifications(user_id,kind,application_id) values(a.user_id,'review',a.id);return jsonb_build_object('ok',true);
 elsif op='directory' then
  c:=(b->>'class_id')::uuid;select school_id into s from public.edu_memberships where student_id=u and class_id=c and active;
  if s is null then raise exception 'Seu vínculo com essa turma precisa ser confirmado pela escola.' using errcode='42501';end if;
  return jsonb_build_object('subjects',coalesce((select jsonb_agg(jsonb_build_object('id',id,'name',name) order by name) from public.edu_subjects where school_id=s and active),'[]'),'teachers',coalesce((select jsonb_agg(to_jsonb(x)) from (select t.teacher_id,t.subject_id,coalesce(p.display_name,'Professor') name from public.edu_teacher_assignments t join public.user_roles ur on ur.user_id=t.teacher_id and ur.role='teacher' left join public.edu_profiles p on p.id=t.teacher_id where t.school_id=s and t.class_id=c and t.active)x),'[]'),'coordination',exists(select 1 from public.edu_schools sc where sc.id=s and active and coordination_enabled) and exists(select 1 from public.edu_admin_scopes ac join public.user_roles ur on ur.user_id=ac.user_id and ur.role='admin' where ac.school_id=s and ac.can_sensitive),'contact',(select support_contact from public.edu_schools where id=s));
 elsif op='create_request' then
  cid:=(b->>'client_id')::uuid;c:=(b->>'class_id')::uuid;sub:=(b->>'subject_id')::uuid;nm:=trim(b->>'title');content:=trim(b->>'description');d:=b->>'difficulty';
  if cid is null or nm is null or content is null or length(nm) not between 5 and 140 or length(content) not between 20 and 4000 or d is null or d not in ('content','activity','pace','organization','other','sensitive') then raise exception 'Preencha o assunto e descreva sua dificuldade (20 a 4000 caracteres).';end if;
  select * into r from public.edu_support_requests where student_id=u and client_id=cid;
  if r.id is not null then if r.class_id<>c or r.subject_id<>sub or r.title<>nm or r.description<>content or r.difficulty<>d then raise exception 'Este identificador já foi usado em outro pedido.';end if;return jsonb_build_object('id',r.id);end if;
  select e.school_id into s from public.edu_memberships e join public.edu_schools sc on sc.id=e.school_id and sc.active join public.edu_classes cl on cl.id=e.class_id and cl.active where e.student_id=u and e.class_id=c and e.active;
  if s is null or not exists(select 1 from public.edu_subjects where id=sub and school_id=s and active) then raise exception 'Turma ou disciplina não autorizada.' using errcode='42501';end if;
  if (select count(*) from public.edu_support_requests where student_id=u and created_at>now()-interval '1 day')>=10 then raise exception 'Você já enviou dez pedidos hoje. Continue nos atendimentos existentes.';end if;
  if d<>'sensitive' and content ~* '(suic[ií]d|automutil|ass[eé]dio|abuso sexual|me matar)' then raise exception 'Para este assunto, escolha atendimento reservado à coordenação. Em risco imediato, procure diretamente um adulto de confiança.';end if;
  chosen:=nullif(b->>'teacher_id','')::uuid;
  if d='sensitive' then
   if not exists(select 1 from public.edu_schools where id=s and coordination_enabled) or not exists(select 1 from public.edu_admin_scopes ac join public.user_roles ur on ur.user_id=ac.user_id and ur.role='admin' where ac.school_id=s and ac.can_sensitive) then raise exception 'O canal reservado não está configurado. Procure diretamente a coordenação ou um adulto de confiança.';end if;
   chosen:=null;
  else
   if chosen is not null and not exists(select 1 from public.edu_teacher_assignments t join public.user_roles ur on ur.user_id=t.teacher_id and ur.role='teacher' where t.teacher_id=chosen and t.class_id=c and t.subject_id=sub and t.school_id=s and t.active) then raise exception 'Professor não autorizado para esta turma e disciplina.';end if;
   if not exists(select 1 from public.edu_teacher_assignments t join public.user_roles ur on ur.user_id=t.teacher_id and ur.role='teacher' where t.class_id=c and t.subject_id=sub and t.school_id=s and t.active) then raise exception 'Não há professor disponível nesta disciplina. Consulte o contato da coordenação.';end if;
  end if;
  insert into public.edu_profiles(id,display_name) values(u,'Estudante') on conflict do nothing;
  insert into public.edu_support_requests(student_id,school_id,class_id,subject_id,assigned_to,title,description,difficulty,client_id) values(u,s,c,sub,chosen,nm,content,d,cid) returning * into r;
  insert into public.edu_support_messages(request_id,sender_id,body,client_id) values(r.id,u,content,cid);
  perform pedagogy.notify_request(r,u,'request');return jsonb_build_object('id',r.id);
 elsif op='requests' then
  select coalesce(jsonb_agg(to_jsonb(x)),'[]') into rows_json from (select r.id,r.school_id,r.class_id,r.subject_id,r.student_id,r.assigned_to,r.title,r.difficulty,r.status,r.created_at,r.updated_at,(select left(sm.body,160) from public.edu_support_messages sm where sm.request_id=r.id order by sm.created_at desc,sm.id desc limit 1) last_reply,c.name class_name,su.name subject_name,coalesce(p.display_name,'Estudante') student_name,coalesce(tp.display_name,'Fila autorizada') teacher_name from public.edu_support_requests r join public.edu_classes c on c.id=r.class_id join public.edu_subjects su on su.id=r.subject_id left join public.edu_profiles p on p.id=r.student_id left join public.edu_profiles tp on tp.id=r.assigned_to where pedagogy.can_read_request(r.id) and (coalesce(b->>'school_id','')='' or r.school_id=(b->>'school_id')::uuid) and (coalesce(b->>'class_id','')='' or r.class_id=(b->>'class_id')::uuid) and (coalesce(b->>'subject_id','')='' or r.subject_id=(b->>'subject_id')::uuid) and (coalesce(b->>'status','')='' or r.status=b->>'status') and (coalesce(b->>'mine','')<>'true' or r.assigned_to=u or r.student_id=u) and (coalesce(b->>'since','')='' or r.created_at>=(b->>'since')::date) order by r.updated_at desc,r.id limit 25 offset offset_n)x;
  return jsonb_build_object('items',rows_json,'offset',offset_n,'hasMore',jsonb_array_length(rows_json)=25);
 elsif op in ('thread','claim','message','status','assign','eligible_teachers') then
  rid:=(b->>'id')::uuid;
  if not pedagogy.can_read_request(rid) then raise exception 'Atendimento indisponível.' using errcode='42501';end if;
  select * into r from public.edu_support_requests where id=rid for update;
  if op='eligible_teachers' then
   if not pedagogy.is_admin(r.school_id) or r.difficulty='sensitive' then raise exception 'Atribuição não autorizada.' using errcode='42501';end if;
   return jsonb_build_object('items',coalesce((select jsonb_agg(jsonb_build_object('id',a.teacher_id,'name',coalesce(p.display_name,'Professor'))) from public.edu_teacher_assignments a join public.user_roles ur on ur.user_id=a.teacher_id and ur.role='teacher' left join public.edu_profiles p on p.id=a.teacher_id where a.active and a.school_id=r.school_id and a.class_id=r.class_id and a.subject_id=r.subject_id),'[]'));
  elsif op='thread' then
   last_id:=nullif(b->>'before','')::uuid;
   select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at,x.id),'[]') into msg_json from (select m.id,m.sender_id,m.body,m.created_at,coalesce(p.display_name,'Participante') sender_name from public.edu_support_messages m left join public.edu_profiles p on p.id=m.sender_id where m.request_id=rid and (last_id is null or (m.created_at,m.id)<(select created_at,id from public.edu_support_messages where id=last_id and request_id=rid)) order by m.created_at desc,m.id desc limit 50)x;
   return jsonb_build_object('request',to_jsonb(r),'messages',msg_json,'hasOlder',jsonb_array_length(msg_json)=50,'canReply',r.status<>'closed' and (r.student_id=u and exists(select 1 from public.edu_memberships where student_id=u and class_id=r.class_id and active) or r.assigned_to=u and (pedagogy.is_teacher(r.school_id,r.class_id,r.subject_id) or pedagogy.is_admin(r.school_id,r.difficulty='sensitive'))));
  end if;
  if op='message' then
   cid:=(b->>'client_id')::uuid;content:=trim(b->>'body');
   select * into m from public.edu_support_messages where sender_id=u and client_id=cid;
   if m.id is not null then if m.request_id<>rid or m.body<>content then raise exception 'Identificador de mensagem já utilizado.';end if;return jsonb_build_object('id',m.id);end if;
   if r.status='closed' or not(r.student_id=u and exists(select 1 from public.edu_memberships where student_id=u and class_id=r.class_id and active) or r.assigned_to=u and (pedagogy.is_teacher(r.school_id,r.class_id,r.subject_id) or pedagogy.is_admin(r.school_id,r.difficulty='sensitive'))) then raise exception 'Assuma o atendimento antes de responder, ou solicite nova autorização.' using errcode='42501';end if;
   if r.difficulty<>'sensitive' and content ~* '(suic[ií]d|automutil|ass[eé]dio|abuso sexual|me matar)' then raise exception 'Este assunto exige um atendimento reservado à coordenação. Em risco imediato, procure um adulto de confiança.';end if;
   if cid is null or content is null or length(content) not between 1 and 4000 then raise exception 'Escreva uma mensagem de até 4000 caracteres.';end if;
   if (select count(*) from public.edu_support_messages where sender_id=u and created_at>now()-interval '1 hour')>=120 then raise exception 'Limite de mensagens atingido. Aguarde um pouco.';end if;
   insert into public.edu_support_messages(request_id,sender_id,body,client_id) values(rid,u,content,cid) returning id into chosen;
   update public.edu_support_requests set status=case when u=student_id then case when assigned_to is null then 'open' else 'in_progress' end else 'answered' end,updated_at=now() where id=rid returning * into r;
   perform pedagogy.notify_request(r,u,'message');return jsonb_build_object('id',chosen);
  elsif op='claim' then
   if r.student_id=u or r.status='closed' or r.assigned_to is not null and r.assigned_to<>u then raise exception 'Atendimento indisponível para assumir.';end if;
   if r.assigned_to=u then return jsonb_build_object('ok',true);end if;
   update public.edu_support_requests set assigned_to=u,status='in_progress',updated_at=now() where id=rid returning * into r;
  elsif op='assign' then
   if not pedagogy.is_admin(r.school_id) or r.difficulty='sensitive' then raise exception 'Reatribuição não autorizada.' using errcode='42501';end if;
   target:=(b->>'teacher_id')::uuid;
   if not exists(select 1 from public.edu_teacher_assignments a join public.user_roles ur on ur.user_id=a.teacher_id and ur.role='teacher' where a.teacher_id=target and a.school_id=r.school_id and a.class_id=r.class_id and a.subject_id=r.subject_id and a.active) then raise exception 'Professor sem autorização para este atendimento.';end if;
   update public.edu_support_requests set assigned_to=target,status='in_progress',updated_at=now() where id=rid returning * into r;
  elsif op='status' then
   if b->>'status'<>'closed' or not(r.student_id=u or r.assigned_to=u or pedagogy.is_admin(r.school_id,r.difficulty='sensitive')) then raise exception 'Alteração de status não autorizada.' using errcode='42501';end if;
   if r.status='closed' then return jsonb_build_object('ok',true);end if;
   update public.edu_support_requests set status='closed',updated_at=now() where id=rid returning * into r;
  end if;
  insert into public.edu_audit_logs(actor_id,school_id,action,resource_id) values(u,r.school_id,op,rid);
  perform pedagogy.notify_request(r,u,'status');return jsonb_build_object('ok',true);
 elsif op='teacher_metrics' then
  if not exists(select 1 from public.edu_teacher_assignments a join public.user_roles ur on ur.user_id=a.teacher_id and ur.role='teacher' where a.teacher_id=u and a.active and exists(select 1 from public.edu_schools sc where sc.id=a.school_id and sc.active)) then raise exception 'Acesso de professor não autorizado.' using errcode='42501';end if;
  return (select jsonb_build_object('waiting',count(*) filter(where status='open'),'inProgress',count(*) filter(where status='in_progress'),'answered',count(*) filter(where status='answered'),'closed',count(*) filter(where status='closed')) from public.edu_support_requests r where pedagogy.can_read_request(r.id));
 elsif op='notifications' then
  select coalesce(jsonb_agg(to_jsonb(x)),'[]') into rows_json from (select id,kind,request_id,application_id,read_at,created_at from public.edu_notifications where user_id=u order by created_at desc,id limit 25 offset offset_n)x;
  return jsonb_build_object('items',rows_json,'hasMore',jsonb_array_length(rows_json)=25,'unread',(select count(*) from public.edu_notifications where user_id=u and read_at is null));
 elsif op='read_notification' then
  update public.edu_notifications set read_at=coalesce(read_at,now()) where id=(b->>'id')::uuid and user_id=u;return jsonb_build_object('ok',true);
 else raise exception 'Operação desconhecida.';
 end if;
 raise exception 'Não foi possível concluir a operação.';
end$$;
create or replace function public.pedagogy_action(p_op text,p_body jsonb default '{}') returns jsonb language sql security invoker set search_path='' as $$select pedagogy.action(p_op,p_body)$$;
-- No authentication context or role argument can be supplied by a caller.
revoke all on all functions in schema pedagogy from public,anon,authenticated;
grant usage on schema pedagogy to anon;
grant execute on function pedagogy.catalog() to anon,authenticated;
grant execute on function pedagogy.session_ok(),pedagogy.is_admin(uuid,boolean),pedagogy.is_teacher(uuid,uuid,uuid),pedagogy.can_read_request(uuid),pedagogy.in_school(uuid),pedagogy.action(text,jsonb) to authenticated;
revoke all on function public.pedagogy_action(text,jsonb) from public,anon;
grant execute on function public.pedagogy_action(text,jsonb) to authenticated;
revoke all on function public.pedagogy_catalog() from public;
grant execute on function public.pedagogy_catalog() to anon,authenticated;
do $$begin
 if exists(select 1 from pg_publication where pubname='supabase_realtime') and not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='edu_notifications') then alter publication supabase_realtime add table public.edu_notifications;end if;
end$$;
-- Retention is opt-in by the database owner after the institution validates its
-- policy. No cron or deletion is activated by this additive migration.
create or replace function pedagogy.purge_expired_support() returns integer language plpgsql security definer set search_path='' as $$declare n integer;begin
 delete from public.edu_support_requests r using public.edu_schools s where r.school_id=s.id and r.status='closed' and r.updated_at<now()-s.retention_days*interval '1 day';get diagnostics n=row_count;return n;
end$$;
revoke all on function pedagogy.purge_expired_support() from public,anon,authenticated;
commit;
