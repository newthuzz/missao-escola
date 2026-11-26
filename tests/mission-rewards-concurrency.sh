#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
container="missao-rewards-concurrency-$$"
scratch="$(mktemp -d)"
trap 'docker stop "$container" >/dev/null 2>&1 || true; rm -rf "$scratch"' EXIT
docker run --rm -d --name "$container" -e POSTGRES_HOST_AUTH_METHOD=trust postgres:17-alpine >/dev/null
for attempt in {1..50}; do
 if docker exec "$container" pg_isready -U postgres -h 127.0.0.1 >/dev/null 2>&1; then break; fi
 sleep .2
done
psql_test() { docker exec -i "$container" psql -X -Atq -h 127.0.0.1 -U postgres -v ON_ERROR_STOP=1 "$@"; }

psql_test <<'SQL'
create role anon;
create role authenticated;
create role service_role;
create schema auth;
create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,raw_user_meta_data jsonb not null default '{}');
create table auth.sessions(id uuid primary key,user_id uuid references auth.users on delete cascade,not_after timestamptz);
create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
create function auth.jwt() returns jsonb language sql stable as $$select '{}'::jsonb$$;
grant usage on schema auth to authenticated;
SQL
for file in supabase/migrations/*_pedagogical_support.sql supabase/migrations/*_owner_workspaces.sql supabase/social.sql supabase/migrations/*_mission_rewards.sql; do
 psql_test < "$file"
done
psql_test <<'SQL'
insert into auth.users(id,email,email_confirmed_at) values
 ('00000000-0000-4000-8000-000000000001','first@example.test',now()),
 ('00000000-0000-4000-8000-000000000002','second@example.test',now());
insert into mission_rewards.partners values('real','partner-local','Parceiro local','Instituição do teste de estoque.',true,true);
insert into mission_rewards.catalog(mode,code,title,description,category,image,cost,stock,partner_code,conditions,confirmation,supplemental,active) values
 ('real','one-stock','Item de estoque','Teste de concorrência','retention','school',20,1,'partner-local','Entrega de teste','Confirmação de teste',true,true),
 ('real','same-wallet-a','Item A','Teste de concorrência','retention','school',15,2,'partner-local','Entrega de teste','Confirmação de teste',true,true),
 ('real','same-wallet-b','Item B','Teste de concorrência','retention','school',15,2,'partner-local','Entrega de teste','Confirmação de teste',true,true);
select mission_rewards.post('real',id,'earn','seed','Crédito do teste',20) from auth.users;
SQL

run() {
 local user="$1" query="$2" hold="$3"
 psql_test <<SQL
begin;
set local role authenticated;
set local "request.jwt.claim.sub" = '00000000-0000-4000-8000-00000000000${user}';
select public.mission_rewards_action('real', ${query});
select pg_sleep(${hold});
commit;
SQL
}

run 1 "'redeem','{\"code\":\"one-stock\",\"cost\":20,\"request_key\":\"00000000-0000-4000-8000-000000000010\"}'" 1 > "$scratch/first" 2>&1 &
first=$!
sleep .2
run 2 "'redeem','{\"code\":\"one-stock\",\"cost\":20,\"request_key\":\"00000000-0000-4000-8000-000000000011\"}'" 0 > "$scratch/second" 2>&1 &
second=$!
wait "$first"
if wait "$second"; then cat "$scratch/second"; exit 1; fi
rg -q 'sem disponibilidade' "$scratch/second"
reservation="$(psql_test -c "select id from mission_rewards.redemptions where item_code='one-stock'")"

run 1 "'cancel','{\"id\":\"${reservation}\"}'" 1 > "$scratch/first" 2>&1 &
first=$!
sleep .2
run 1 "'cancel','{\"id\":\"${reservation}\"}'" 0 > "$scratch/second" 2>&1 &
second=$!
wait "$first" "$second"

run 1 "'redeem','{\"code\":\"same-wallet-a\",\"cost\":15,\"request_key\":\"00000000-0000-4000-8000-000000000012\"}'" 1 > "$scratch/first" 2>&1 &
first=$!
sleep .2
run 1 "'redeem','{\"code\":\"same-wallet-b\",\"cost\":15,\"request_key\":\"00000000-0000-4000-8000-000000000013\"}'" 0 > "$scratch/second" 2>&1 &
second=$!
wait "$first"
if wait "$second"; then cat "$scratch/second"; exit 1; fi
rg -q 'Saldo de Mission Points insuficiente' "$scratch/second"

psql_test <<'SQL'
do $$
begin
 if (select count(*) from mission_rewards.transactions where kind='refund')<>1 then raise exception 'Expected one refund'; end if;
 if (select committed from mission_rewards.catalog where code='one-stock')<>0 then raise exception 'Stock not restored'; end if;
 if (select count(*) from mission_rewards.redemptions where status='requested')<>1 then raise exception 'Expected one competing redemption'; end if;
 if (select balance from mission_rewards.wallets where user_id='00000000-0000-4000-8000-000000000001')<>5 then raise exception 'Wrong balance'; end if;
end $$;
SQL
printf '%s\n' 'PASS PostgreSQL 17: concurrent inventory, concurrent wallet debits and exactly-once concurrent refund.'
