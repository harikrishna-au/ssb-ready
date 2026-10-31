# TASK 2 of 5: The rounds engine (tests, content banks, AI scoring quality)

Branch/worktree: `agent/2-rounds`.  Port hints: web 3102, backend 5102.

## Mission
Make every round match the real SSB and score honestly, with content in a database instead of hard-coded arrays. The practice sets are currently much shorter than the real tests and the AI scoring has no quality checks.

## Problems to solve
1. Real-format fidelity (each intro already promises "practice set"; close the gap behind a selectable mode):
   - TAT: 12 pictures (11 + 1 blank), 30 s look, 4 min write each.
   - WAT: 60 words, 15 s each.
   - SRT: 60 situations, 30 minutes total.
   - SDT: five paragraphs, about 15 minutes total (the app currently gives 12 min EACH).
   - PPDT and OIR already match; OIR needs a larger, tagged question bank.
   Offer "Quick practice" and "Full test" modes. Full test is the default for premium and the real format.
2. Content banks in Supabase: WAT words, SRT situations, OIR questions, lecturette topics, with tags/difficulty, an `active` flag and a review status. Endpoints to fetch random sets without repeating recent items for that user. Seed from the arrays currently inside `ssb_web/src/app/(app)/{wat,srt,lecturette}/page.tsx`; write a seeding script. Never ship answers to the client before submission (OIR `correct_answer_index` must stay server-side or be returned only after answering).
3. Picture metadata pipeline (code exists, never run): `ssb_backend/scripts/generate_image_metadata.js`, `services/storyImages.js`, migration `20261101000000_story_images.sql`. Once keys work, run it for all pictures, add an admin review screen (`/admin/pictures`, protected by a Clerk role or an allow-list env var) to edit metadata and flip `reviewed`, and make the evaluator prefer reviewed metadata. Cache picture lists per user session so a TAT set never repeats a picture.
4. Scoring quality: define one rubric per round (document it in `ssb_backend/docs/rubrics.md`), move prompts into versioned files, use structured outputs/JSON schema, validate and clamp every field, add `promptVersion` and `model` to stored results. Build a golden test set (at least 10 hand-written stories/answers per round with expected score bands) and an eval script that reports drift when prompts or models change.
5. Lecturette AI feedback: new endpoint scoring the transcript (structure, content, delivery) in the same format as other rounds; add it to the page and to history.
6. Mock interview v2: question plan drawn from the PIQ (family, education, hobbies, current affairs, motivation), follow-ups, an end-of-interview report (strengths, weaknesses, consistency with PIQ, 3 drills). Store interviews in history.
7. Consistency check across rounds: after a user has several attempts, produce an OLQ profile (the repo already has an unreviewed `olq-profile` page and `components/olq/radar-chart.tsx` added by someone else: review them, keep what is good, fix or remove the rest, and wire real data).
8. Cost and abuse controls: per-user daily AI quota (free vs premium via Agent 1's `GET /api/me`, stub it until it lands), response caching where safe, input length caps, retries with backoff, graceful degradation messages in the UI.

## You own
`ssb_backend/services/{aiService,evaluationOrchestrator,storyImages,content*}.js`, `ssb_backend/controllers/{evaluation*,ppdt,tat,test}*.js`, `ssb_backend/routes/{evaluation*,image*,content*}.js`, `ssb_backend/scripts/**`, `ssb_backend/docs/**`, new Supabase migrations named `*content*`/`*rounds*`, `ssb_web/src/app/(app)/{wat,srt,sdt,tat,ppdt,oir,lecturette,interview,history,olq-profile}/**`, `ssb_web/src/app/admin/**`, `ssb_web/src/lib/{images,use-history}.ts`, `ssb_web/src/components/olq/**`. You may extend `ssb_web/src/components/exam/ui.tsx` additively (new exports only).

## Interfaces
- Consume Agent 1: `GET /api/me` -> `{ premium }`.
- Provide Agent 3: a `npm test` script in `ssb_backend` (they wire it into CI).

## Needs from the human
A valid `OPENAI_API_KEY`, a working Supabase project. Until then use mocked clients (see the stub approach in earlier offline tests: stub `openai` and `config/supabase` through `require.cache`).

## Definition of done
- Full-format mode for TAT/WAT/SRT/SDT works and is clearly labelled; quick mode still exists.
- No hard-coded content arrays left in the page files; seeds committed.
- Golden-set eval script runs against a mocked and (if the key works) the real model and prints a report.
- Lecturette and interview v2 shipped with history entries.
- Honest note in the handoff about what was and was not tested against the real model.
