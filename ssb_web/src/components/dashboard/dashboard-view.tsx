"use client";

import { useUser } from "@clerk/nextjs";
import { ArrowRight, Flame, FileUser } from "lucide-react";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { TESTS as ALL_TESTS } from "@/lib/tests";
import { usePiq } from "@/lib/use-piq";
import { attemptDate, streakDays, useHistory, type Attempt, type HistoryTest } from "@/lib/use-history";

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
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-muted-foreground">{exam ? `${exam} preparation` : "Welcome back"}</p>
          <h1 className="font-display text-6xl font-black uppercase leading-[0.9] sm:text-7xl">Jai Hind{user?.firstName ? `, ${user.firstName}` : ""}</h1>
        </div>
        <div
          className={`flex items-center gap-3 rounded-2xl border px-5 py-3 ${streak > 0 ? "border-brass/40 bg-brass/10" : "border-white/10"}`}
          title="Consecutive days with at least one test"
        >
          <Flame className={`size-7 ${streak > 0 ? "text-brass" : "text-muted-foreground"}`} aria-hidden />
          <div className="leading-none">
            <p className="font-display text-4xl font-black tabular-nums">{loading ? "…" : streak}</p>
            <p className="mt-1 text-xs text-muted-foreground">day streak</p>
          </div>
        </div>
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
          <span className="rounded-full bg-brass px-5 py-2 text-sm font-bold text-black">{piq.completeness.done === 0 ? "Fill it" : "Continue"}</span>
        </Link>
      )}

      {/* Today's practice */}
      <section className="relative overflow-hidden rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/20 via-primary/5 to-transparent p-7 md:p-10" aria-labelledby="today">
        <p className="text-sm text-muted-foreground">{first ? "Start here" : "Today's practice · least practised so far"}</p>
        <h2 id="today" className="mt-1 font-display text-8xl font-black uppercase leading-[0.85] text-primary sm:text-9xl">{todays.name}</h2>
        <p className="mt-3 max-w-md text-lg">{todays.full}</p>
        <p className="mt-1 max-w-md text-muted-foreground">{first ? "Word Association is the quickest test: 15 words, about four minutes." : `${todays.format}. ${todays.minutes}.`}</p>
        <div className="mt-7 flex flex-wrap items-center gap-3">
          <Link href={`/${todays.slug}`} className="inline-flex h-14 items-center gap-2 rounded-full bg-primary px-9 font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:-translate-y-0.5">
            Start {todays.name} <ArrowRight className="size-4" aria-hidden />
          </Link>
          <Link href="/lecturette" className="inline-flex h-14 items-center rounded-full border border-white/20 px-7 font-semibold transition-colors hover:border-white/40">Lecturette</Link>
          <Link href="/interview-guide" className="inline-flex h-14 items-center rounded-full border border-white/20 px-7 font-semibold transition-colors hover:border-white/40">Interview</Link>
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
            <Link key={r.slug} href={`/${r.slug}`} className="group grid grid-cols-[4.5rem_1fr_auto] items-center gap-4 border-b border-white/10 py-4 transition-colors hover:bg-white/[0.03]">
              <span className="font-display text-3xl font-black uppercase transition-colors group-hover:text-primary">{r.name}</span>
              <span>
                <span className="block h-1.5 overflow-hidden rounded-full bg-white/10" role="img" aria-label={r.best === undefined ? "No attempts yet" : `Best score ${r.best} out of 10`}>
                  <span className="block h-full rounded-full bg-primary transition-[width] duration-700" style={{ width: `${((r.best ?? 0) / 10) * 100}%` }} />
                </span>
                <span className="mt-1.5 block text-xs text-muted-foreground">
                  {r.count === 0 ? "Not attempted yet" : `${r.count} attempt${r.count > 1 ? "s" : ""} · best ${r.best}/10`}
                </span>
              </span>
              <span className="text-sm font-semibold text-primary">{r.count === 0 ? "Start" : `Last ${r.last}/10`}</span>
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
