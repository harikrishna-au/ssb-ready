-- Reference metadata for every PPDT / TAT picture in the storage bucket.
-- The evaluator compares a candidate's story against this, so it can judge fit with the picture.
-- Generate rows with: node ssb_backend/scripts/generate_image_metadata.js (see its header).

create table if not exists public.story_images (
  id text primary key,                          -- storage object path, e.g. 'ppdt/ppdt12.jpg'
  bucket text not null default 'ppdt-tat-images',
  path text not null,
  uses text[] not null default '{ppdt,tat}',    -- which tests may show this picture
  scene text not null,                          -- neutral description of what is visible
  characters jsonb not null default '[]'::jsonb, -- [{ "who": "...", "age": "...", "gender": "...", "doing": "..." }]
  mood text,
  setting text,
  key_elements text[] not null default '{}',
  plausible_themes text[] not null default '{}',
  positive_resolutions text[] not null default '{}',
  olq_cues text[] not null default '{}',
  reviewed boolean not null default false,      -- flip to true after you have checked the generated text
  updated_at timestamptz not null default now()
);

alter table public.story_images enable row level security;

-- The backend reads with the anon key. Rows hold scene descriptions only, no candidate data.
-- If you switch the backend to the service-role key, you can drop this policy.
drop policy if exists story_images_read on public.story_images;
create policy story_images_read on public.story_images for select to anon, authenticated using (true);
