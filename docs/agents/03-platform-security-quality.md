# TASK 3 of 5: Platform, security, quality and launch readiness

Branch/worktree: `agent/3-platform`.  Port hints: web 3103, backend 5103.

## Mission
Make the product safe to put on the internet and keep it that way: deploys, CI, tests, monitoring, security review, privacy promises kept, performance and accessibility. You are the quality gate for the other four agents.

## Problems to solve
1. Deployment: web on Vercel, backend on Render (`render.yaml` exists, check it), Supabase for storage. Write `docs/DEPLOY.md` with exact steps, env var tables (every var, where it goes, which are secret), preview environments per PR, and a rollback plan. Add a `/api/health` that checks Firestore, Supabase and OpenAI reachability without leaking details.
2. CI (GitHub Actions): on every PR run web lint + typecheck + build, backend syntax check + `npm test`, a dependency audit, and a secret scan (gitleaks). Block merges on failure. Cache dependencies.
3. Tests, the real gap (there are none): 
   - Vitest unit tests for `ssb_web/src/lib/{piq,use-countdown,tests,nav,store}`.
   - Playwright end-to-end with Clerk testing tokens: sign up/in, onboarding, PIQ save, run a mocked WAT, history refresh, Radar track/untrack, blog pages, redirects for signed-out users. Mock the backend with a small fixture server or MSW so tests do not need OpenAI/Supabase.
   - Visual regression screenshots at 375, 768 and 1280 px for the main pages.
   - Backend tests for auth middleware (Clerk token, Firebase token, expired, forged), `ensureOwner` on every `/api/firestore/*` route, rate limits.
4. Security review and fixes, written up in `docs/SECURITY.md`:
   - Authorisation on EVERY endpoint (a user must never read or write another user's results/PIQ; check `userId` params against the token).
   - Input validation (zod or similar) on all POST bodies, body-size limits, CORS locked to real origins, `helmet`, per-IP and per-user rate limits (the repo has a `rate_limiter` idea in git history: reuse it).
   - Prompt-injection and abuse review of AI endpoints; make sure no secrets or other users' data can leak into prompts.
   - PII: PIQ and stories are personal data. Encryption at rest assumptions, log scrubbing (no stories/PIQ in logs), retention.
   - Keep the privacy promises: build "Download my data" and "Delete my account and data" (Clerk user + Firestore docs + Supabase rows), reachable from `/profile`.
   - Rotation checklist for every secret that was ever pasted in a chat or committed; add a `.env.example` for web and backend with no real values.
5. Observability: Sentry (web + backend) with source maps and PII scrubbing, structured logs with request ids, uptime checks, a simple privacy-friendly analytics (Plausible or PostHog with consent) and event names for the key funnel (signup, onboarding done, first test, PIQ done, paywall seen, paid).
6. Performance and accessibility: Lighthouse budgets in CI (LCP, CLS, TBT), image optimisation (`next/image` for blog/landing), font loading, bundle analysis; axe checks in Playwright; keyboard-only pass on every flow; fix what you find in components you may edit (listed below).
7. Hygiene: `suppressHydrationWarning` is already on `<body>`; make sure the dev log is clean (no unhandled rejections, no Next instant-navigation warnings). Add error boundaries (`error.tsx`, `not-found.tsx`, `global-error.tsx`) with on-brand pages.
8. Branch and release process: conventional commits, PR template, CODEOWNERS, a `CHANGELOG.md`.

## You own
`.github/**`, `docs/{DEPLOY,SECURITY}.md`, `render.yaml`, `ssb_web/{vitest,playwright}.config.*`, `ssb_web/tests/**`, `ssb_web/src/app/{error,not-found,global-error}.tsx`, `ssb_web/src/instrumentation*.ts`, `ssb_backend/middleware/**` (except the Clerk/Firebase auth logic: you may harden and test it but keep behaviour), `ssb_backend/config/**`, `ssb_backend/tests/**`, `.env.example` files, `ssb_web/src/app/(app)/profile/**` (data export/delete only).

## Interfaces
- Provide everyone: the `npm test` conventions and CI. Other agents add tests inside your harness.
- Consume: nothing blocks you, start immediately.

## Needs from the human
Vercel and Render accounts, GitHub repo admin for secrets/branch protection, Sentry project, final domain. Until then write everything so it only needs env vars filled in.

## Definition of done
- CI green on a PR that contains your work, with real tests (list counts in the handoff).
- `docs/SECURITY.md` lists each finding, severity, status (fixed/accepted/open). Anything cross-user is fixed, not just documented.
- Data export and deletion work (tested with a throwaway account).
- Lighthouse >= 90 on landing and blog (performance and accessibility), or the reasons listed.
