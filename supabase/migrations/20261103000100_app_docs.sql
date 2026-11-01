-- One table for user data: results, PIQ, profiles, legacy OIR questions.
-- Each row is a document: (collection, id) plus the JSON body. The few fields we sort or filter on are
-- also real columns so Postgres can use indexes (JSON text would sort numbers wrongly).
--
-- PRIVATE BY DESIGN. This table holds personal data (PIQ answers, stories). Row level security is on with
-- NO policies, so the public anon key can read and write nothing. Only the backend, using the
-- service-role key, can use it. Never add a policy for anon or authenticated.

create table if not exists public.app_docs (
  collection text not null,
  id text not null,
  user_id text,                       -- data.userId
  score numeric,                      -- data.score
  percentage_score numeric,           -- data.percentageScore (OIR leaderboard)
  ranked boolean,                     -- data.ranked (OIR leaderboard)
  completed_at timestamptz,           -- data.completedAt
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  data jsonb not null default '{}'::jsonb,
  primary key (collection, id)
);

create index if not exists app_docs_user_idx    on public.app_docs (collection, user_id, completed_at desc);
create index if not exists app_docs_score_idx   on public.app_docs (collection, score desc);
create index if not exists app_docs_ranked_idx  on public.app_docs (collection, ranked, percentage_score desc);

alter table public.app_docs enable row level security;
revoke all on public.app_docs from anon, authenticated;
