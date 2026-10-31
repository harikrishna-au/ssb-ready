# Security review (Agent 3) - partial

Status values: fixed, assigned, open, accepted. Backend fixes are covered by `ssb_backend/tests` (67 tests, `npm test`).

| # | Finding | Severity | Status |
|---|---------|----------|--------|
| 1 | Policy-by-path-string bypass: the first version of `middleware/platform.js` looked up validation and rate limits in a table keyed on method + path. Wrong case (`/API/...`), double slashes or similar spellings could reach the handler and skip validation and limits. | High | fixed. Auth, limits and schema are now attached to each route by `guard()` (`middleware/guard.js`). Routers and the app are case sensitive. `tests/guard.test.js` walks the router stack and fails if any `/api` route (except health) lacks a guard, and tests wrong-case, trailing slash, double slash, `%2f`, HEAD/OPTIONS. Other path-string uses (OCR body size parser, access-log health skip) only fail stricter or only affect logs. |
| 2 | Other candidates' stories and AI feedback were returned in leaderboards and sent into AI prompts (privacy leak plus stored prompt injection). | High | fixed (PPDT, TAT, WAT, SRT). UI should show a placeholder for empty `storyPreview` (Agent 1). |
| 3 | `pictures` bucket `ppdt-tat-images` is public (`20261101000100_storage_buckets.sql`). File names are guessable, so the 5-picture free limit of `GET /api/images` can be bypassed by requesting URLs directly. | High | assigned to Agent 2 (private bucket, signed URLs, public 5-picture preview bucket). Not duplicated here. Regression test idea: as a free user, fetch `/storage/v1/object/public/ppdt-tat-images/ppdt/<6th image>` anonymously and expect 400/403/404. |
| 4 | Firebase ID token failures returned 500 instead of 401. | Medium | fixed |
| 5 | Mass assignment: result, PIQ and profile routes stored any client fields (e.g. `isPremium`). | Medium | fixed (zod schemas strip unknown keys; size caps). |
| 6 | No body limits (15 MB everywhere), CORS `*` with credentials by default, no helmet, no rate limits. | Medium | fixed. 1 MB default, 8 MB for OCR only, CORS allow-list from `CORS_ORIGIN` (none allowed in production if unset), helmet, per-IP and per-user limits (in memory, single instance). |
| 7 | AI cost abuse (unbounded `chatHistory`, per-user spend). | Medium | fixed: caps plus burst (20/5 min) and daily (150) limits per user, env-tunable. |
| 8 | Logs could contain stories/tokens. | Medium | fixed: JSON logger scrubs sensitive keys, tokens, emails. |
| 9 | Privacy promises: no export or delete. | Medium | backend fixed (`GET /api/account/export`, `DELETE /api/account`, tested). Web UI on `/profile` NOT built. |
| 10 | Leaderboard score is client-writable via `/api/firestore/*/results`. | Low | accepted for now (only scores are shown). |
| 11 | `google-services.json` with a Firebase API key is in git history. | Low | open: restrict the key by package name and SHA in Google Cloud. Not a secret by design. |
| 12 | Secrets pasted in chat (Supabase, OpenAI, Clerk, Razorpay, Firebase service account). | High | open, human: rotate all before launch. |
| 13 | Payment records kept after account deletion (identity and gateway payload stripped). | Info | accepted, needs legal confirmation. |

Not done: `/api/health` on the web, retention policy text, encryption-at-rest write-up, dependency audit results.
