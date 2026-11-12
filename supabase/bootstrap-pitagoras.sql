-- Execute only as the trusted database owner after installing the migration.
-- No password or key is stored here. This uses the single EXISTING, confirmed
-- administrator, as authorized for Colégio Pitagoras. It never promotes a user
-- chosen by a browser or by signup metadata. Reapplication preserves scopes.
begin;
do $$
declare admin_id uuid;school_id uuid;admin_count integer;school_count integer;
begin
 select count(*),min(r.user_id::text)::uuid into admin_count,admin_id from public.user_roles r join auth.users u on u.id=r.user_id where r.role='admin' and u.email_confirmed_at is not null;
 if admin_count<>1 then raise exception 'É necessário selecionar explicitamente um administrador confirmado: foram encontrados %.',admin_count;end if;
 select count(*),min(id::text)::uuid into school_count,school_id from public.edu_schools where name='Colégio Pitagoras';
 if school_count>1 then raise exception 'Existem instituições homônimas. Confirme o identificador correto antes de criar o vínculo.';end if;
 if school_id is null then insert into public.edu_schools(name)values('Colégio Pitagoras')returning id into school_id;end if;
 insert into public.edu_admin_scopes(user_id,school_id,can_sensitive)values(admin_id,school_id,true)on conflict(user_id,school_id)do nothing;
 if found then insert into public.edu_audit_logs(actor_id,school_id,action,resource_id)values(admin_id,school_id,'owner_bootstrap',school_id);end if;
end$$;
commit;
