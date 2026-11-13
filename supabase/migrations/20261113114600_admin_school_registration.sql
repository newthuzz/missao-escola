-- School creation is an explicit admin operation. It never links an existing
-- school to a new administrator, and never grants reserved-case permissions.
begin;
create index if not exists edu_schools_normalized_name on public.edu_schools(lower(btrim(regexp_replace(name,'[[:space:]]+',' ','g'))));
create unique index if not exists edu_school_create_idempotency on public.edu_audit_logs(actor_id,(details->>'client_id')) where action='create_school';
create or replace function pedagogy.create_school(b jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare
 actor uuid:=auth.uid();school_uuid uuid;request_uuid uuid;school_name text;contact text;normalized text;request_hash text;prior public.edu_audit_logs;
begin
 if actor is null or not pedagogy.session_ok() or not exists(select 1 from public.user_roles where user_id=actor and role='admin') then raise exception 'Somente administradores podem cadastrar escolas.' using errcode='42501';end if;
 if b is null or jsonb_typeof(b)<>'object' then raise exception 'Dados inválidos.';end if;
 school_name:=btrim(regexp_replace(b->>'name','[[:space:]]+',' ','g'));contact:=btrim(coalesce(b->>'support_contact',''));request_uuid:=(b->>'client_id')::uuid;
 if school_name is null or length(school_name) not between 2 and 160 or length(contact)>300 or request_uuid is null then raise exception 'Informe o nome da escola (2 a 160 caracteres) e um contato de até 300 caracteres.';end if;
 normalized:=lower(school_name);request_hash:=md5(normalized||chr(31)||contact);
 perform pg_advisory_xact_lock(hashtextextended(actor::text,44));
 select * into prior from public.edu_audit_logs where actor_id=actor and action='create_school' and details->>'client_id'=request_uuid::text;
 if prior.id is not null then
  if prior.details->>'request_hash' is distinct from request_hash then raise exception 'Este identificador já foi usado em outro cadastro.';end if;
  if not pedagogy.is_admin(prior.school_id) then raise exception 'Seu acesso a esta escola não está mais ativo.' using errcode='42501';end if;
  return (select jsonb_build_object('id',s.id,'name',s.name) from public.edu_schools s where s.id=prior.school_id);
 end if;
 -- Serialize the normalized name across different administrators, too.
 perform pg_advisory_xact_lock(hashtextextended(normalized,901));
 if exists(select 1 from public.edu_schools where lower(btrim(regexp_replace(name,'[[:space:]]+',' ','g')))=normalized) then raise exception 'Já existe uma escola com esse nome. Para acessar uma escola existente, solicite o vínculo ao responsável.' using errcode='23505';end if;
 insert into public.edu_schools(name,support_contact)values(school_name,contact)returning id into school_uuid;
 insert into public.edu_admin_scopes(user_id,school_id,can_sensitive)values(actor,school_uuid,false);
 insert into public.edu_audit_logs(actor_id,school_id,action,resource_id,details)values(actor,school_uuid,'create_school',school_uuid,jsonb_build_object('client_id',request_uuid,'request_hash',request_hash));
 return jsonb_build_object('id',school_uuid,'name',school_name);
end$$;
revoke all on function pedagogy.create_school(jsonb) from public,anon,authenticated;
grant execute on function pedagogy.create_school(jsonb) to authenticated;
create or replace function public.pedagogy_action(p_op text,p_body jsonb default '{}') returns jsonb language sql security invoker set search_path='' as $$select case when p_op='create_school' then pedagogy.create_school(p_body) else pedagogy.workspace_action(p_op,p_body) end$$;
revoke all on function public.pedagogy_action(text,jsonb) from public,anon;
grant execute on function public.pedagogy_action(text,jsonb) to authenticated;
commit;
