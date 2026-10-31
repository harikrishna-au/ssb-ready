# TASK 4 of 5: Radar 2.0 (data, admin, tracker and alerts)

Branch/worktree: `agent/4-radar`.  Port hints: web 3104, backend 5104.

## Mission
Turn Radar from a hand-edited TypeScript file into a reliable, maintained data product: a database, an admin workflow, a server-side application tracker and deadline reminders by email. A wrong or missing last date can cost an aspirant their application, so accuracy and clear provenance matter more than volume.

## Current state
`ssb_web/src/data/radar.ts` holds 7 entries (NDA/CDS/AFCAT 2027 cycles plus closed 2026 ones) with `confidence: official | tentative | expected`. The tracker keeps application status in Clerk `unsafeMetadata` (`ssb_web/src/lib/use-tracker.ts`, max 8 KB, client-writable). `Radar` pages: `/radar` (public, shows inside the app shell when signed in), `/applications`, a landing section, a dashboard panel (`components/radar/**`).

## Problems to solve
1. Move notifications to Postgres (Supabase): `radar_notifications` with title, body (UPSC, IAF, Army, Navy, state/CAPF...), service, exam, opens, last_date, exam_date, confidence, source_url, official_apply_url, status (draft/published/archived), verified_by, verified_on, change history. Migration + RLS (public read of published rows only).
2. Admin console at `/admin/radar` (role-protected via a Clerk role/allow-list env var; coordinate with Agent 2 who also adds `/admin/*`: share a tiny `requireAdmin()` helper in `ssb_web/src/lib/admin.ts` that you create first and they reuse). Create/edit/publish/archive, "verified on" stamping, diff view of changes, and a checklist that forces a source link before publishing.
3. Coverage: add real, verified entries beyond UPSC/AFCAT: Indian Army (TES 10+2, TGC, NCC special entry, SSC Tech/Non-tech, TA), Indian Navy (10+2 B.Tech cadet entry, SSC), Air Force (non-AFCAT entries), CAPF (UPSC CAPF AC), Agniveer rounds, NDA/CDS/AFCAT. Use only official sources, record the source URL and the date you checked. If you cannot verify a date, store it as expected/tentative or leave it empty. Never invent a date.
4. Source watcher (assistive, not autonomous): a scheduled job that fetches a list of official pages (UPSC, afcat.cdac.in, joinindianarmy.nic.in, joinindiannavy.gov.in, careerindianairforce.cdac.in, etc.), hashes the content, and when something changes creates a "needs review" item in the admin console with the diff and a link. A human publishes. Respect robots.txt, rate-limit, identify the user agent.
5. Server-side tracker: replace Clerk-metadata storage with a `tracked_applications` table (user id, notification id, status, note, timestamps) behind authenticated endpoints, with a one-time migration of existing Clerk-metadata entries on first load. Keep the optimistic-update + serial-write behaviour from `use-tracker.ts`. Keep the same stages (Saved, Applied, Admit card received, Written exam done, Result out, SSB call received, Final result).
6. Reminders: email (Resend or similar behind an env flag) and optional web push for tracked notifications: at 7, 3 and 1 day before the last date, when dates change, and when a notification you track is published/updated. Per-user preferences, one-click unsubscribe, a daily digest option, timezone Asia/Kolkata. Use a cron endpoint (Vercel Cron or Render cron) secured by a secret, with idempotency so nobody gets duplicates.
7. Calendar and sharing: `.ics` download and "add to Google Calendar" link per notification; a public RSS/JSON feed; per-exam SEO landing pages (`/radar/nda`, `/radar/cds`, `/radar/afcat`) with structured data, "Last updated" stamps and breadcrumbs.
8. UX polish on `/radar`, `/applications` and the dashboard panel: filters by service/exam, search, a deadline timeline view, an "I applied" quick action, empty and error states.

## You own
`ssb_web/src/data/radar*`, `ssb_web/src/components/radar/**`, `ssb_web/src/app/radar/**`, `ssb_web/src/app/admin/radar/**`, `ssb_web/src/app/(app)/applications/**`, `ssb_web/src/lib/{use-tracker,admin}.ts`, `ssb_backend/routes/radar*.js`, `ssb_backend/services/{radar,reminders,watcher}*.js`, Supabase migrations named `*radar*`, cron route handlers.

## Interfaces
- Public read API `GET /api/radar` (published rows). Agent 5 uses it on the landing page.
- Needs `requireAdmin()` shared with Agent 2 (you create it, they import it).

## Needs from the human
Email provider key and a verified sending domain, a working Supabase project, the list of official pages they trust. Until then develop with a local email "outbox" table and a dry-run mode.

## Definition of done
- Radar and the tracker run from the database; the old data file is only a seed script.
- Every published entry has a source URL and a verified-on date. Entries you could not verify are clearly labelled.
- Reminder job is idempotent (tested), with unsubscribe working.
- Unit tests for status/countdown logic, reminder scheduling windows and dedupe; migration for existing Clerk-metadata trackers tested.
