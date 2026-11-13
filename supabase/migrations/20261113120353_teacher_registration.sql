-- Real school-level teacher registration, including verified-email activation.
-- No password or privileged Auth key is accepted or stored by these functions.
begin;
create table if not exists public.edu_teacher_registrations(
 id uuid primary key default gen_random_uuid(),school_id uuid not null references public.edu_schools on delete cascade,
 email text not null check(length(email) between 3 and 254 and email=lower(btrim(email))),
 display_name text not null check(length(display_name) between 2 and 120),
 assignments jsonb not null default '[]' check(jsonb_typeof(assignments)='array'),
 user_id uuid references auth.users on delete set null,registered_by uuid references auth.users on delete set null,
 state text not null default 'pending' check(state in ('pending','active','cancelled')),active boolean not null default true,
 client_id uuid not null,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 unique(school_id,email),unique(registered_by,client_id)
);
create index if not exists edu_teacher_registrations_user on public.edu_teacher_registrations(user_id,school_id);
create index if not exists edu_teacher_registrations_email on public.edu_teacher_registrations(email,state);
create index if not exists edu_teacher_registrations_pending on public.edu_teacher_registrations(email) where state='pending' and active;
alter table public.edu_teacher_registrations enable row level security;
revoke all on public.edu_teacher_registrations from anon,authenticated;
grant select on public.edu_teacher_registrations to authenticated;
drop policy if exists edu_teacher_registration_read on public.edu_teacher_registrations;
create policy edu_teacher_registration_read on public.edu_teacher_registrations for select to authenticated using((select pedagogy.session_ok()) and (user_id=(select auth.uid()) or pedagogy.is_admin(school_id)));
create or replace function pedagogy.teacher_pairs_valid(s uuid,p jsonb) returns boolean language sql stable security invoker set search_path='' as $$
 select case when coalesce(jsonb_typeof(p),'null')<>'array' then false else jsonb_array_length(p) between 1 and 100 and exists(select 1 from public.edu_schools where id=s and active) and not exists(select 1 from jsonb_to_recordset(p)x(class_id uuid,subject_id uuid) where not exists(select 1 from public.edu_classes c where c.id=x.class_id and c.school_id=s and c.active) or not exists(select 1 from public.edu_subjects su where su.id=x.subject_id and su.school_id=s and su.active)) end
$$;
create or replace function pedagogy.activate_teacher_registration(registration_uuid uuid,target uuid,replace_links boolean default false) returns boolean language plpgsql security invoker set search_path='' as $$
declare reg public.edu_teacher_registrations;app_uuid uuid;cs uuid[];ss uuid[];
begin
 select * into reg from public.edu_teacher_registrations where id=registration_uuid for update;
 if reg.id is null or not reg.active or reg.state='cancelled' or not exists(select 1 from auth.users where id=target and email_confirmed_at is not null and lower(email)=reg.email) or not pedagogy.teacher_pairs_valid(reg.school_id,reg.assignments) then return false;end if;
 if not exists(select 1 from public.edu_admin_scopes a join public.user_roles ur on ur.user_id=a.user_id and ur.role='admin' join auth.users u on u.id=a.user_id and u.email_confirmed_at is not null where a.user_id=reg.registered_by and a.school_id=reg.school_id) then return false;end if;
 if reg.registered_by=target and not exists(select 1 from public.edu_workspace_owners where user_id=target) then return false;end if;
 if reg.state='active' and not exists(select 1 from public.user_roles where user_id=target and role='teacher') then return false;end if;
 select array_agg(distinct x.class_id),array_agg(distinct x.subject_id) into cs,ss from jsonb_to_recordset(reg.assignments)x(class_id uuid,subject_id uuid);
 select id into app_uuid from public.edu_teacher_applications where user_id=target and school_id=reg.school_id and status in ('approved','pending') order by case when status='approved' then 0 else 1 end,created_at desc limit 1 for update;
 if app_uuid is null then
  insert into public.edu_teacher_applications(user_id,school_id,full_name,class_ids,subject_ids,notes,status,reviewed_by,reviewed_at)values(target,reg.school_id,reg.display_name,cs,ss,'Cadastro autorizado pela administração.','approved',reg.registered_by,now())returning id into app_uuid;
 else
  update public.edu_teacher_applications set status='approved',full_name=reg.display_name,class_ids=cs,subject_ids=ss,reviewed_by=reg.registered_by,reviewed_at=now(),public_reason='',updated_at=now() where id=app_uuid;
 end if;
 insert into public.user_roles(user_id,role)values(target,'teacher')on conflict do nothing;
 insert into public.edu_profiles(id,display_name)values(target,reg.display_name)on conflict(id)do nothing;
 if replace_links then
  perform pedagogy.action('update_assignments',jsonb_build_object('school_id',reg.school_id,'teacher_id',target,'assignments',reg.assignments));
 else
  insert into public.edu_teacher_assignments(teacher_id,school_id,class_id,subject_id,application_id)select distinct target,reg.school_id,x.class_id,x.subject_id,app_uuid from jsonb_to_recordset(reg.assignments)x(class_id uuid,subject_id uuid)on conflict(teacher_id,class_id,subject_id)do update set active=true,authorized=true,application_id=excluded.application_id;
 end if;
 update public.edu_teacher_registrations set user_id=target,state='active',updated_at=now() where id=reg.id;
 if reg.state='pending' then insert into public.edu_notifications(user_id,kind,application_id)values(target,'review',app_uuid);end if;
 return true;
end$$;
create or replace function pedagogy.teacher_action(op text,b jsonb default '{}') returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid();s uuid;target uuid;rid uuid;cid uuid;mail text;nm text;pairs jsonb;reg public.edu_teacher_registrations;ctx jsonb;rows_json jsonb;offset_n integer:=greatest(0,least(10000,coalesce((b->>'offset')::integer,0)));
begin
 if actor is null or not pedagogy.session_ok() then raise exception 'Entre em uma conta com e-mail confirmado.' using errcode='42501';end if;
 if b is null or jsonb_typeof(b)<>'object' then raise exception 'Dados inválidos.';end if;
 perform pg_advisory_xact_lock(hashtextextended(actor::text,44));
 if op='context' then
  select lower(email) into mail from auth.users where id=actor;
  for rid in select id from public.edu_teacher_registrations where email=mail and state='pending' and active order by id loop perform pedagogy.activate_teacher_registration(rid,actor);end loop;
  ctx:=pedagogy.workspace_action(op,b);
  return ctx||jsonb_build_object('teacherRegistrations',coalesce((select jsonb_agg(jsonb_build_object('school_name',sc.name,'state',r.state,'active',r.active)) from public.edu_teacher_registrations r join public.edu_schools sc on sc.id=r.school_id where r.email=mail and r.state<>'cancelled'),'[]'));
 end if;
 if op in ('teachers','register_teacher','cancel_teacher_registration','update_assignments','teacher_access') then
  s:=(b->>'school_id')::uuid;if not pedagogy.is_admin(s) then raise exception 'Acesso institucional não autorizado.' using errcode='42501';end if;
  if op='teachers' then
   with people as (select teacher_id uid from public.edu_teacher_assignments where school_id=s union select user_id from public.edu_teacher_registrations where school_id=s and state='active' and user_id is not null),listed as (
    select u.id teacher_id,r.id registration_id,coalesce(p.display_name,r.display_name,'Professor') display_name,u.email,
     exists(select 1 from public.user_roles where user_id=u.id and role='teacher') and coalesce(r.active,true) and (exists(select 1 from public.edu_teacher_assignments t where t.teacher_id=u.id and t.school_id=s and t.active) or r.user_id is not null and not exists(select 1 from public.edu_teacher_assignments t where t.teacher_id=u.id and t.school_id=s and t.authorized)) active,
     'active'::text state,(select count(*) from public.edu_teacher_assignments t where t.teacher_id=u.id and t.school_id=s and t.authorized) assignments,
     coalesce((select jsonb_agg(jsonb_build_object('class_id',t.class_id,'subject_id',t.subject_id,'active',t.active,'authorized',t.authorized)) from public.edu_teacher_assignments t where t.teacher_id=u.id and t.school_id=s),'[]') links
    from people q join auth.users u on u.id=q.uid left join public.edu_profiles p on p.id=u.id left join public.edu_teacher_registrations r on r.user_id=u.id and r.school_id=s and r.state='active'
    union all select null,r.id,r.display_name,r.email,false,'pending',jsonb_array_length(r.assignments)::bigint,r.assignments from public.edu_teacher_registrations r where r.school_id=s and r.state='pending' and r.active
   ) select coalesce(jsonb_agg(to_jsonb(x)),'[]') into rows_json from (select * from listed order by display_name,email limit 25 offset offset_n)x;
   return jsonb_build_object('items',rows_json,'hasMore',jsonb_array_length(rows_json)=25);
  elsif op='register_teacher' then
   cid:=(b->>'client_id')::uuid;mail:=lower(btrim(b->>'email'));nm:=btrim(b->>'display_name');pairs:=b->'assignments';
   if coalesce(b->>'confirmed','')<>'true' or cid is null or mail is null or length(mail)>254 or mail!~'^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' or nm is null or length(nm) not between 2 and 120 or not pedagogy.teacher_pairs_valid(s,pairs) then raise exception 'Confira nome, e-mail, turmas e disciplinas e confirme o vínculo do professor.';end if;
   select * into reg from public.edu_teacher_registrations where registered_by=actor and client_id=cid;
   if reg.id is not null then
    if reg.school_id<>s or reg.email<>mail or reg.display_name<>nm or reg.assignments<>pairs then raise exception 'Este identificador já foi usado em outro cadastro.';end if;
    return jsonb_build_object('id',reg.id,'state',reg.state);
   end if;
   perform pg_advisory_xact_lock(hashtextextended(s::text||mail,902));
   select id into target from auth.users where lower(email)=mail and email_confirmed_at is not null;
   if target=actor and not pedagogy.is_workspace_owner() then raise exception 'Seu próprio vínculo docente precisa ser confirmado por outro administrador.' using errcode='42501';end if;
   select * into reg from public.edu_teacher_registrations where school_id=s and email=mail for update;
   if reg.id is not null and reg.state<>'cancelled' or exists(select 1 from public.edu_teacher_assignments where teacher_id=target and school_id=s) then raise exception 'Este professor já está cadastrado nesta escola. Use Editar atribuições ou Reativar acesso.' using errcode='23505';end if;
   if reg.id is null then
    insert into public.edu_teacher_registrations(school_id,email,display_name,assignments,registered_by,client_id)values(s,mail,nm,pairs,actor,cid)returning id into rid;
   else
    update public.edu_teacher_registrations set display_name=nm,assignments=pairs,registered_by=actor,client_id=cid,user_id=null,state='pending',active=true,updated_at=now() where id=reg.id returning id into rid;
   end if;
   if target is not null and not pedagogy.activate_teacher_registration(rid,target) then raise exception 'Não foi possível validar o vínculo docente. Confira as atribuições da escola.';end if;
   insert into public.edu_audit_logs(actor_id,school_id,action,resource_id)values(actor,s,'register_teacher',rid);
   return(select jsonb_build_object('id',id,'state',state) from public.edu_teacher_registrations where id=rid);
  elsif op='cancel_teacher_registration' then
   update public.edu_teacher_registrations set active=false,state='cancelled',updated_at=now() where id=(b->>'registration_id')::uuid and school_id=s and state='pending' returning id into rid;
   if rid is null then raise exception 'Cadastro pendente indisponível.';end if;
   insert into public.edu_audit_logs(actor_id,school_id,action,resource_id)values(actor,s,'cancel_teacher_registration',rid);return jsonb_build_object('ok',true);
  elsif op='update_assignments' then
   target:=(b->>'teacher_id')::uuid;pairs:=b->'assignments';
   select * into reg from public.edu_teacher_registrations where school_id=s and user_id=target and state='active' for update;
   if reg.id is not null then
    if not pedagogy.teacher_pairs_valid(s,pairs) then raise exception 'Selecione turmas e disciplinas válidas desta escola.';end if;
    if target=actor and not pedagogy.is_workspace_owner() then raise exception 'Seu próprio vínculo precisa ser confirmado por outro administrador.' using errcode='42501';end if;
    update public.edu_teacher_registrations set assignments=pairs,registered_by=actor,active=true,updated_at=now() where id=reg.id;
    if not pedagogy.activate_teacher_registration(reg.id,target,true) then raise exception 'O professor precisa ter conta confirmada e vínculo docente válido.';end if;
    return jsonb_build_object('ok',true);
   end if;
  elsif op='teacher_access' then
   target:=(b->>'teacher_id')::uuid;
   if b->>'active'='true' and not exists(select 1 from public.user_roles where user_id=target and role='teacher') then raise exception 'A autorização docente desta conta foi revogada. O vínculo precisa ser revisado antes da reativação.' using errcode='42501';end if;
   if exists(select 1 from public.edu_teacher_assignments where teacher_id=target and school_id=s) then
    ctx:=pedagogy.workspace_action(op,b);
   elsif not exists(select 1 from public.edu_teacher_registrations where school_id=s and user_id=target and state='active') then raise exception 'Professor sem vínculo nesta instituição.';
   else insert into public.edu_audit_logs(actor_id,school_id,action,resource_id)values(actor,s,'teacher_access',target);ctx:=jsonb_build_object('ok',true);
   end if;
   update public.edu_teacher_registrations set active=coalesce((b->>'active')::boolean,false),updated_at=now() where school_id=s and user_id=target and state='active';return ctx;
  end if;
 end if;
 if op='create_school' then return pedagogy.create_school(b);end if;
 return pedagogy.workspace_action(op,b);
end$$;
create or replace function public.pedagogy_action(p_op text,p_body jsonb default '{}') returns jsonb language sql security invoker set search_path='' as $$select pedagogy.teacher_action(p_op,p_body)$$;
revoke all on function pedagogy.teacher_pairs_valid(uuid,jsonb),pedagogy.activate_teacher_registration(uuid,uuid,boolean),pedagogy.teacher_action(text,jsonb) from public,anon,authenticated;
grant execute on function pedagogy.teacher_action(text,jsonb) to authenticated;
revoke all on function public.pedagogy_action(text,jsonb) from public,anon;
grant execute on function public.pedagogy_action(text,jsonb) to authenticated;
commit;
