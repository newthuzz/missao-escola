-- Authorized repair: register the existing owner as a real teacher in schools
-- they already administer. No user, school, class or subject is invented.
begin;
do $$
declare chosen uuid;mail text;nm text;school_uuid uuid;pairs jsonb;rid uuid;
begin
 select o.user_id,lower(u.email),coalesce(nullif(btrim(p.display_name),''),nullif(btrim(u.raw_user_meta_data->>'full_name'),''),'Professor administrador') into strict chosen,mail,nm from public.edu_workspace_owners o join auth.users u on u.id=o.user_id and u.email_confirmed_at is not null join public.user_roles ur on ur.user_id=o.user_id and ur.role='admin' left join public.edu_profiles p on p.id=o.user_id;
 nm:=left(nm,120);if length(nm)<2 then nm:='Professor administrador';end if;
 insert into public.user_roles(user_id,role)values(chosen,'teacher')on conflict do nothing;
 for school_uuid in select a.school_id from public.edu_admin_scopes a join public.edu_schools s on s.id=a.school_id and s.active where a.user_id=chosen loop
  pairs:='[]';
  -- An unambiguous, already configured class/subject pair can be activated.
  -- Otherwise the owner remains listed and chooses assignments in the UI.
  if (select count(*) from public.edu_classes where school_id=school_uuid and active)=1 and (select count(*) from public.edu_subjects where school_id=school_uuid and active)=1 then
   select jsonb_build_array(jsonb_build_object('class_id',c.id,'subject_id',su.id)) into pairs from public.edu_classes c cross join public.edu_subjects su where c.school_id=school_uuid and c.active and su.school_id=school_uuid and su.active;
  end if;
  insert into public.edu_teacher_registrations(school_id,email,display_name,assignments,user_id,registered_by,state,client_id)values(school_uuid,mail,nm,pairs,chosen,chosen,case when pairs='[]' then 'active' else 'pending' end,gen_random_uuid())on conflict(school_id,email)do nothing returning id into rid;
  if rid is not null then
   if pairs<>'[]' and not pedagogy.activate_teacher_registration(rid,chosen) then raise exception 'Não foi possível validar a atribuição docente existente.';end if;
   insert into public.edu_audit_logs(actor_id,school_id,action,resource_id)values(chosen,school_uuid,'owner_teacher_registration',rid);
  end if;
 end loop;
end$$;
commit;
