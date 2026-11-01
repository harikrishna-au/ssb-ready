-- Content banks for the timed rounds. Served by ssb_backend /api/content/* (service-role key).
-- RLS is on with NO policies: clients can never read these tables directly, which keeps OIR answers server-side.

create table if not exists public.content_wat_words (
  id uuid primary key default gen_random_uuid(),
  word text not null unique,
  tags text[] not null default '{}',
  difficulty smallint not null default 2 check (difficulty between 1 and 3),
  active boolean not null default true,
  review_status text not null default 'pending' check (review_status in ('pending','approved','rejected')),
  created_at timestamptz not null default now()
);

create table if not exists public.content_srt_situations (
  id uuid primary key default gen_random_uuid(),
  text text not null unique,
  tags text[] not null default '{}',
  difficulty smallint not null default 2 check (difficulty between 1 and 3),
  active boolean not null default true,
  review_status text not null default 'pending' check (review_status in ('pending','approved','rejected')),
  created_at timestamptz not null default now()
);

create table if not exists public.content_lecturette_topics (
  id uuid primary key default gen_random_uuid(),
  topic text not null unique,
  tags text[] not null default '{}',
  difficulty smallint not null default 2 check (difficulty between 1 and 3),
  active boolean not null default true,
  review_status text not null default 'pending' check (review_status in ('pending','approved','rejected')),
  created_at timestamptz not null default now()
);

create table if not exists public.content_oir_questions (
  id uuid primary key default gen_random_uuid(),
  legacy_id text unique,                        -- id in the old oir_questions collection
  text text not null,
  options jsonb not null,                       -- ["a","b","c","d"]
  correct_answer_index smallint not null,       -- NEVER sent to clients before they answer
  type text,                                    -- verbal | non-verbal | numerical ...
  image_url text,
  explanation text,
  tags text[] not null default '{}',
  difficulty smallint not null default 2 check (difficulty between 1 and 3),
  active boolean not null default true,
  review_status text not null default 'pending' check (review_status in ('pending','approved','rejected')),
  created_at timestamptz not null default now()
);

-- What each user has already been served, so the next set avoids it.
create table if not exists public.content_seen (
  user_id text not null,
  bank text not null,
  item_id text not null,
  seen_at timestamptz not null default now(),
  primary key (user_id, bank, item_id)
);
create index if not exists content_seen_user_bank on public.content_seen (user_id, bank, seen_at desc);

alter table public.content_wat_words enable row level security;
alter table public.content_srt_situations enable row level security;
alter table public.content_lecturette_topics enable row level security;
alter table public.content_oir_questions enable row level security;
alter table public.content_seen enable row level security;
