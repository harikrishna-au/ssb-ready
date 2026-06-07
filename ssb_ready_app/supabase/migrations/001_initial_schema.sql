-- =============================================================================
-- SSBReady – Initial Supabase Schema
-- Run this once in: Supabase Dashboard → SQL Editor → New Query → Run
--
-- NOTE: We use Firebase Auth (not Supabase Auth), so `user_id` is the
-- Firebase UID (text). RLS policies allow anon role with app-level
-- user-id enforcement. Tighten via Firebase→Supabase JWT bridge before
-- scaling past ~10k users.
-- =============================================================================

-- ─── Enable UUID extension ───────────────────────────────────────────────────
create extension if not exists "pgcrypto";

-- =============================================================================
-- 1. profiles — mirrors Firebase Auth user, owns userType + isPremium
-- =============================================================================
create table if not exists profiles (
  id           text        primary key,          -- Firebase UID
  email        text        not null default '',
  first_name   text        not null default '',
  last_name    text        not null default '',
  user_type    text        not null default '',
  is_premium   boolean     not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- Auto-update updated_at on any change
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at
  before update on profiles
  for each row execute function update_updated_at();

-- RLS
alter table profiles enable row level security;

create policy "profiles: anon full access"
  on profiles for all
  to anon
  using (true)
  with check (true);

-- =============================================================================
-- 2. test_history — every completed test result (WAT/SRT/TAT/PPDT/OIR/SDT)
-- =============================================================================
create table if not exists test_history (
  id             uuid        primary key default gen_random_uuid(),
  user_id        text        not null,             -- Firebase UID
  test_type      text        not null,             -- 'WAT'|'SRT'|'TAT'|'PPDT'|'OIR'|'SDT'
  score          integer     not null default 0,   -- 0 = N/A
  answered_count integer     not null default 0,
  total_count    integer     not null default 0,
  feedback       text        not null default '',
  completed_at   timestamptz not null default now()
);

create index if not exists test_history_user_id_completed_at
  on test_history (user_id, completed_at desc);

create index if not exists test_history_user_id_test_type_completed_at
  on test_history (user_id, test_type, completed_at desc);

-- RLS
alter table test_history enable row level security;

create policy "test_history: anon insert own"
  on test_history for insert
  to anon
  with check (user_id is not null and user_id <> '');

create policy "test_history: anon select own"
  on test_history for select
  to anon
  using (user_id is not null and user_id <> '');

-- =============================================================================
-- 3. piq_profiles — Personal Information Questionnaire (one per user)
-- =============================================================================
create table if not exists piq_profiles (
  user_id    text        primary key,  -- Firebase UID
  data       jsonb       not null default '{}',
  updated_at timestamptz not null default now()
);

create trigger piq_profiles_updated_at
  before update on piq_profiles
  for each row execute function update_updated_at();

-- RLS
alter table piq_profiles enable row level security;

create policy "piq_profiles: anon full access"
  on piq_profiles for all
  to anon
  using (true)
  with check (true);

-- =============================================================================
-- 4. oir_questions — Verbal & non-verbal IQ questions for OIR Practice
-- =============================================================================
create table if not exists oir_questions (
  id            uuid    primary key default gen_random_uuid(),
  text          text    not null,
  options       jsonb   not null default '[]',  -- ["option A", "option B", ...]
  correct_index integer not null default 0,
  category      text    not null default 'verbal',  -- 'verbal' | 'nonverbal'
  image_url     text
);

-- RLS — questions are public read-only
alter table oir_questions enable row level security;

create policy "oir_questions: anon read"
  on oir_questions for select
  to anon
  using (true);

-- =============================================================================
-- 5. Seed OIR questions (20 sample questions)
-- =============================================================================
insert into oir_questions (text, options, correct_index, category) values
  -- Verbal
  ('Choose the word most similar in meaning to VALIANT.',
   '["Cowardly","Brave","Weak","Lazy"]', 1, 'verbal'),

  ('Choose the word opposite in meaning to HOSTILE.',
   '["Friendly","Angry","Dangerous","Loud"]', 0, 'verbal'),

  ('Complete the series: 2, 6, 12, 20, 30, __?',
   '["40","42","44","45"]', 1, 'verbal'),

  ('If CAT = 3120 then DOG = ?',
   '["4157","4167","4715","4071"]', 1, 'verbal'),

  ('Rearrange RAATCPHU to form a meaningful word.',
   '["PARACHUT","PARACHUTE","CAPTURA","HARACPUT"]', 1, 'verbal'),

  ('A is the brother of B. B is the sister of C. C is the father of D. How is A related to D?',
   '["Uncle","Father","Grandfather","Brother"]', 0, 'verbal'),

  ('Find the odd one out: Cobra, Viper, Crocodile, Python.',
   '["Cobra","Viper","Crocodile","Python"]', 2, 'verbal'),

  ('If in a code SOLDIER = VROGLHU, then CAPTAIN = ?',
   '["FDSWDLQ","FZSWDLQ","FDSWDQD","FDSZDLQ"]', 0, 'verbal'),

  ('Pointing to a woman, Arjun said "She is the daughter of the only child of my grandfather." How is the woman related to Arjun?',
   '["Sister","Niece","Aunt","Daughter"]', 0, 'verbal'),

  ('Complete the analogy: Sword : Scabbard :: Gun : ?',
   '["Trigger","Holster","Bullet","Barrel"]', 1, 'verbal'),

  -- Non-verbal
  ('What is the next number in the series: 1, 4, 9, 16, 25, ?',
   '["30","36","49","35"]', 1, 'nonverbal'),

  ('If × means +, + means ÷, ÷ means − and − means ×, then: 8 × 4 − 2 ÷ 6 + 3 = ?',
   '["14","16","20","22"]', 1, 'nonverbal'),

  ('A train 125 m long passes a man running at 5 km/h in the same direction in 10 seconds. Speed of train?',
   '["45 km/h","50 km/h","54 km/h","60 km/h"]', 1, 'nonverbal'),

  ('How many triangles are in a figure made of 3 rows of triangles where row 1 has 1, row 2 has 3, row 3 has 5 triangles?',
   '["9","13","18","27"]', 3, 'nonverbal'),

  ('Two numbers are in ratio 3:5. Their LCM is 75. Find the smaller number.',
   '["15","25","45","10"]', 0, 'nonverbal'),

  ('A clock shows 3:15. What is the angle between the hour and minute hands?',
   '["0°","7.5°","52.5°","90°"]', 1, 'nonverbal'),

  ('The average of 5 consecutive odd numbers is 11. What is the largest?',
   '["13","15","17","11"]', 1, 'nonverbal'),

  ('A boat covers 24 km upstream in 6 hours and 36 km downstream in 6 hours. Speed of stream?',
   '["1 km/h","2 km/h","3 km/h","4 km/h"]', 0, 'nonverbal'),

  ('How many 3-digit numbers are divisible by 7?',
   '["105","128","142","156"]', 1, 'nonverbal'),

  ('If ΔABC ~ ΔDEF with ratio 2:3, and area of ΔABC = 16 cm², area of ΔDEF = ?',
   '["24 cm²","36 cm²","48 cm²","32 cm²"]', 1, 'nonverbal')

on conflict do nothing;
