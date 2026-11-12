-- One explicit owner may use all three workspaces. Institutional admin status
-- alone never enables this capability. No identity is accepted from a client.
begin;
create table if not exists public.edu_workspace_owners(
 singleton boolean primary key default true check(singleton),
 user_id uuid not null unique references auth.users(id) on delete cascade,
 created_at timestamptz not null default now()
);
alter table public.edu_workspace_owners enable row level security;
revoke all on public.edu_workspace_owners from anon,authenticated;
grant select on public.edu_workspace_owners to authenticated;
drop policy if exists edu_workspace_owner_read on public.edu_workspace_owners;
create policy edu_workspace_owner_read on public.edu_workspace_owners for select to authenticated using(user_id=(select auth.uid()) and (select pedagogy.session_ok()));
create or replace function pedagogy.is_workspace_owner() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.edu_workspace_owners o join public.user_roles r on r.user_id=o.user_id and r.role='admin' where o.user_id=(select auth.uid()) and exists(select 1 from public.edu_admin_scopes s where s.user_id=o.user_id and pedagogy.is_admin(s.school_id)))
$$;
create or replace function pedagogy.workspace_action(op text,b jsonb default '{}') returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();result jsonb; rid uuid; mode text; offset_n integer:=greatest(0,least(10000,coalesce((b->>'offset')::integer,0)));rows_json jsonb;
begin
 if auth.uid() is null or not pedagogy.session_ok() then raise exception 'Entre em uma conta com e-mail confirmado.' using errcode='42501';end if;
 if b is null or jsonb_typeof(b)<>'object' then raise exception 'Dados inválidos.';end if;
 if op='context' then
  result:=pedagogy.action(op,b);
  return result||jsonb_build_object('canSwitchWorkspace',pedagogy.is_workspace_owner());
 elsif op='switch_workspace' then
  mode:=b->>'workspace';
  if not pedagogy.is_workspace_owner() then raise exception 'A alternância de ambientes é exclusiva da conta proprietária autorizada.' using errcode='42501';end if;
  if mode is null or mode not in ('admin','teacher','student') then raise exception 'Ambiente inválido.';end if;
  return jsonb_build_object('workspace',mode,'canSwitchWorkspace',true);
 elsif op='teacher_metrics' and pedagogy.is_workspace_owner() then
  return (select jsonb_build_object('waiting',count(*) filter(where status='open'),'inProgress',count(*) filter(where status='in_progress'),'answered',count(*) filter(where status='answered'),'closed',count(*) filter(where status='closed')) from public.edu_support_requests r where r.difficulty<>'sensitive' and pedagogy.can_read_request(r.id));
 elsif op='requests' and b->>'workspace'='teacher' and pedagogy.is_workspace_owner() then
  select coalesce(jsonb_agg(to_jsonb(x)),'[]') into rows_json from (select r.id,r.school_id,r.class_id,r.subject_id,r.student_id,r.assigned_to,r.title,r.difficulty,r.status,r.created_at,r.updated_at,(select left(sm.body,160) from public.edu_support_messages sm where sm.request_id=r.id order by sm.created_at desc,sm.id desc limit 1) last_reply,c.name class_name,su.name subject_name,coalesce(p.display_name,'Estudante') student_name,coalesce(tp.display_name,'Fila autorizada') teacher_name from public.edu_support_requests r join public.edu_classes c on c.id=r.class_id join public.edu_subjects su on su.id=r.subject_id left join public.edu_profiles p on p.id=r.student_id left join public.edu_profiles tp on tp.id=r.assigned_to where r.difficulty<>'sensitive' and pedagogy.can_read_request(r.id) and (coalesce(b->>'school_id','')='' or r.school_id=(b->>'school_id')::uuid) and (coalesce(b->>'class_id','')='' or r.class_id=(b->>'class_id')::uuid) and (coalesce(b->>'subject_id','')='' or r.subject_id=(b->>'subject_id')::uuid) and (coalesce(b->>'status','')='' or r.status=b->>'status') and (coalesce(b->>'mine','')<>'true' or r.assigned_to=u or r.student_id=u) and (coalesce(b->>'since','')='' or r.created_at>=(b->>'since')::date) order by r.updated_at desc,r.id limit 25 offset offset_n)x;
  return jsonb_build_object('items',rows_json,'offset',offset_n,'hasMore',jsonb_array_length(rows_json)=25);
 end if;
 -- Reserved coordination cases stay in the administrative workspace.
 if b->>'workspace'='teacher' and pedagogy.is_workspace_owner() and op in ('thread','claim','message','status','assign','eligible_teachers') and exists(select 1 from public.edu_support_requests where id=(b->>'id')::uuid and difficulty='sensitive') then raise exception 'Abra o ambiente administrativo para acessar este atendimento reservado.' using errcode='42501';end if;
 return pedagogy.action(op,b);
end$$;
create or replace function public.pedagogy_action(p_op text,p_body jsonb default '{}') returns jsonb language sql security invoker set search_path='' as $$select pedagogy.workspace_action(p_op,p_body)$$;
revoke all on function pedagogy.is_workspace_owner(),pedagogy.workspace_action(text,jsonb) from public,anon,authenticated;
grant execute on function pedagogy.workspace_action(text,jsonb) to authenticated;
revoke all on function public.pedagogy_action(text,jsonb) from public,anon;
grant execute on function public.pedagogy_action(text,jsonb) to authenticated;
commit;
