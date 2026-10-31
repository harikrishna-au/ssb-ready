# Shared context (read first, applies to every task)

## Product
ReadyKadet: an SSB (Services Selection Board) preparation product for Indian NDA / CDS / AFCAT / CAPF aspirants. Timed practice for OIR, PPDT, TAT, WAT, SRT, SDT, Lecturette and an AI mock interview, scored by AI against the 15 Officer Like Qualities. Also a "Radar" of recruitment dates, a PIQ form, a blog, and a Lifetime plan (Rs 299 one-time).

## Repository (monorepo at the repo root)
- `ssb_web/`  Next.js 16 App Router, TypeScript, Tailwind 4, shadcn/ui, Clerk auth, zustand. THE product going forward.
- `ssb_backend/`  Express (CommonJS). Firebase Admin + Firestore for results/PIQ, Supabase (storage bucket + premium tables), OpenAI for scoring.
- `ssb_ready_app/`  Flutter mobile app (legacy: Firebase auth, still named "SSB Ready"). Do not break it.
- `supabase/`  migrations and the `lifetime-premium` edge function (Razorpay).

## Read these before changing anything
- `ssb_web/src/lib/{store,api,use-history,use-piq,use-tracker,piq,tests,nav}.ts`  state, API client, shared definitions.
- `ssb_web/src/components/exam/ui.tsx`  shared exam-hall UI kit. `ssb_web/src/components/app-shell.tsx`, `app-nav.tsx`.
- `ssb_backend/middleware/firebaseAuthMiddleware.js`  accepts a Clerk session token OR a Firebase ID token and sets `req.firebaseUser.uid` (the Clerk user id for web users).
- `ssb_backend/services/{aiService,storyImages,evaluationOrchestrator}.js` and `controllers/`.

## Rules that already bit us (Next 16, cacheComponents)
- No `Date.now()`, `new Date()` or `Math.random()` while rendering a Client Component. Compute them in handlers/effects, or after data has loaded, or on the server after `await connection()`.
- `usePathname`, `useSearchParams`, `params` must sit under a `<Suspense>` boundary.
- React lint rules are strict: no setState directly in an effect body, no ref writes during render. Run `npm run lint`.
- Design: dark theme, brand blue `#4b7bf5`, brass `#f5a623`, Big Shoulders (display) + Public Sans (body). Sentence case, plain language, no fake testimonials, no invented statistics. Keep tap targets >= 44px, visible focus, respect reduced motion.

## Known blockers (owned by the human, not you)
- Supabase project URL in `ssb_backend/.env` does not resolve (NXDOMAIN). Images/premium lookups fail until fixed.
- `OPENAI_API_KEY` in `ssb_backend/.env` is rejected (401). All AI scoring fails until replaced.
- Clerk is on development keys. The real domain is not bought yet. `support@readykadet.com` is a placeholder.
- Several secrets were pasted into a chat and must be rotated before launch.
When a blocker stops you, build and test everything around it with stubs/mocks, say clearly what you could not verify, and move on. Never fake a passing result.

## Working agreement (5 agents run in parallel)
- You work ONLY in your own git worktree/branch (named in your task). Never switch branches in another agent's folder.
- Edit only the files in "You own". If you must touch a file outside it, keep the change tiny, additive, and list it in your handoff. Never reformat or rename files you do not own.
- Cross-agent interfaces are listed in your task. Build to the interface, not to the other agent's internals.
- Before saying done: `cd ssb_web && npm run lint && npx tsc --noEmit && npm run build`; for backend, `node --check` every file you changed plus the tests you wrote. Do not leave failing builds.
- Commit in small, clear commits. Do not commit secrets, `.env*`, keys, or `node_modules`.
- Be honest in reporting: if something was not tested, say so. No placeholder data presented as real.
- Finish by writing `docs/handoff/<your-task-number>.md`: what changed, how to run/verify it, env vars and migrations needed, open issues, anything you left for the human.
