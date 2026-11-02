"use client";

import { useUser } from "@clerk/nextjs";
import { ArrowRight, Flame, FileUser } from "lucide-react";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { TESTS as ALL_TESTS } from "@/lib/tests";
import { usePiq } from "@/lib/use-piq";
import { attemptDate, streakDays, useHistory, type Attempt, type HistoryTest } from "@/lib/use-history";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import LinearProgress from "@mui/material/LinearProgress";
import { LinkButton } from "@/components/ui/link-button";

const TESTS = ALL_TESTS.filter((t) => ["oir", "ppdt", "tat", "wat", "srt"].includes(t.slug));

const outOf = (t: string, a: Attempt) => (t === "oir" && a.totalQuestions ? Math.round(((a.score ?? 0) / a.totalQuestions) * 10) : (a.score ?? 0));

/** Last 7 calendar days, oldest first, with how many attempts fell on each. Only called once history has loaded. */
function lastSevenDays(all: Attempt[]) {
  const counts = new Map<string, number>();
  for (const a of all) {
    const k = attemptDate(a.completedAt)?.toDateString();
    if (k) counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return { label: d.toLocaleDateString("en-IN", { weekday: "short" }).slice(0, 1), full: d.toLocaleDateString("en-IN", { weekday: "long" }), n: counts.get(d.toDateString()) ?? 0, today: i === 6 };
  });
}

export function DashboardView({ radar }: { radar: React.ReactNode }) {
  const { user } = useUser();
  const exam = useStore((s) => s.prefs.exam);
  const piq = usePiq();
  const { data, failed, loading } = useHistory();

  const rows = TESTS.map((t) => {
    const attempts = (data?.[t.slug as HistoryTest] ?? []) as Attempt[];
    const scores = attempts.map((a) => outOf(t.slug, a));
    return { ...t, count: attempts.length, last: scores[0], best: scores.length ? Math.max(...scores) : undefined };
  });
  const all = data ? Object.values(data).flat() : [];
  const total = all.length;
  const scored = rows.flatMap((r) => (data?.[r.slug as HistoryTest] ?? []).map((a) => outOf(r.slug, a)));
  const avg = scored.length ? (scored.reduce((a, b) => a + b, 0) / scored.length).toFixed(1) : "–";
  const streak = all.length ? streakDays(all) : 0;
  const week = all.length ? lastSevenDays(all) : null;
  const weekCount = week ? week.reduce((a, d) => a + d.n, 0) : 0;
  const next = [...rows].sort((a, b) => a.count - b.count)[0];
  const first = total === 0;
  const todays = first ? ALL_TESTS.find((t) => t.slug === "wat")! : ALL_TESTS.find((t) => t.slug === next.slug)!;
  const recent = rows
    .flatMap((r) => (data?.[r.slug as HistoryTest] ?? []).map((a) => ({ test: r.name, when: attemptDate(a.completedAt), score: outOf(r.slug, a) })))
    .filter((r) => r.when)
    .sort((a, b) => b.when!.getTime() - a.when!.getTime())
    .slice(0, 5);

  return (
    <div className="rise space-y-8">
      {/* Greeting */}
      <header>
        <div className="flex items-center justify-between gap-3">
          <p className="min-w-0 truncate text-muted-foreground">{exam ? `${exam} preparation` : "Welcome back"}</p>
          <Chip
            icon={<Flame className={`size-4 ${streak > 0 ? "fill-current" : ""}`} aria-hidden />}
            label={<><b className="tabular-nums">{loading ? "…" : streak}</b> day streak</>}
            color={streak > 0 ? "secondary" : "default"} variant={streak > 0 ? "filled" : "outlined"}
            title="Consecutive days with at least one test" aria-label={`${streak} day streak`}
            sx={{ flexShrink: 0, height: 34, px: 0.5, "& .MuiChip-label": { fontWeight: 600 } }}
          />
        </div>
        <h1 className="mt-3 font-display text-5xl font-black uppercase leading-[1.02] sm:text-6xl lg:text-7xl">Jai Hind{user?.firstName ? `, ${user.firstName}` : ""}</h1>
      </header>

      {piq.ready && !piq.completeness.complete && (
        <Link href="/piq" className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-brass/40 bg-brass/10 p-5 transition-colors hover:bg-brass/15">
          <span className="flex items-start gap-3">
            <FileUser className="mt-0.5 size-5 shrink-0 text-brass" aria-hidden />
            <span>
              <span className="block font-semibold">Complete your PIQ</span>
              <span className="text-sm text-muted-foreground">{piq.completeness.done} of {piq.completeness.total} required fields done. Needed for the mock interview and before payment.</span>
            </span>
          </span>
          <Chip color="secondary" label={piq.completeness.done === 0 ? "Fill it" : "Continue"} sx={{ px: 1, fontWeight: 800 }} />
        </Link>
      )}

      {/* Today's practice */}
      <section className="relative overflow-hidden rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/20 via-primary/5 to-transparent p-7 md:p-10" aria-labelledby="today">
        <p className="text-sm text-muted-foreground">{first ? "Start here" : "Today's practice · least practised so far"}</p>
        <h2 id="today" className="mt-1 font-display text-8xl font-black uppercase leading-[0.85] text-primary sm:text-9xl">{todays.name}</h2>
        <p className="mt-3 max-w-md text-lg">{todays.full}</p>
        <p className="mt-1 max-w-md text-muted-foreground">{first ? "Word Association is the quickest test: 15 words, about four minutes." : `${todays.format}. ${todays.minutes}.`}</p>
        <div className="mt-7 flex flex-wrap items-center gap-3">
          <LinkButton href={`/${todays.slug}`} variant="contained" size="large" endIcon={<ArrowRight className="size-4" aria-hidden />} sx={{ minHeight: 56, px: 4.5, boxShadow: "0 10px 24px -8px var(--primary)" }}>Start {todays.name}</LinkButton>
          <LinkButton href="/lecturette" variant="outlined" color="inherit" size="large" sx={{ minHeight: 56 }}>Lecturette</LinkButton>
          <LinkButton href="/interview-guide" variant="outlined" color="inherit" size="large" sx={{ minHeight: 56 }}>Interview</LinkButton>
        </div>
      </section>

      {failed && <p role="alert" className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm">Could not load your progress. Check that the backend is running, then refresh.</p>}

      {/* Week + deadlines */}
      <div className="grid gap-5 md:grid-cols-2">
        <section className="rounded-3xl border border-white/[0.08] bg-card/40 p-6" aria-labelledby="week">
          <div className="flex items-baseline justify-between">
            <h2 id="week" className="text-2xl font-extrabold uppercase">This week</h2>
            <p className="text-sm text-muted-foreground">{week ? `${weekCount} ${weekCount === 1 ? "test" : "tests"}` : "–"}</p>
          </div>
          {week ? (
            <ol className="mt-6 grid grid-cols-7 gap-2" aria-label="Tests per day, last seven days">
              {week.map((d, i) => (
                <li key={i} className="flex flex-col items-center gap-2" title={`${d.full}: ${d.n}`}>
                  <span
                    className={`grid size-9 place-items-center rounded-full text-sm font-bold tabular-nums ${d.n ? "bg-primary text-primary-foreground" : "border border-white/10 text-muted-foreground/50"} ${d.today ? "ring-2 ring-brass/60 ring-offset-2 ring-offset-background" : ""}`}
                  >
                    {d.n || ""}
                  </span>
                  <span className={`text-xs ${d.today ? "font-semibold text-foreground" : "text-muted-foreground"}`}>{d.label}</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-6 text-sm text-muted-foreground">{loading ? "Loading…" : "Take your first test to start your week."}</p>
          )}
        </section>
        {radar}
      </div>

      {/* Numbers */}
      <section aria-label="Your numbers" className="grid grid-cols-3 divide-x divide-white/10 rounded-3xl border border-white/[0.08]">
        {([["Attempts", loading ? "…" : total], ["Average score", loading ? "…" : avg], ["Tests tried", loading ? "…" : rows.filter((r) => r.count > 0).length + "/" + rows.length]] as const).map(([l, v]) => (
          <div key={l} className="px-5 py-6">
            <p className="font-display text-5xl font-black tabular-nums leading-none">{v}</p>
            <p className="mt-2 text-sm text-muted-foreground">{l}</p>
          </div>
        ))}
      </section>

      {/* By test */}
      <section aria-labelledby="by-test">
        <h2 id="by-test" className="text-3xl font-extrabold uppercase">By test</h2>
        <div className="mt-3">
          {rows.map((r) => (
            <Link key={r.slug} href={`/${r.slug}`} className="group grid grid-cols-[3.75rem_1fr_auto] items-center gap-3 border-b border-white/10 py-4 transition-colors hover:bg-white/[0.03] sm:grid-cols-[4.5rem_1fr_auto] sm:gap-4">
              <span className="font-display text-2xl font-black uppercase transition-colors group-hover:text-primary sm:text-3xl">{r.name}</span>
              <span className="min-w-0">
                <LinearProgress variant="determinate" value={((r.best ?? 0) / 10) * 100} aria-label={r.best === undefined ? "No attempts yet" : `Best score ${r.best} out of 10`} />
                <span className="mt-1.5 block truncate text-xs text-muted-foreground">
                  {r.count === 0 ? "Not attempted yet" : `${r.count} attempt${r.count > 1 ? "s" : ""} · best ${r.best}/10 · last ${r.last}/10`}
                </span>
              </span>
              <Button component="span" tabIndex={-1} aria-hidden variant={r.count === 0 ? "contained" : "outlined"} color={r.count === 0 ? "primary" : "inherit"} size="small" endIcon={<ArrowRight className="size-3.5" />} sx={{ minWidth: 96 }}>
                {r.count === 0 ? "Start" : "Retry"}
              </Button>
            </Link>
          ))}
        </div>
      </section>

      {/* Recent */}
      <section aria-labelledby="recent">
        <div className="flex items-baseline justify-between">
          <h2 id="recent" className="text-3xl font-extrabold uppercase">Recent</h2>
          <Link href="/history" className="text-sm font-semibold text-primary hover:underline">All attempts</Link>
        </div>
        {recent.length === 0 ? (
          <p className="mt-3 text-muted-foreground">Your attempts will appear here after your first test.</p>
        ) : (
          <ul className="mt-2">
            {recent.map((r, i) => (
              <li key={i} className="flex justify-between border-b border-white/10 py-3.5 text-sm">
                <span><span className="font-semibold">{r.test}</span> <span className="text-muted-foreground">· {r.when!.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span></span>
                <span className="font-display text-xl font-black text-primary">{r.score}/10</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
