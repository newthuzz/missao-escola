begin;
create table if not exists public.learner_backups (
  user_id uuid primary key references auth.users(id) on delete cascade,
  snapshot jsonb not null check (jsonb_typeof(snapshot) = 'object' and snapshot ?& array['progress','learner','routine']),
  revision bigint not null default 1 check (revision > 0),
  updated_at timestamptz not null default now()
);
alter table public.learner_backups enable row level security;
revoke all on public.learner_backups from anon;
grant select, insert, update on public.learner_backups to authenticated;
drop policy if exists own_backup on public.learner_backups;
create policy own_backup on public.learner_backups for all to authenticated
using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create or replace function public.save_learner_backup(p_snapshot jsonb, p_revision bigint)
returns setof public.learner_backups
language plpgsql security invoker set search_path = '' as $$
declare saved public.learner_backups;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if p_revision = 0 then
    insert into public.learner_backups(user_id, snapshot) values(auth.uid(), p_snapshot)
    on conflict (user_id) do nothing returning * into saved;
  else
    update public.learner_backups set snapshot = p_snapshot, revision = revision + 1, updated_at = now()
    where user_id = auth.uid() and revision = p_revision returning * into saved;
  end if;
  if saved.user_id is null then
    raise exception using errcode = '40001', message = 'Backup changed on another device. Reload before saving.';
  end if;
  return next saved;
end;
$$;
revoke all on function public.save_learner_backup(jsonb, bigint) from public, anon;
grant execute on function public.save_learner_backup(jsonb, bigint) to authenticated;
commit;
