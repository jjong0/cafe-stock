create table items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null check (category in ('bean_milk','syrup_sauce','supplies','dessert')),
  sort_order int not null default 0,
  active boolean not null default true
);

create table stock_issues (
  id uuid primary key default gen_random_uuid(),
  session_id text,                       -- null = 공용 시드 데이터
  item_id uuid not null references items(id),
  level text not null check (level in ('low','out')),
  status text not null default 'open' check (status in ('open','acknowledged','resolved')),
  opened_at timestamptz not null default now(),
  acknowledged_at timestamptz,
  resolved_at timestamptz
);

-- 세션·품목당 미처리 이슈는 하나만
create unique index one_open_issue
  on stock_issues (coalesce(session_id, ''), item_id)
  where status <> 'resolved';

create table stock_reports (
  id uuid primary key default gen_random_uuid(),
  session_id text,
  issue_id uuid not null references stock_issues(id),
  item_id uuid not null references items(id),
  level text not null check (level in ('low','out')),
  reporter_name text not null,
  memo text,
  created_at timestamptz not null default now()
);
create index on stock_reports (session_id, created_at);
create index on stock_reports (item_id, created_at);

create table briefings (
  session_id text not null,
  facts_hash text not null,              -- 입력 데이터가 같으면 재생성하지 않음
  content jsonb not null,
  generated_at timestamptz not null default now(),
  primary key (session_id, facts_hash)
);

create table api_usage (
  key text not null,                     -- 'session:<id>' 또는 'global'
  day date not null,
  count int not null default 0,
  primary key (key, day)
);

-- 정책을 만들지 않아 anon·authenticated 접근은 전부 차단된다. 서버의 service role만 RLS를 우회한다.
alter table items enable row level security;
alter table stock_issues enable row level security;
alter table stock_reports enable row level security;
alter table briefings enable row level security;
alter table api_usage enable row level security;
