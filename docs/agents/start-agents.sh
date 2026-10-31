#!/usr/bin/env bash
# Sets up (and optionally launches) five isolated agent workspaces.
#
#   ./docs/agents/start-agents.sh setup     create 5 git worktrees + install deps (safe, starts no agents)
#   ./docs/agents/start-agents.sh launch    open 5 Terminal windows, each running `claude` on its task
#   ./docs/agents/start-agents.sh status    show each agent's branch, commits and changed files
#   ./docs/agents/start-agents.sh clean     remove the worktrees (branches are kept)
#
# Add DRY_RUN=1 to print what would happen without changing anything.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
AGENTS_DIR="$(dirname "$ROOT")/ssb-agents"
TASKS=("1-payments:01-payments-identity" "2-rounds:02-ai-rounds-engine" "3-platform:03-platform-security-quality" "4-radar:04-radar-alerts" "5-brand:05-brand-growth-content")
run() { if [ "${DRY_RUN:-}" = "1" ]; then echo "DRY: $*"; else "$@"; fi; }

cmd="${1:-help}"
cd "$ROOT"

setup() {
  if [ -n "$(git status --porcelain | grep -vE '^\?\? (\.claude|supabase/\.temp)/' || true)" ]; then
    cat <<MSG
Your working tree has uncommitted changes. Worktrees are created from COMMITTED code, so the agents
would start without your latest work (ssb_web is currently untracked!).

Commit a baseline first:
  git add -A
  git status            # check no .env / keys are listed (they are git-ignored, but look)
  git commit -m "chore: baseline before parallel agent work"
Then run this again.
MSG
    exit 1
  fi
  base="$(git rev-parse --abbrev-ref HEAD)"
  echo "Base branch: $base ($(git rev-parse --short HEAD))"
  run mkdir -p "$AGENTS_DIR"

  for t in "${TASKS[@]}"; do
    name="${t%%:*}"; file="${t##*:}"; n="${name%%-*}"
    dir="$AGENTS_DIR/agent-$n"; branch="agent/$name"
    echo; echo "== Agent $n ($branch) =="
    if [ -d "$dir" ]; then echo "exists, skipping creation"; else run git worktree add -b "$branch" "$dir" "$base"; fi
    [ "${DRY_RUN:-}" = "1" ] && continue

    # Env files are git-ignored, so copy them in and give this agent its own ports.
    web_port=$((3100 + n)); api_port=$((5100 + n))
    [ -f ssb_web/.env.local ] && cp ssb_web/.env.local "$dir/ssb_web/.env.local" \
      && sed -i.bak "s#^NEXT_PUBLIC_BACKEND_URL=.*#NEXT_PUBLIC_BACKEND_URL=http://localhost:$api_port#" "$dir/ssb_web/.env.local" && rm "$dir/ssb_web/.env.local.bak"
    if [ -f ssb_backend/.env ]; then
      cp ssb_backend/.env "$dir/ssb_backend/.env"
      sed -i.bak "s#^PORT=.*#PORT=$api_port#" "$dir/ssb_backend/.env"
      grep -q "^CORS_ORIGIN=" "$dir/ssb_backend/.env" && sed -i.bak "s#^CORS_ORIGIN=.*#CORS_ORIGIN=http://localhost:$web_port#" "$dir/ssb_backend/.env"
      rm -f "$dir/ssb_backend/.env.bak"
    fi

    # The task prompt each agent reads. Untracked on purpose (listed in .git/info/exclude of the worktree).
    { cat docs/agents/_shared.md; echo; echo "---"; echo; cat "docs/agents/$file.md"; } > "$dir/AGENT_TASK.md"
    echo "Ports: web $web_port, backend $api_port" >> "$dir/AGENT_TASK.md"
    echo "AGENT_TASK.md" >> "$(git -C "$dir" rev-parse --git-path info/exclude)"

    echo "Installing dependencies (this takes a minute)…"
    (cd "$dir/ssb_web" && npm ci --no-audit --no-fund >/dev/null 2>&1) || echo "  ! web install failed: run 'npm ci' in $dir/ssb_web"
    (cd "$dir/ssb_backend" && npm ci --no-audit --no-fund >/dev/null 2>&1) || echo "  ! backend install failed: run 'npm ci' in $dir/ssb_backend"
  done
  echo; echo "Ready. Next: ./docs/agents/start-agents.sh launch   (or start each agent by hand, see docs/agents/README.md)"
}

launch() {
  command -v osascript >/dev/null || { echo "launch needs macOS Terminal (osascript). Start the agents by hand, see README.md."; exit 1; }
  for t in "${TASKS[@]}"; do
    name="${t%%:*}"; n="${name%%-*}"; dir="$AGENTS_DIR/agent-$n"
    [ -d "$dir" ] || { echo "Missing $dir. Run setup first."; exit 1; }
    prompt="Read AGENT_TASK.md in this folder completely, then carry out the task. Work only inside this folder and only on the files you own. Follow every rule in the Working agreement. Finish by writing docs/handoff/$n.md."
    if [ "${DRY_RUN:-}" = "1" ]; then echo "DRY: terminal for agent $n in $dir"; continue; fi
    osascript >/dev/null <<OSA
tell application "Terminal"
  activate
  do script "cd '$dir' && claude \"$prompt\""
end tell
OSA
    sleep 1
  done
  echo "Five Terminal windows opened, one agent each. Approve permission prompts in each window as they appear."
}

status() {
  for t in "${TASKS[@]}"; do
    name="${t%%:*}"; n="${name%%-*}"; dir="$AGENTS_DIR/agent-$n"
    [ -d "$dir" ] || { echo "agent $n: not set up"; continue; }
    base="$(git -C "$ROOT" merge-base HEAD "agent/$name" 2>/dev/null || echo HEAD)"
    echo "== agent $n ($(git -C "$dir" rev-parse --abbrev-ref HEAD)) =="
    echo "commits: $(git -C "$dir" rev-list --count "$base"..HEAD)   uncommitted files: $(git -C "$dir" status --porcelain | wc -l | tr -d ' ')"
    [ -f "$dir/docs/handoff/$n.md" ] && echo "handoff: written" || echo "handoff: not yet"
  done
}

clean() {
  for t in "${TASKS[@]}"; do
    name="${t%%:*}"; n="${name%%-*}"; dir="$AGENTS_DIR/agent-$n"
    [ -d "$dir" ] && run git worktree remove --force "$dir" && echo "removed $dir (branch agent/$name kept)"
  done
}

case "$cmd" in setup) setup;; launch) launch;; status) status;; clean) clean;; *) sed -n '2,10p' "${BASH_SOURCE[0]}";; esac
