# ReadyKadet: project status and backlog

Branch: `integration/merged` (all five agent branches merged). Written 31 Oct 2026.

## How it was checked
| Check | Result |
|---|---|
| Backend tests (`cd ssb_backend && npm test`) | 152 of 152 pass (all against stand-ins, no real Supabase/OpenAI/Razorpay) |
| Web unit tests (`cd ssb_web && npx vitest run`) | 60 of 60 pass |
| Web typecheck / lint / production build | clean / 0 errors (3 unused-variable warnings) / builds, 55 routes |
| Run locally | backend on :5001 and web on :3000 start; public pages return 200, signed-in pages redirect to sign-in |
| **Not checked at all** | anything against real Supabase, Firestore, OpenAI, Razorpay, Clerk production, email; every signed-in screen in a browser; the mobile app |

## What each agent added

**Agent 1: payments and identity (finished)**
- Razorpay checkout for the Rs 299 Lifetime plan, with server-side order creation, signature check, webhook (captured, paid, failed, refunded), idempotent grants, receipts email behind a flag.
- One trusted premium check across a person's linked logins (Clerk and Firebase, linked only by the same verified email). `GET /api/me`.
- Payment refused on the server unless the PIQ is complete. Amount fixed server-side.
- `/premium` and `/billing` pages, `usePremium()`, sidebar Lifetime card hidden for premium users.
- The `lifetime-premium` edge function accepts Clerk tokens as well as Firebase.

**Agent 2: rounds engine (about a third done)**
- Pictures bucket made private; public 5-picture preview bucket; signed links for premium; per-picture tokens; the server rejects pictures outside the user's plan.
- Content banks in Supabase (WAT words, SRT situations, OIR questions, lecturette topics) with no-repeat random fetch; page files no longer hold the lists.
- Quick and full test modes in the UI.
- OIR scoring moved to the server, answer checks tied to the set that was issued, verified-only leaderboard (committed as unfinished work, covered by the passing tests).
- Versioned prompt files and a golden-example scoring script (`npm run eval`).

**Agent 3: platform and security (partly done, the most solid)**
- Every API route now has its own guard (login, rate limit, input validation). Case-sensitive routing. A test fails the build if any `/api` route is unguarded.
- Security headers, CORS allow-list, request ids and logs, health checks, Sentry hooks (backend).
- Account export and delete endpoints (backend only).
- 9 backend test files and 5 web unit test files.

**Agent 4: Radar 2.0 (mostly built, never checked live)**
- Radar in a database, with public JSON/RSS/calendar feeds, reminders by email to verified addresses with double opt-in and one-click unsubscribe.
- Source watcher that flags changes on official pages for a human to review.
- Server-side application tracker routes with an import from the old Clerk-metadata tracker.
- Admin console at `/admin/radar`, per-exam pages (`/radar/nda`, `/cds`, `/afcat`), timeline and calendar links, shared `requireAdmin()`.

**Agent 5: brand and content (mostly written, not fact-checked)**
- New logo mark, wordmark, favicon set, app icons, share image, web manifest, brand kit docs.
- Pricing page; NDA, CDS, AFCAT and CAPF pages; about 31 new blog posts, plus category, tag and page-number blog pages, RSS feed; newsletter endpoint; invite page; on-brand not-found page.

## Fixes made while merging (so you know what changed)
- Payment and Radar and content routes moved onto Agent 3's per-route guard; three allow-listed on purpose (payment webhook, Radar public feeds, secret-protected cron).
- Webhook mounted before the JSON parser; routing strictness set before it so wrong-case URLs can't skip checks.
- Two migrations shared a version number; Radar's is now `20261102000100`.
- `/pricing`, exam pages, `/invite` and the manifest were redirecting to sign-in; now public.
- Removed `force-static` from the RSS route (breaks the build here). Agent 2's picture test stubs the new premium service.

## Auth and data: Clerk + Supabase only (1 Nov 2026)
- Login is Clerk only. All user data (results, history, PIQ, profiles) is in Supabase (`app_docs`, private, service-role key only). There is **no Firebase or Firestore** in `ssb_web`, `ssb_backend` or `supabase/`.
- Removed: the `firebase-admin` package, the Firebase token path, Firebase/Clerk account linking (`/api/me/link-identity`, `user_identities`), the Firestore copy script and the legacy OIR import/purge scripts (they were built around Firestore; use the Supabase content bank and `scripts/seed_content.js`).
- Renamed: `/api/firestore/*` is now `/api/data/*`; `req.firebaseUser` is `req.authUser`; export JSON key `firestore` is `documents`.
- **The Flutter app (`ssb_ready_app`) still uses Firebase login and the old `/api/firestore/*` paths. It will not work against this backend until it is moved to Clerk.**
- Leftover Firebase files you can delete when you are ready: `firebase/`, `firebase.json`, `_ref_gbar/`, and the Firebase mentions in `docs/agents/`, `docs/handoff/` and `docs/SECURITY.md` (historical).

## Backend deployed on AWS (1 Nov 2026)
- Live: `https://ajqqwsb247x3hpmugniuho37p40wbkcs.lambda-url.ap-southeast-2.on.aws` (Lambda + Function URL, Sydney). Checked from the internet: database ok, Supabase ok, protected routes ask for login, CORS allows only the Vercel site, 66 of 71 endpoints answer (the rest are the readiness check, which fails only because of the OpenAI key, and 3 public write routes not probed).
- Redeploy with `ssb_backend/scripts/deploy_lambda.sh [--env]`. Details in `ssb_backend/DEPLOY.md`.
- Still to do: set `NEXT_PUBLIC_BACKEND_URL` in Vercel and redeploy; valid `OPENAI_API_KEY` then `scripts/deploy_lambda.sh --env`; a cost budget alert; schedule the Radar jobs (EventBridge) once Radar has verified data and an email provider; Razorpay keys and webhook secret when payments go live.

## BACKLOG: what is NOT done (work through this gradually)

### A. Needs you first (nothing below works for real until these)
- [ ] **Database moved from Firestore to Supabase.** Apply `supabase/migrations/20261103000100_app_docs.sql`, then set `SUPABASE_SERVICE_ROLE_KEY` (the service-role key, never the anon key) on the backend host. The table is private; the backend refuses the anon key. If real mobile users already have data in Firestore, run `scripts/firestore_to_supabase.js --dry-run` then for real (needs the Firebase service-account JSON once). Firestore credentials are no longer needed for data.
- [x] Supabase: the backend `.env` now points at a project that resolves and holds a service-role key (fixed 1 Nov). Still to do: apply the migrations in `supabase/migrations/` to that project (start with `20261103000100_app_docs.sql`), and point the web app's `NEXT_PUBLIC_SUPABASE_URL` / anon key at the same project.
- [ ] Valid `OPENAI_API_KEY` (current one is rejected).
- [ ] Rotate every secret that was pasted into chat. Never commit `.env`.
- [ ] Apply all Supabase migrations in order; run the preview-bucket sync script; run the picture-metadata generator and review its output.
- [ ] Razorpay test keys and webhook; set the new env vars (see `docs/handoff/1.md`); run one test-mode purchase.
- [ ] Email provider key and a verified sending domain (Radar reminders, receipts).
- [ ] Buy the domain, set `NEXT_PUBLIC_SITE_URL`, replace the placeholder support email in `ssb_web/src/lib/legal.ts`.
- [ ] Production Clerk instance (the app is on development keys).
- [ ] Legal text (terms, refunds, privacy) reviewed by a human; the 7-day refund window was a placeholder.
- [ ] Update the Flutter app for the private pictures bucket (see `docs/handoff/2.md`), or installed builds lose premium pictures.

### B. Agent 2 remaining
- [ ] Full-length tests behind the full mode: confirm TAT 12, WAT 60, SRT 60 / 30 min, SDT ~15 min total are really wired.
- [ ] Lecturette AI feedback endpoint and page wiring.
- [ ] Mock interview v2 (PIQ-driven plan, end-of-interview report).
- [ ] Per-user daily AI usage limits (free vs premium).
- [ ] `/admin/pictures` review screen for picture metadata.
- [ ] Review the unreviewed OLQ files (`olq-profile` page, `components/olq`, `lib/olq-*.ts`) added by an unknown source.
- [ ] Rubrics document and a full golden set against the real model.

### C. Agent 3 remaining (launch readiness)
- [ ] `docs/DEPLOY.md`, `.env.example` for web and backend, fix `render.yaml`.
- [ ] CI (GitHub Actions): lint, typecheck, build, tests, dependency audit, secret scan; PR template, CODEOWNERS, CHANGELOG.
- [ ] Playwright end-to-end tests, visual checks, accessibility (axe) checks, Lighthouse budgets.
- [ ] Web `/api/health`; `/profile` export and delete buttons (backend endpoints exist).
- [ ] Error pages (`error.tsx`, `global-error.tsx`); analytics with consent; Sentry config for the web app.
- [ ] Finish `docs/SECURITY.md` (it is marked partial). Review `oir-questions` bucket (still public).

### D. Agent 4 remaining
- [ ] Verify every Radar entry against an official source and record the date checked; there is no handoff note from this agent, so check each entry.
- [ ] Switch the web tracker UI from Clerk metadata to the server tracker, then retire the old code.
- [ ] More entries: Army (TES, TGC, NCC, SSC), Navy, Air Force non-AFCAT, CAPF, Agniveer.
- [ ] Per-route input validation for tracker and preference routes; UX polish (search, filters).
- [ ] Idempotency and unsubscribe flows tested against a real email provider.

### E. Agent 5 remaining
- [ ] Fact-check every new blog post (sources, dates, eligibility); nothing has been reviewed.
- [ ] Landing page v2 with real product screenshots; lead-magnet PDF; visual QA at phone, tablet and desktop widths.
- [ ] Hindi versions (optional).

### F. Agent 1 remaining (small)
- [ ] Mobile app reading web purchases; chargebacks and disputes; PDF invoices; admin tool for linking accounts; per-process rate limits need a shared store when you run more than one server.

## Notes
- Unreviewed files from an unknown source: `ssb_web/src/app/(app)/olq-profile`, `src/components/olq`, `src/lib/olq-*.ts`, `src/lib/supabase/*`, and `supabase/migrations/20261101000100_storage_buckets.sql` (this migration made the pictures bucket public; Agent 2's later migration undoes that).
- Original agent task files and the launcher script: `docs/agents/`.
