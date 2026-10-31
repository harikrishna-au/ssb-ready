"use client";

import { useUser } from "@clerk/nextjs";
import { ArrowDown, ArrowUp, Share2 } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { RadarChart } from "@/components/olq/radar-chart";
import { buildProfile, FIX } from "@/lib/olq-profile";
import { shareCard } from "@/lib/olq-share";
import { useHistory } from "@/lib/use-history";

const pct = (n: number) => `${Math.round(n * 100)}%`;
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function OlqProfilePage() {
  const { user } = useUser();
  const { data, failed, loading } = useHistory();
  const profile = useMemo(() => buildProfile(data), [data]);
  const [sharing, setSharing] = useState(false);
  const [error, setError] = useState("");

  const share = async () => {
    if (!profile) return;
    setSharing(true); setError("");
    try { await shareCard(profile, user?.firstName ?? "Aspirant"); }
    catch (e) { if ((e as Error).name !== "AbortError") setError("Could not create the card. Try again."); }
    finally { setSharing(false); }
  };

  if (failed) return <p role="alert" className="rounded-lg border border-destructive/40 p-4 text-sm">Could not load your attempts. Refresh and try again.</p>;
  if (loading) return <div className="h-96 animate-pulse rounded-2xl bg-white/5" role="status" aria-label="Loading your profile" />;

  if (!profile)
    return (
      <div className="max-w-xl">
        <h1 className="text-5xl font-black uppercase leading-none">Your OLQ profile</h1>
        <p className="mt-4 text-muted-foreground">Your profile is built from the qualities the AI finds in your WAT, SRT, PPDT and TAT answers. Take a test and it appears here.</p>
        <Link href="/wat" className="mt-6 inline-flex rounded-lg bg-primary px-6 py-3 font-semibold text-primary-foreground">Start with WAT (4 minutes)</Link>
      </div>
    );

  const plan = profile.gaps.slice(0, 3).map((g) => ({ ...g, fix: FIX[g.olq] }));

  return (
    <div className="space-y-14">
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="text-sm text-brass">Your OLQ profile</p>
          <h1 className="text-5xl font-black uppercase leading-none sm:text-6xl">{profile.archetype.name}</h1>
          <p className="mt-3 max-w-xl text-muted-foreground">{profile.archetype.line}</p>
        </div>
        <button onClick={share} disabled={sharing} className="inline-flex h-12 items-center gap-2 rounded-lg bg-brass px-5 font-bold text-black disabled:opacity-60">
          <Share2 className="size-4" aria-hidden /> {sharing ? "Making card…" : "Share my card"}
        </button>
      </header>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}

      {profile.confidence !== "solid" && (
        <p className="rounded-xl border border-brass/30 bg-brass/10 p-4 text-sm">
          {profile.confidence === "early" ? "Early read" : "Still building"}: this comes from {profile.attempts} scored {profile.attempts === 1 ? "attempt" : "attempts"}. It gets sharper around 12. Attempts saved before profiles launched have no quality data and are not counted.
        </p>
      )}

      <section className="grid items-center gap-10 md:grid-cols-2">
        <RadarChart stats={profile.stats} />
        <div className="space-y-5">
          <h2 className="text-3xl font-extrabold uppercase">The four factors</h2>
          {profile.factors.map((f) => (
            <div key={f.factor}>
              <div className="flex justify-between text-sm"><span className="font-semibold">{f.factor}</span><span className="tabular-nums text-muted-foreground">{pct(f.rate)}</span></div>
              <div className="mt-1.5 h-2 rounded-full bg-white/10"><div className="h-2 rounded-full bg-primary" style={{ width: pct(f.rate) }} /></div>
            </div>
          ))}
          <p className="text-xs text-muted-foreground">Share of your answers that showed each quality, with recent attempts counting more.</p>
        </div>
      </section>

      <section className="grid gap-10 md:grid-cols-2">
        <div>
          <h2 className="text-3xl font-extrabold uppercase">Showing up</h2>
          <ul className="mt-3">
            {profile.strengths.length === 0 && <li className="py-3 text-muted-foreground">No quality shows in more than a third of your answers yet.</li>}
            {profile.strengths.map((s) => (
              <li key={s.olq} className="flex items-center justify-between border-b border-white/10 py-3">
                <span className="font-semibold">{s.olq}</span>
                <span className="text-sm tabular-nums text-muted-foreground">{pct(s.rate)}{s.trend !== null && Math.abs(s.trend) >= 0.2 && (s.trend > 0 ? <ArrowUp className="ml-1 inline size-4 text-green-500" aria-label="rising" /> : <ArrowDown className="ml-1 inline size-4 text-destructive" aria-label="falling" />)}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="text-3xl font-extrabold uppercase">Missing</h2>
          <p className="mt-1 text-sm text-muted-foreground">Assessors mark what they cannot see. These rarely show in your answers.</p>
          <ul className="mt-2">
            {profile.gaps.length === 0 && <li className="py-3 text-muted-foreground">No clear gaps. Keep practising to confirm.</li>}
            {profile.gaps.map((s) => (
              <li key={s.olq} className="flex items-center justify-between border-b border-white/10 py-3">
                <span className="font-semibold">{s.olq}</span>
                <span className="text-sm tabular-nums text-muted-foreground">{pct(s.rate)}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {plan.length > 0 && (
        <section>
          <h2 className="text-3xl font-extrabold uppercase">Your 7-day fix</h2>
          <p className="mt-1 text-muted-foreground">Three gaps, each practised twice, with a rest day.</p>
          <ol className="mt-6 divide-y divide-white/10 border-y border-white/10">
            {DAYS.map((d, i) => {
              const item = i === 6 ? null : plan[i % plan.length];
              return (
                <li key={d} className="grid grid-cols-[3.5rem_1fr_auto] items-baseline gap-4 py-4">
                  <span className="font-display text-2xl font-black uppercase text-brass">{d}</span>
                  {item ? (
                    <span><span className="block font-semibold">{item.olq}</span><span className="text-sm text-muted-foreground">{item.fix.drill}</span></span>
                  ) : <span className="text-muted-foreground">Rest. Re-read your feedback from this week.</span>}
                  {item && <Link href={item.fix.href} className="text-sm font-semibold text-primary hover:underline">{item.fix.test}</Link>}
                </li>
              );
            })}
          </ol>
        </section>
      )}
    </div>
  );
}
