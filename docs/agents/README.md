# Running the five agents

| # | Agent task | Branch | Ports (web / backend) |
|---|---|---|---|
| 1 | Payments, identity, entitlements | `agent/1-payments` | 3101 / 5101 |
| 2 | Rounds engine, content banks, AI scoring | `agent/2-rounds` | 3102 / 5102 |
| 3 | Platform, security, tests, CI, deploy | `agent/3-platform` | 3103 / 5103 |
| 4 | Radar 2.0: data, admin, tracker, reminders | `agent/4-radar` | 3104 / 5104 |
| 5 | Brand, marketing site, content, SEO | `agent/5-brand` | 3105 / 5105 |

## 0. Before you start (10 minutes, saves hours)
1. Fix the two blockers the agents can't: a working `SUPABASE_URL` and a valid `OPENAI_API_KEY` in `ssb_backend/.env`. Without them, agents 1, 2 and 4 build against mocks and say so.
2. Commit a baseline (worktrees are made from committed code, and `ssb_web/` is not tracked yet):
   ```
   cd ~/PROJECTS/ssb
   git add -A && git status        # confirm no .env or key files are listed
   git commit -m "chore: baseline before parallel agent work"
   ```

## 1. Create the five workspaces (starts no agents)
```
./docs/agents/start-agents.sh setup
```
Each agent gets its own folder under `../ssb-agents/agent-N`, its own branch, its own ports, its own copy of your env files and its own `node_modules`, plus an `AGENT_TASK.md` with the shared rules and its task.

## 2. Start all five at once
```
./docs/agents/start-agents.sh launch
```
Opens five Terminal windows, each running `claude` with a one-line prompt that tells it to read `AGENT_TASK.md`. Approve permission prompts in each window.

Prefer manual control? In five terminals:
```
cd ../ssb-agents/agent-1 && claude "Read AGENT_TASK.md completely, then carry out the task. Work only in this folder."
```
(repeat for agent-2 … agent-5)

## 3. Watch progress
```
./docs/agents/start-agents.sh status
```
Each agent finishes by writing `docs/handoff/<n>.md` in its own worktree.

## 4. Merge in this order (fewest conflicts)
1. **Agent 3** first: it adds CI and the test harness the others then use.
2. **Agent 1**, then **Agent 4** (both add migrations and backend routes).
3. **Agent 2**.
4. **Agent 5** last (touches the most public files).

Merge one branch at a time into your integration branch, run `npm run lint && npx tsc --noEmit && npm run build` in `ssb_web` after each, and fix conflicts before the next. Expected hot spots, all small additive edits: `ssb_backend/app.js` (route registration), `ssb_web/src/lib/store.ts`, `ssb_web/src/components/app-nav.tsx`, `ssb_web/src/app/layout.tsx`, both `package.json` files and lockfiles (regenerate lockfiles instead of hand-merging).

## 5. Clean up
```
./docs/agents/start-agents.sh clean      # removes worktrees, keeps the branches
```

## Things to know
- Five long-running agents use a lot of your Claude usage. If that's a concern, start with 3, 1 and 5 (no external keys needed) and add 2 and 4 once the keys work.
- Someone or something else added `ssb_web/src/app/(app)/olq-profile`, `components/olq`, `lib/olq-*.ts`, `lib/supabase/*` and `supabase/migrations/20261101000100_storage_buckets.sql` while I was working. They will be in your baseline commit. Agent 2 is told to review the OLQ files; check the rest yourself.
- Rotate every secret that was pasted into a chat before any deploy (Agent 3 writes the checklist).
