-- Served-set binding for OIR: a user may only check answers for questions in a set the server issued to them,
-- once per question, before the set expires. The score is computed from these rows, never from the client.

create table if not exists public.content_sets (
  set_id uuid primary key default gen_random_uuid(),
  user_id text not null,
  bank text not null,
  item_ids text[] not null,
  answers jsonb not null default '{}'::jsonb,   -- { "<question id>": { "index": 2, "correct": true } }
  issued_at timestamptz not null default now(),
  expires_at timestamptz not null
);
create index if not exists content_sets_user on public.content_sets (user_id, bank, issued_at desc);
alter table public.content_sets enable row level security;  -- no policies: backend (service role) only

-- Atomically records one answer. Returns false if the question was already answered, the set is not the
-- user's, the set expired, or the question is not in the set. Two parallel checks cannot both succeed.
create or replace function public.content_record_answer(p_set uuid, p_user text, p_question text, p_index int, p_correct boolean)
returns boolean language plpgsql security definer set search_path = public as $$
declare n int;
begin
  update public.content_sets
     set answers = answers || jsonb_build_object(p_question, jsonb_build_object('index', p_index, 'correct', p_correct))
   where set_id = p_set and user_id = p_user and expires_at > now()
     and p_question = any(item_ids) and not (answers ? p_question);
  get diagnostics n = row_count;
  return n = 1;
end $$;
revoke all on function public.content_record_answer(uuid, text, text, int, boolean) from public, anon, authenticated;
