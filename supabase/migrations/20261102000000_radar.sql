-- Radar 2.0: notifications, change history, source-watcher review queue,
-- server-side application tracker, reminder preferences and an email outbox.
-- All writes go through the backend with the service-role key. Only the public
-- read of published notifications is exposed to anon/authenticated via RLS.

create table if not exists public.radar_notifications (
  id text primary key,                         -- slug, e.g. 'nda-1-2027' (matches old tracker ids)
  title text not null,
  body text not null default '',                -- plain-language note shown to aspirants
  conducted_by text not null,                   -- UPSC, Indian Air Force, Indian Army, Indian Navy, state/CAPF body...
  service text not null check (service in ('Army','Navy','Air Force','Tri-service','CAPF','State / other')),
  exam text not null,                           -- NDA, CDS, AFCAT, TES, TGC, SSC Tech...
  opens date,
  last_date date,
  exam_date date,
  confidence text not null default 'expected' check (confidence in ('official','tentative','expected')),
  source_url text,                              -- the official page/notice the dates come from
  official_apply_url text,
  apply_label text not null default 'Official site',
  status text not null default 'draft' check (status in ('draft','published','archived')),
  verified_by text,                             -- admin user id
  verified_on date,                             -- the day a human last checked the official source
  version integer not null default 1,           -- bumps on every edit; used to dedupe change emails
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- A published row must always say where it came from and when it was checked.
  constraint radar_published_needs_source check (
    status <> 'published' or (source_url is not null and verified_on is not null and official_apply_url is not null)
  )
);
create index if not exists radar_notifications_status_idx on public.radar_notifications (status, last_date);

create table if not exists public.radar_history (
  id bigint generated always as identity primary key,
  notification_id text not null,
  action text not null,                         -- created | updated | published | archived | review-applied
  changed_by text,
  changes jsonb not null default '{}'::jsonb,   -- { field: { from, to } }
  created_at timestamptz not null default now()
);
create index if not exists radar_history_n_idx on public.radar_history (notification_id, created_at desc);

create table if not exists public.radar_sources (
  url text primary key,
  label text not null,
  notification_id text,                         -- optional hint: which entry this page usually affects
  enabled boolean not null default true,
  content_hash text,
  content_text text,                            -- last normalised text, used to build the diff
  last_checked_at timestamptz,
  last_changed_at timestamptz,
  last_error text
);

create table if not exists public.radar_review_items (
  id bigint generated always as identity primary key,
  source_url text not null,
  label text not null,
  notification_id text,
  diff jsonb not null default '{}'::jsonb,      -- { added: [...], removed: [...] }
  status text not null default 'open' check (status in ('open','dismissed','done')),
  created_at timestamptz not null default now(),
  resolved_by text,
  resolved_at timestamptz
);
create index if not exists radar_review_open_idx on public.radar_review_items (status, created_at desc);

create table if not exists public.tracked_applications (
  user_id text not null,                        -- Clerk user id
  notification_id text not null,                -- radar_notifications.id (not an FK: archived/deleted rows must not erase a user's record)
  status text not null default 'saved' check (status in ('saved','applied','admit_card','exam_done','result','ssb_call','final')),
  note text check (note is null or char_length(note) <= 160),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, notification_id)
);

create table if not exists public.radar_prefs (
  user_id text primary key,
  email text,
  reminders_enabled boolean not null default true,
  digest boolean not null default false,
  unsubscribe_token text not null unique,
  email_confirmed_for text,                     -- the address the user confirmed via the emailed link (double opt-in)
  confirm_token text unique,
  timezone text not null default 'Asia/Kolkata',
  tracker_migrated_at timestamptz,              -- set once the Clerk-metadata tracker has been imported
  updated_at timestamptz not null default now()
);

create table if not exists public.radar_outbox (
  id bigint generated always as identity primary key,
  dedupe_key text not null unique,              -- the idempotency guard: inserting the same key twice is a no-op
  user_id text not null,
  to_email text,
  kind text not null,                           -- deadline | change | digest
  subject text not null,
  body text not null,
  status text not null default 'queued' check (status in ('queued','sent','dry_run','failed','skipped')),
  error text,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

alter table public.radar_notifications enable row level security;
alter table public.radar_history enable row level security;
alter table public.radar_sources enable row level security;
alter table public.radar_review_items enable row level security;
alter table public.tracked_applications enable row level security;
alter table public.radar_prefs enable row level security;
alter table public.radar_outbox enable row level security;

-- Access model: the backend (service-role key) serves the public list, so nothing here needs to be open to
-- the browser. Direct reads are still allowed for published rows, but ONLY on public columns, so internal
-- fields (verified_by, created_at) and every other table stay private.
revoke all on public.radar_notifications, public.radar_history, public.radar_sources, public.radar_review_items,
  public.tracked_applications, public.radar_prefs, public.radar_outbox from anon, authenticated;

grant select (id, title, body, conducted_by, service, exam, opens, last_date, exam_date, confidence,
  source_url, official_apply_url, apply_label, status, verified_on, version, updated_at)
  on public.radar_notifications to anon, authenticated;

drop policy if exists radar_public_read on public.radar_notifications;
create policy radar_public_read on public.radar_notifications for select to anon, authenticated using (status = 'published');
-- No policies on any other table (RLS is on, so anon/authenticated see nothing). Only the service role reads or writes them.
-- If you add a column to radar_notifications for admin use, do NOT add it to the grant above.
