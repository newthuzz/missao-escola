begin;

create schema mission_rewards;
revoke all on schema mission_rewards from public, anon, authenticated;

create table mission_rewards.wallets (
 mode text not null check (mode in ('real','demo')),
 user_id uuid not null references auth.users on delete cascade,
 balance bigint not null default 0 check (balance >= 0),
 primary key (mode,user_id)
);

create table mission_rewards.rules (
 mode text not null check (mode in ('real','demo')),
 kind text not null check (kind in ('activity','recovery','goal','project','special')),
 points integer not null check (points between 1 and 10000),
 daily_limit integer not null check (daily_limit between 1 and 50),
 goal_min integer not null default 3 check (goal_min between 1 and 10),
 active boolean not null default true,
 primary key (mode,kind)
);

create table mission_rewards.partners (
 mode text not null check (mode in ('real','demo')),
 code text not null check (code ~ '^[a-z0-9][a-z0-9-]{1,50}$'),
 name text not null check (length(trim(name)) between 2 and 120),
 summary text not null check (length(trim(summary)) between 5 and 500),
 confirmed boolean not null default false,
 active boolean not null default false,
 primary key(mode,code)
);

create table mission_rewards.catalog (
 mode text not null check (mode in ('real','demo')),
 code text not null check (code ~ '^[a-z0-9][a-z0-9-]{1,50}$'),
 title text not null check (length(trim(title)) between 2 and 120),
 description text not null check (length(trim(description)) between 5 and 500),
 category text not null check (category in ('retention','education','digital')),
 image text not null check (image in ('school','study','rewards','routine','opportunities')),
 cost integer not null check (cost between 1 and 1000000),
 stock integer not null check (stock between 0 and 1000000),
 committed integer not null default 0 check (committed between 0 and stock),
 partner_code text,
 school_id uuid references public.edu_schools,
 conditions text not null check (length(trim(conditions)) between 5 and 500),
 confirmation text not null default '',
 supplemental boolean not null default false,
 active boolean not null default false,
 primary key(mode,code),
 foreign key(mode,partner_code) references mission_rewards.partners(mode,code),
 check (length(confirmation) <= 500),
 check (mode='demo' or not active or (supplemental and partner_code is not null and length(trim(confirmation)) >= 10))
);

create table mission_rewards.campaigns (
 mode text not null check (mode in ('real','demo')),
 code text not null check (code ~ '^[a-z0-9][a-z0-9-]{1,50}$'),
 kind text not null check (kind in ('activity','recovery','project','special')),
 title text not null check (length(trim(title)) between 2 and 120),
 instructions text not null check (length(trim(instructions)) between 5 and 800),
 questions jsonb not null default '[]',
 school_id uuid references public.edu_schools,
 active boolean not null default false,
 starts_at timestamptz,
 ends_at timestamptz,
 primary key(mode,code),
 foreign key(mode,kind) references mission_rewards.rules(mode,kind),
 check (ends_at is null or starts_at is null or starts_at < ends_at),
 check (kind <> 'project' or (questions='[]'::jsonb and (mode='demo' or school_id is not null)))
);

create table mission_rewards.completions (
 mode text not null,
 user_id uuid not null,
 campaign_code text not null,
 verified_by uuid references auth.users on delete set null,
 earned integer not null default 0 check (earned >= 0),
 completed_at timestamptz not null default now(),
 primary key(mode,user_id,campaign_code),
 foreign key(mode,user_id) references mission_rewards.wallets on delete cascade,
 foreign key(mode,campaign_code) references mission_rewards.campaigns
);

create table mission_rewards.goals (
 mode text not null,
 user_id uuid not null,
 week date not null,
 target integer not null check (target between 1 and 20),
 started_at timestamptz not null default now(),
 primary key(mode,user_id,week),
 foreign key(mode,user_id) references mission_rewards.wallets on delete cascade
);

create table mission_rewards.redemptions (
 id uuid primary key default gen_random_uuid(),
 mode text not null,
 user_id uuid not null,
 item_code text not null,
 item_title text not null,
 cost integer not null check (cost > 0),
 request_key uuid not null,
 status text not null check (status in ('requested','pending','approved','preparing','delivered','refused','cancelled')),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique (mode,user_id,request_key),
 foreign key(mode,user_id) references mission_rewards.wallets on delete cascade,
 foreign key(mode,item_code) references mission_rewards.catalog
);

create unique index mission_rewards_one_item_per_student on mission_rewards.redemptions(mode,user_id,item_code)
 where status not in ('refused','cancelled');
create index mission_rewards_redemptions_queue on mission_rewards.redemptions(mode,status,created_at desc);
create index mission_rewards_redemptions_item on mission_rewards.redemptions(mode,item_code);
create index mission_rewards_redemptions_dated on mission_rewards.redemptions(mode,user_id,created_at desc);

create table mission_rewards.transactions (
 id bigint generated always as identity primary key,
 mode text not null,
 user_id uuid not null,
 kind text not null check (kind in ('earn','reserve','refund','adjust','deliver')),
 rule_kind text,
 ref text not null,
 description text not null,
 delta integer not null,
 created_at timestamptz not null default now(),
 unique(mode,user_id,kind,ref),
 foreign key(mode,user_id) references mission_rewards.wallets on delete cascade,
 check ((kind in ('earn','refund') and delta>0) or (kind='reserve' and delta<0) or (kind='deliver' and delta=0) or (kind='adjust' and delta<>0))
);
create index mission_rewards_transactions_dated on mission_rewards.transactions(mode,user_id,created_at desc,id desc);

create table mission_rewards.audit (
 id bigint generated always as identity primary key,
 mode text not null check (mode in ('real','demo')),
 actor uuid references auth.users on delete set null,
 action text not null,
 entity text not null,
 details jsonb not null default '{}',
 created_at timestamptz not null default now()
);
create index mission_rewards_audit_dated on mission_rewards.audit(mode,created_at desc,id desc);

do $$
declare item text;
begin
 foreach item in array array['wallets','rules','partners','catalog','campaigns','completions','goals','redemptions','transactions','audit'] loop
  execute format('alter table mission_rewards.%I enable row level security',item);
 end loop;
end;
$$;

insert into mission_rewards.rules(mode,kind,points,daily_limit)
select m.mode,r.kind,r.points,r.daily_limit from (values ('real'),('demo')) m(mode)
cross join (values ('activity',20,3),('recovery',40,2),('goal',50,1),('project',30,2),('special',50,1)) r(kind,points,daily_limit);

-- Both modes include educational activities. Only demo includes illustrative benefits.
insert into mission_rewards.campaigns(mode,code,kind,title,instructions,questions,active)
select m.mode,c.code,c.kind,c.title,c.instructions,c.questions::jsonb,true
from (values ('real'),('demo')) m(mode)
cross join (values
 ('atividade-fracoes','activity','Frações em pequenas partes','Para somar frações com o mesmo denominador, some os numeradores e mantenha o denominador.',
  '[{"prompt":"Quanto é 1/5 + 2/5?","options":["2/10","3/5","3/10"],"answer":1},{"prompt":"Em 4/7, o denominador indica em quantas partes iguais o todo foi dividido. Quantas?","options":["4","11","7"],"answer":2}]'),
 ('recuperacao-leitura','recovery','Revisão de leitura','Uma boa estratégia é localizar a informação no texto e reler o trecho antes de responder.',
  '[{"prompt":"“A biblioteca fica aberta até as 17h às quartas.” Até que horas ela abre às quartas?","options":["Até as 15h","Até as 16h","Até as 17h"],"answer":2},{"prompt":"“Joana devolveu o livro e escolheu outro.” O que Joana fez primeiro?","options":["Devolveu o livro","Escolheu outro livro","Emprestou o livro"],"answer":0}]'),
 ('missao-planejamento','special','Missão de organização','Divida uma tarefa grande em etapas curtas. Escolha horários possíveis e reserve tempo para pausas.',
  '[{"prompt":"Você tem 30 minutos para revisar e praticar. Qual plano cabe nesse tempo?","options":["30 min de revisão e 20 min de prática","10 min de revisão e 20 min de prática","45 min de prática"],"answer":1},{"prompt":"Se hoje sobrarem só 10 minutos, que passo ajuda a manter seu estudo?","options":["Desistir da semana","Tentar terminar tudo agora","Escolher uma tarefa pequena e reagendar o restante"],"answer":2}]'),
 ('atividade-ciencias','activity','O ciclo da água','Na evaporação, a água líquida vira vapor. Na condensação, o vapor esfria e volta a ser líquido.',
  '[{"prompt":"Que processo ajuda a explicar uma poça secando?","options":["Condensação","Evaporação","Congelamento"],"answer":1},{"prompt":"Como se chama a formação de gotinhas quando o vapor esfria?","options":["Evaporação","Condensação","Fusão"],"answer":1}]')
) c(code,kind,title,instructions,questions);

insert into mission_rewards.catalog(mode,code,title,description,category,image,cost,stock,conditions,active) values
 ('demo','kit-ilustrativo','Kit escolar ilustrativo','Exemplo de kit com cadernos e materiais de escrita.','retention','school',30,1000,'Simulação. Nenhum material será enviado.',true),
 ('demo','oficina-ilustrativa','Oficina ilustrativa','Exemplo de oficina de organização dos estudos.','education','study',40,1000,'Simulação. Nenhuma vaga real será reservada.',true),
 ('demo','emblema-ilustrativo','Emblema ilustrativo','Exemplo de personalização digital demonstrativa.','digital','rewards',20,1000,'Simulação. Este emblema não altera sua coleção.',true);

create function mission_rewards.in_school(student uuid, school uuid) returns boolean
language sql stable set search_path='' as $$
 select school is null or exists (
  select 1 from public.edu_memberships m
  join public.edu_schools s on s.id=m.school_id and s.active
  join public.edu_classes c on c.id=m.class_id and c.active
  where m.student_id=student and m.school_id=school and m.active
 )
$$;

-- All changes to a wallet are serialized by a row lock; the ledger and balance share a transaction.
create function mission_rewards.post(m text, student uuid, movement text, reference text, label text, amount integer, rule text default null)
returns boolean language plpgsql set search_path='' as $$
begin
 insert into mission_rewards.wallets(mode,user_id) values(m,student) on conflict do nothing;
 perform 1 from mission_rewards.wallets where mode=m and user_id=student for update;
 insert into mission_rewards.transactions(mode,user_id,kind,ref,description,delta,rule_kind)
 values(m,student,movement,reference,label,amount,rule) on conflict(mode,user_id,kind,ref) do nothing;
 if not found then return false; end if;
 update mission_rewards.wallets set balance=balance+amount where mode=m and user_id=student and balance+amount>=0;
 if not found then raise exception 'Saldo de Mission Points insuficiente.' using errcode='22023'; end if;
 return true;
end;
$$;

create function mission_rewards.earn(m text, student uuid, rule_code text, reference text, label text)
returns integer language plpgsql set search_path='' as $$
declare rule mission_rewards.rules;
begin
 insert into mission_rewards.wallets(mode,user_id) values(m,student) on conflict do nothing;
 perform 1 from mission_rewards.wallets where mode=m and user_id=student for update;
 select * into rule from mission_rewards.rules where mode=m and kind=rule_code and active;
 if not found or (
  select count(*) from mission_rewards.transactions
  where mode=m and user_id=student and kind='earn' and rule_kind=rule_code
    and created_at >= date_trunc('day',now() at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo'
 )>=rule.daily_limit then return 0; end if;
 if not mission_rewards.post(m,student,'earn',reference,label,rule.points,rule_code) then return 0; end if;
 return rule.points;
end;
$$;

create function mission_rewards.audit_event(m text, operation text, key text, data jsonb default '{}')
returns void language sql set search_path='' as $$
 insert into mission_rewards.audit(mode,actor,action,entity,details) values(m,auth.uid(),operation,key,data)
$$;

create function mission_rewards.state(m text, student uuid, offset_rows integer) returns jsonb
language sql stable set search_path='' as $$
 select jsonb_build_object(
  'mode',m,
  'canAdmin',pedagogy.is_workspace_owner(),
  'balance',coalesce((select balance from mission_rewards.wallets where mode=m and user_id=student),0),
  'total',coalesce((select sum(delta) from mission_rewards.transactions where mode=m and user_id=student and kind='earn'),0),
  'history',coalesce((select jsonb_agg(to_jsonb(t) order by t.created_at desc,t.id desc) from (
    select id,kind,description,delta,created_at from mission_rewards.transactions where mode=m and user_id=student
    order by created_at desc,id desc limit 21 offset offset_rows
  ) t),'[]'),
  'redemptions',coalesce((select jsonb_agg(to_jsonb(r) order by r.created_at desc) from (
    select id,item_title,cost,status,created_at,updated_at from mission_rewards.redemptions where mode=m and user_id=student
    order by created_at desc limit 50
  ) r),'[]'),
  'rules',coalesce((select jsonb_agg(to_jsonb(r) - 'mode' order by r.kind) from mission_rewards.rules r where r.mode=m),'[]'),
  'catalog',coalesce((select jsonb_agg(to_jsonb(c) order by c.category,c.title) from (
    select c.code,c.title,c.description,c.image,c.category,c.cost,c.stock-c.committed available,c.conditions,
           p.name partner,coalesce(s.name,'Todas as escolas') eligibility,
           mission_rewards.in_school(student,c.school_id) eligible,
           exists(select 1 from mission_rewards.redemptions r where r.mode=m and r.user_id=student and r.item_code=c.code and r.status not in ('refused','cancelled')) redeemed
    from mission_rewards.catalog c left join mission_rewards.partners p on p.mode=c.mode and p.code=c.partner_code
    left join public.edu_schools s on s.id=c.school_id
    where c.mode=m and c.active and (m='demo' or (p.active and p.confirmed))
  ) c),'[]'),
  'partners',coalesce((select jsonb_agg(jsonb_build_object('name',name,'summary',summary) order by name)
    from mission_rewards.partners where mode=m and active and (m='demo' or confirmed)),'[]'),
  'campaigns',coalesce((select jsonb_agg(to_jsonb(c) order by c.kind,c.title) from (
    select c.code,c.kind,c.title,c.instructions,r.points,d.completed_at,d.earned
    from mission_rewards.campaigns c join mission_rewards.rules r on r.mode=c.mode and r.kind=c.kind and r.active
    left join mission_rewards.completions d on d.mode=c.mode and d.campaign_code=c.code and d.user_id=student
    where c.mode=m and c.active and (c.starts_at is null or c.starts_at<=now()) and (c.ends_at is null or c.ends_at>now())
      and mission_rewards.in_school(student,c.school_id)
  ) c),'[]'),
  'verifiedStudies',case when m='real' then coalesce((select jsonb_agg(to_jsonb(s) order by s.day desc) from (
    select distinct on (s.day) s.id,s.day from public.social_sessions s
    where s.user_id=student and s.cursor=3 and s.day>=(now() at time zone 'America/Sao_Paulo')::date-6
    and not exists(select 1 from mission_rewards.transactions t where t.mode=m and t.user_id=student and t.kind='earn' and t.ref='verified:'||s.day)
    order by s.day desc,s.created_at desc,s.id
  ) s),'[]') else '[]'::jsonb end,
  'goal',(select jsonb_build_object('target',g.target,
    'done',(select count(*) from mission_rewards.completions c join mission_rewards.campaigns a on a.mode=c.mode and a.code=c.campaign_code
      where c.mode=m and c.user_id=student and c.completed_at>=g.started_at and a.kind<>'project'),
    'claimed',exists(select 1 from mission_rewards.transactions t where t.mode=m and t.user_id=student and t.kind='earn' and t.ref='goal:'||g.week))
    from mission_rewards.goals g where g.mode=m and g.user_id=student
      and g.week=date_trunc('week',now() at time zone 'America/Sao_Paulo')::date)
 )
$$;

create function mission_rewards.delete_reservation() returns trigger
language plpgsql set search_path='' as $$
begin
 if old.status not in ('refused','cancelled') then
  update mission_rewards.catalog set committed=committed-1,
   stock=stock-case when old.status='delivered' then 1 else 0 end
   where mode=old.mode and code=old.item_code;
 end if;
 return old;
end;
$$;
create trigger mission_rewards_delete_reservation before delete on mission_rewards.redemptions
 for each row execute function mission_rewards.delete_reservation();

create function mission_rewards.admin_state(m text, from_row integer) returns jsonb
language sql stable set search_path='' as $$
 select jsonb_build_object(
  'catalog',coalesce((select jsonb_agg(to_jsonb(c)-'mode' order by title) from mission_rewards.catalog c where mode=m),'[]'),
  'campaigns',coalesce((select jsonb_agg(to_jsonb(c)-'mode' order by title) from mission_rewards.campaigns c where mode=m),'[]'),
  'partners',coalesce((select jsonb_agg(to_jsonb(p)-'mode' order by name) from mission_rewards.partners p where mode=m),'[]'),
  'schools',coalesce((select jsonb_agg(jsonb_build_object('id',id,'name',name) order by name) from public.edu_schools where active),'[]'),
  'queue',coalesce((select jsonb_agg(to_jsonb(r)-'request_key'-'mode' order by (r.status in ('delivered','refused','cancelled')),r.created_at desc,r.id desc) from (
    select * from mission_rewards.redemptions where mode=m
    order by (status in ('delivered','refused','cancelled')),created_at desc,id desc limit 51 offset from_row
  ) r),'[]'),
  'movements',coalesce((select jsonb_agg(to_jsonb(t)-'mode' order by t.created_at desc,t.id desc) from (
    select * from mission_rewards.transactions where mode=m order by created_at desc,id desc limit 51 offset from_row
  ) t),'[]'),
  'audit',coalesce((select jsonb_agg(to_jsonb(a)-'mode' order by a.created_at desc,a.id desc) from (
    select * from mission_rewards.audit where mode=m order by created_at desc,id desc limit 51 offset from_row
  ) a),'[]'),
  'walletInconsistencies',(select count(*) from mission_rewards.wallets w where w.mode=m and
    w.balance<>(select coalesce(sum(t.delta),0) from mission_rewards.transactions t where t.mode=w.mode and t.user_id=w.user_id)),
  'stockInconsistencies',(select count(*) from mission_rewards.catalog c where c.mode=m and
    c.committed<>(select count(*) from mission_rewards.redemptions r where r.mode=c.mode and r.item_code=c.code and r.status not in ('refused','cancelled')))
 )
$$;

create function mission_rewards.valid_questions(q jsonb) returns boolean
language plpgsql immutable set search_path='' as $$
declare question jsonb;
begin
 if q is null or jsonb_typeof(q)<>'array' then return false; end if;
 if jsonb_array_length(q) not between 2 and 10 then return false; end if;
 for question in select value from jsonb_array_elements(q) loop
  if jsonb_typeof(question)<>'object'
     or coalesce(length(trim(question->>'prompt')),0) not between 5 and 500
     or jsonb_typeof(question->'options') is distinct from 'array'
     or coalesce(question->>'answer','') !~ '^[0-4]$' then return false; end if;
  if jsonb_array_length(question->'options') not between 2 and 5
     or (question->>'answer')::integer>=jsonb_array_length(question->'options')
     or exists(select 1 from jsonb_array_elements(question->'options') o where jsonb_typeof(o)<>'string' or length(trim(o#>>'{}')) not between 1 and 200)
  then return false; end if;
 end loop;
 return true;
end;
$$;

create function mission_rewards.route(p_mode text,p_op text,p_body jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare
 m alias for p_mode;
 b alias for p_body;
 u uuid:=auth.uid();
 admin boolean;
 student uuid;
 code_key text:=trim(b->>'code');
 reason text:=trim(b->>'reason');
 token uuid;
 study_day date;
 item mission_rewards.catalog;
 campaign mission_rewards.campaigns;
 saved mission_rewards.redemptions;
 selected_goal mission_rewards.goals;
 rule mission_rewards.rules;
 q jsonb;
 submitted jsonb;
 idx integer;
 gained integer;
 next_status text:=b->>'status';
 week_key date:=date_trunc('week',now() at time zone 'America/Sao_Paulo')::date;
 from_row integer;
 result jsonb;
begin
 if u is null or not pedagogy.session_ok() or coalesce(auth.jwt()->>'is_anonymous','false')='true' then
  raise exception 'Entre com uma conta confirmada para usar o Missão Rewards.' using errcode='42501';
 end if;
 if m is null or m not in ('real','demo') or jsonb_typeof(b) is distinct from 'object' or octet_length(b::text)>45000 then
  raise exception 'Pedido inválido.' using errcode='22023';
 end if;
 admin:=pedagogy.is_workspace_owner();
 if p_op like 'admin_%' and not admin then raise exception 'Acesso restrito à administração do Missão Rewards.' using errcode='42501'; end if;
 from_row:=least(1000000,greatest(0,coalesce((b->>'offset')::integer,0)));

 case p_op
 when 'state' then return mission_rewards.state(m,u,from_row);
 when 'balance' then return jsonb_build_object('balance',coalesce((select balance from mission_rewards.wallets where mode=m and user_id=u),0));
 when 'claim_verified' then
  token:=(b->>'id')::uuid;
  if m<>'real' then raise exception 'Este estudo pertence ao programa operacional.' using errcode='42501'; end if;
  select day into study_day from public.social_sessions
  where id=token and user_id=u and cursor=3 and day>=(now() at time zone 'America/Sao_Paulo')::date-6;
  if not found then raise exception 'Nenhum estudo elegível para este registro.' using errcode='42501'; end if;
  gained:=mission_rewards.earn(m,u,'activity','verified:'||study_day,'Prática verificada nas ligas');
  return jsonb_build_object('earned',gained);

 when 'challenge', 'complete', 'admin_verify' then
  select c.* into campaign from mission_rewards.campaigns c join mission_rewards.rules r on r.mode=c.mode and r.kind=c.kind and r.active
  where c.mode=m and c.code=code_key and c.active and (c.starts_at is null or c.starts_at<=now()) and (c.ends_at is null or c.ends_at>now())
  for share of c;
  student:=case when p_op='admin_verify' then (b->>'user_id')::uuid else u end;
  if not found or student is null or not mission_rewards.in_school(student,campaign.school_id)
     or (p_op='admin_verify')<>(campaign.kind='project') then
   raise exception 'Missão indisponível para este estudante.' using errcode='22023';
  end if;
  if p_op='challenge' then
   return jsonb_build_object('title',campaign.title,'instructions',campaign.instructions,'questions',
     (select jsonb_agg(jsonb_build_object('prompt',value->'prompt','options',value->'options') order by ord)
      from jsonb_array_elements(campaign.questions) with ordinality as q(value,ord)));
  end if;
  if p_op='admin_verify' then
   if coalesce(length(reason),0) not between 10 and 500 or not exists(select 1 from auth.users where id=student and email_confirmed_at is not null) then
    raise exception 'Informe o estudante confirmado e a evidência da participação.' using errcode='22023';
   end if;
  else
   submitted:=b->'answers';
   if jsonb_typeof(submitted) is distinct from 'array' then raise exception 'Responda a todas as etapas.' using errcode='22023'; end if;
   if jsonb_array_length(submitted)<>jsonb_array_length(campaign.questions) then raise exception 'Responda a todas as etapas.' using errcode='22023'; end if;
   result:='[]';
   for q,idx in select value,ordinality::integer-1 from jsonb_array_elements(campaign.questions) with ordinality loop
    if (submitted->idx) is distinct from (q->'answer') then result:=result||to_jsonb(idx); end if;
   end loop;
   if result<>'[]'::jsonb then return jsonb_build_object('review',result); end if;
  end if;
  insert into mission_rewards.wallets(mode,user_id) values(m,student) on conflict do nothing;
  perform 1 from mission_rewards.wallets where mode=m and user_id=student for update;
  insert into mission_rewards.completions(mode,user_id,campaign_code,verified_by)
   values(m,student,campaign.code,case when p_op='admin_verify' then u end)
   on conflict do nothing;
  if not found then return jsonb_build_object('duplicate',true,'earned',0); end if;
  gained:=mission_rewards.earn(m,student,campaign.kind,'campaign:'||campaign.code,campaign.title);
  update mission_rewards.completions set earned=gained where mode=m and user_id=student and campaign_code=campaign.code;
  if p_op='admin_verify' then
   perform mission_rewards.audit_event(m,p_op,campaign.code,jsonb_build_object('student',student,'reason',reason,'points',gained));
  end if;
  return jsonb_build_object('earned',gained);

 when 'set_goal','claim_goal' then
  select * into rule from mission_rewards.rules where mode=m and kind='goal' and active;
  if not found then raise exception 'A meta personalizada está indisponível.' using errcode='22023'; end if;
  insert into mission_rewards.wallets(mode,user_id) values(m,u) on conflict do nothing;
  perform 1 from mission_rewards.wallets where mode=m and user_id=u for update;
  if p_op='set_goal' then
   idx:=(b->>'target')::integer;
   if idx is null or idx not between rule.goal_min and rule.goal_min+2 then raise exception 'Escolha uma meta disponível.' using errcode='22023'; end if;
   insert into mission_rewards.goals(mode,user_id,week,target) values(m,u,week_key,idx) on conflict do nothing;
   if not found then raise exception 'Sua meta desta semana já foi escolhida.' using errcode='22023'; end if;
  else
   select * into selected_goal from mission_rewards.goals where mode=m and user_id=u and week=week_key;
   if not found or (select count(*) from mission_rewards.completions c join mission_rewards.campaigns a on a.mode=c.mode and a.code=c.campaign_code
       where c.mode=m and c.user_id=u and c.completed_at>=selected_goal.started_at and a.kind<>'project')<selected_goal.target then
    raise exception 'Conclua a meta cadastrada para esta semana.' using errcode='22023';
   end if;
   gained:=mission_rewards.earn(m,u,'goal','goal:'||week_key,'Meta personalizada da semana');
  end if;
  return jsonb_build_object('earned',coalesce(gained,0));

 when 'redeem' then
  token:=(b->>'request_key')::uuid;
  if token is null then raise exception 'Falta a confirmação do resgate.' using errcode='22023'; end if;
  insert into mission_rewards.wallets(mode,user_id) values(m,u) on conflict do nothing;
  perform 1 from mission_rewards.wallets where mode=m and user_id=u for update;
  select * into saved from mission_rewards.redemptions where mode=m and user_id=u and request_key=token;
  if found then
   if saved.item_code is distinct from code_key then raise exception 'Esta confirmação pertence a outro item.' using errcode='22023'; end if;
   return jsonb_build_object('id',saved.id,'status',saved.status);
  end if;
  select * into item from mission_rewards.catalog where mode=m and code=code_key and active for update;
  if not found or item.committed>=item.stock then raise exception 'Recompensa sem disponibilidade.' using errcode='22023'; end if;
  if item.cost is distinct from (b->>'cost')::integer then raise exception 'O custo mudou. Atualize o catálogo antes de confirmar.' using errcode='22023'; end if;
  if m='real' then
   perform 1 from mission_rewards.partners where mode=m and code=item.partner_code and active and confirmed for share;
   if not found then raise exception 'A disponibilidade do parceiro ainda não foi confirmada.' using errcode='22023'; end if;
  end if;
  if not mission_rewards.in_school(u,item.school_id) then raise exception 'Este benefício exige vínculo ativo com a escola indicada.' using errcode='42501'; end if;
  if exists(select 1 from mission_rewards.redemptions where mode=m and user_id=u and item_code=item.code and status not in ('refused','cancelled')) then
   raise exception 'Já existe um resgate deste item.' using errcode='22023';
  end if;
  insert into mission_rewards.redemptions(mode,user_id,item_code,item_title,cost,request_key,status)
   values(m,u,item.code,item.title,item.cost,token,'requested') returning * into saved;
  perform mission_rewards.post(m,u,'reserve',saved.id::text,'Reserva · '||saved.item_title,-saved.cost);
  update mission_rewards.catalog set committed=committed+1 where mode=m and code=item.code;
  perform mission_rewards.audit_event(m,'request',saved.id::text);
  return jsonb_build_object('id',saved.id,'status',saved.status);

 when 'cancel','demo_advance','admin_status' then
  token:=(b->>'id')::uuid;
  select * into saved from mission_rewards.redemptions where mode=m and id=token and (user_id=u or p_op='admin_status');
  if not found or (p_op='demo_advance' and m<>'demo') then raise exception 'Resgate indisponível.' using errcode='42501'; end if;
  perform 1 from mission_rewards.wallets where mode=m and user_id=saved.user_id for update;
  select * into saved from mission_rewards.redemptions where mode=m and id=token for update;
  if p_op='cancel' then next_status:='cancelled'; end if;
  if p_op='demo_advance' then
   if saved.status is distinct from b->>'expected_status' then return jsonb_build_object('status',saved.status); end if;
   next_status:=case saved.status when 'requested' then 'pending' when 'pending' then 'approved'
    when 'approved' then 'preparing' when 'preparing' then 'delivered' else saved.status end;
  end if;
  if saved.status=next_status then return jsonb_build_object('status',saved.status); end if;
  if not coalesce(case
    when p_op='cancel' then saved.status in ('requested','pending')
    when saved.status='requested' then next_status in ('pending','refused','cancelled')
    when saved.status='pending' then next_status in ('approved','refused','cancelled')
    when saved.status='approved' then next_status in ('preparing','cancelled')
    when saved.status='preparing' then next_status in ('delivered','cancelled')
    else false end,false) then raise exception 'Atualize a tela. Essa mudança de status não está disponível.' using errcode='22023'; end if;
  if p_op='admin_status' and coalesce(length(reason),0) not between 5 and 500 then
   raise exception 'Registre a justificativa ou confirmação de entrega.' using errcode='22023';
  end if;
  if next_status in ('refused','cancelled') then
   perform mission_rewards.post(m,saved.user_id,'refund',saved.id::text,'Estorno · '||saved.item_title,saved.cost);
   update mission_rewards.catalog set committed=committed-1 where mode=m and code=saved.item_code;
  elsif next_status='delivered' then
   perform mission_rewards.post(m,saved.user_id,'deliver',saved.id::text,'Entrega · '||saved.item_title,0);
  end if;
  update mission_rewards.redemptions set status=next_status,updated_at=now() where mode=m and id=token;
  perform mission_rewards.audit_event(m,p_op,token::text,jsonb_build_object('from',saved.status,'to',next_status,'reason',reason));
  return jsonb_build_object('status',next_status);

 when 'admin_state' then return mission_rewards.admin_state(m,from_row);
 when 'admin_rule' then
  update mission_rewards.rules set points=(b->>'points')::integer,daily_limit=(b->>'daily_limit')::integer,
   goal_min=coalesce((b->>'goal_min')::integer,goal_min),active=coalesce((b->>'active')::boolean,false)
   where mode=m and kind=code_key;
  if not found then raise exception 'Regra não encontrada.' using errcode='22023'; end if;
 when 'admin_partner' then
  insert into mission_rewards.partners(mode,code,name,summary,confirmed,active)
   values(m,code_key,trim(b->>'name'),trim(b->>'summary'),coalesce((b->>'confirmed')::boolean,false),coalesce((b->>'active')::boolean,false))
   on conflict(mode,code) do update set name=excluded.name,summary=excluded.summary,confirmed=excluded.confirmed,active=excluded.active;
 when 'admin_item' then
  if m='real' and coalesce((b->>'active')::boolean,false) then
   if not coalesce((b->>'supplemental')::boolean,false) then
    raise exception 'O resgate só pode oferecer um benefício complementar à assistência escolar.' using errcode='22023';
   end if;
   perform 1 from mission_rewards.partners where mode=m and code=nullif(b->>'partner_code','') and active and confirmed;
   if not found then raise exception 'Cadastre e confirme um parceiro antes de publicar este benefício.' using errcode='22023'; end if;
  end if;
  insert into mission_rewards.catalog(mode,code,title,description,category,image,cost,stock,partner_code,school_id,conditions,confirmation,supplemental,active)
   values(m,code_key,trim(b->>'title'),trim(b->>'description'),b->>'category',b->>'image',(b->>'cost')::integer,(b->>'stock')::integer,
    nullif(b->>'partner_code',''),nullif(b->>'school_id','')::uuid,trim(b->>'conditions'),coalesce(trim(b->>'confirmation'),''),coalesce((b->>'supplemental')::boolean,false),coalesce((b->>'active')::boolean,false))
   on conflict(mode,code) do update set title=excluded.title,description=excluded.description,category=excluded.category,image=excluded.image,
    cost=excluded.cost,stock=excluded.stock,partner_code=excluded.partner_code,school_id=excluded.school_id,
    conditions=excluded.conditions,confirmation=excluded.confirmation,supplemental=excluded.supplemental,active=excluded.active;
 when 'admin_campaign' then
  q:=coalesce(b->'questions','[]');
  if b->>'kind'<>'project' and not mission_rewards.valid_questions(q) then
   raise exception 'Informe de 2 a 10 perguntas com alternativas e resposta válida.' using errcode='22023';
  end if;
  insert into mission_rewards.campaigns(mode,code,kind,title,instructions,questions,school_id,starts_at,ends_at,active)
   values(m,code_key,b->>'kind',trim(b->>'title'),trim(b->>'instructions'),q,nullif(b->>'school_id','')::uuid,
    nullif(b->>'starts_at','')::timestamptz,nullif(b->>'ends_at','')::timestamptz,coalesce((b->>'active')::boolean,false))
   on conflict(mode,code) do update set title=excluded.title,instructions=excluded.instructions,questions=excluded.questions,
    school_id=excluded.school_id,starts_at=excluded.starts_at,ends_at=excluded.ends_at,active=excluded.active
    where mission_rewards.campaigns.kind=excluded.kind;
  if not found then raise exception 'Use um novo código para criar uma campanha de outro tipo.' using errcode='22023'; end if;
  b:=b-'questions';
 when 'admin_adjust' then
  student:=(b->>'user_id')::uuid;
  token:=(b->>'request_key')::uuid;
  idx:=(b->>'delta')::integer;
  if student is null or token is null or idx is null or idx=0 or idx not between -1000000 and 1000000
     or coalesce(length(reason),0) not between 10 and 500 or not exists(select 1 from auth.users where id=student and email_confirmed_at is not null) then
   raise exception 'Informe o estudante, os pontos e uma justificativa.' using errcode='22023';
  end if;
  if mission_rewards.post(m,student,'adjust',token::text,'Ajuste administrativo',idx) then
   perform mission_rewards.audit_event(m,p_op,student::text,jsonb_build_object('reason',reason,'delta',idx,'reference',token));
  end if;
  return jsonb_build_object('ok',true);
 else raise exception 'Operação desconhecida.' using errcode='22023';
 end case;

 perform mission_rewards.audit_event(m,p_op,code_key,b);
 return jsonb_build_object('ok',true);
end;
$$;

revoke all on all tables in schema mission_rewards from public, anon, authenticated;
revoke all on all sequences in schema mission_rewards from public, anon, authenticated;
revoke all on all functions in schema mission_rewards from public, anon, authenticated;
grant usage on schema mission_rewards to authenticated;
grant execute on function mission_rewards.route(text,text,jsonb) to authenticated;

create function public.mission_rewards_action(p_mode text,p_op text,p_body jsonb default '{}') returns jsonb
language sql security invoker set search_path='' as $$
 select mission_rewards.route(p_mode,p_op,p_body)
$$;
revoke all on function public.mission_rewards_action(text,text,jsonb) from public, anon, authenticated;
grant execute on function public.mission_rewards_action(text,text,jsonb) to authenticated;
commit;
