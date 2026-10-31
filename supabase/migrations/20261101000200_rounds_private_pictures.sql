-- Security fix: stop exposing the full PPDT/TAT picture set through a public bucket.
--
-- Before: 'ppdt-tat-images' was public and file names are guessable (ppdt/ppdt1.jpg ... ppdt45.jpg),
-- so anyone could fetch the premium pictures directly and bypass the free limit of 5.
--
-- After:
--   * 'ppdt-tat-images'   PRIVATE. Holds all pictures. Reached only through short-lived signed URLs
--                         that the backend issues (GET /api/images) for pictures the caller's plan allows.
--   * 'ppdt-tat-preview'  PUBLIC. Holds ONLY the 5 free pictures, same object paths (ppdt/ppdt1.jpg ...).
--
-- ORDER OF OPERATIONS (see docs/handoff/2.md):
--   1. Run this migration.
--   2. Run: node ssb_backend/scripts/sync_preview_bucket.js   (copies the 5 free pictures into the preview bucket)
--   3. Ship the mobile app change (free pictures from the preview bucket, premium pictures via GET /api/images).
-- Until step 3 ships, installed mobile builds cannot load premium pictures and load free ones from the old bucket
-- name, which is now private. If you cannot accept that, delay the "set public = false" line below.

insert into storage.buckets (id, name, public)
values ('ppdt-tat-preview', 'ppdt-tat-preview', true)
on conflict (id) do update set public = true;

update storage.buckets set public = false where id = 'ppdt-tat-images';

-- No policy on storage.objects is added for 'ppdt-tat-images': the backend reads/signs with its Supabase key,
-- and clients without a signed URL get nothing. The preview bucket only needs the default public read of a public bucket.
