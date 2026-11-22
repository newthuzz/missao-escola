-- Share the Tutor's budget without storing essays in its chat history.
create or replace function public.reserve_essay_review(p_user uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_day timestamptz := date_trunc('day', now(), 'UTC');
begin
  if p_user is null then raise exception 'Authentication required'; end if;

  perform pg_advisory_xact_lock(hashtext('tutor:' || p_user::text));
  if (select count(*) from public.ai_usage where user_id = p_user and created_at > now() - interval '1 minute') >= 8
    or (select count(*) from public.ai_usage where user_id = p_user and created_at >= current_day) >= 80 then
    raise exception 'LIMIT:Você atingiu o limite de uso da IA. Aguarde para solicitar outra correção.';
  end if;

  perform pg_advisory_xact_lock(hashtext('tutor-global-budget'));
  if (select count(*) from public.ai_usage where created_at >= current_day) >= 2000 then
    raise exception 'LIMIT:A IA atingiu o limite de uso de hoje. Volte amanhã.';
  end if;

  insert into public.ai_usage(user_id) values (p_user);
end;
$$;

revoke all on function public.reserve_essay_review(uuid) from public, anon, authenticated;
grant execute on function public.reserve_essay_review(uuid) to service_role;
