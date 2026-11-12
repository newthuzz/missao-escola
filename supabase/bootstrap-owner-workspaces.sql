-- Trusted owner operation, authorized for the existing Colégio Pitagoras admin.
-- Does not create roles, student enrollments or teacher assignments.
begin;
do $$
declare selected_user uuid;total_admins integer;current_owner uuid;school_uuid uuid;
begin
 select count(*),min(r.user_id::text)::uuid into total_admins,selected_user from public.user_roles r join auth.users u on u.id=r.user_id where r.role='admin' and u.email_confirmed_at is not null;
 if total_admins<>1 then raise exception 'Confirme a identidade: deve existir exatamente um administrador com e-mail confirmado.';end if;
 select s.id into strict school_uuid from public.edu_schools s join public.edu_admin_scopes a on a.school_id=s.id where s.name='Colégio Pitagoras' and a.user_id=selected_user and s.active;
 select user_id into current_owner from public.edu_workspace_owners where singleton;
 if current_owner is not null and current_owner<>selected_user then raise exception 'Já existe outra conta proprietária. Nenhuma permissão foi alterada.';end if;
 insert into public.edu_workspace_owners(user_id) values(selected_user) on conflict(singleton) do nothing;
 if found then insert into public.edu_audit_logs(actor_id,school_id,action,resource_id)values(selected_user,school_uuid,'owner_workspaces_enabled',selected_user);end if;
end$$;
commit;
