"use client";

import { ArrowRight, ChevronDown } from "lucide-react";
import { Loader } from "@/components/loader";
import { Markdown } from "@/components/markdown";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import LinearProgress from "@mui/material/LinearProgress";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import { useState } from "react";
import { LinkButton } from "@/components/ui/link-button";
import { TESTS } from "@/lib/tests";
import { attemptDate, HISTORY_TESTS, useHistory, type Attempt, type HistoryTest } from "@/lib/use-history";

const scoreOf = (t: string, a: Attempt) => (t === "oir" && a.totalQuestions ? Math.round(((a.score ?? 0) / a.totalQuestions) * 10) : (a.score ?? 0));
const nameOf = (slug: string) => TESTS.find((t) => t.slug === slug)?.name ?? slug.toUpperCase();

export default function HistoryPage() {
  const { data, failed, loading, refresh } = useHistory();
  const [picked, setPicked] = useState<string | null>(null);

  const all = data ? HISTORY_TESTS.flatMap((t) => data[t].map((a) => scoreOf(t, a))) : [];
  const stats = [
    ["Attempts", all.length ? String(all.length) : "0"],
    ["Average", all.length ? (all.reduce((a, b) => a + b, 0) / all.length).toFixed(1) : "–"],
    ["Best", all.length ? `${Math.max(...all)}/10` : "–"],
  ] as const;

  return (
    <div className="rise space-y-8">
      <header>
        <h1 className="font-display text-5xl font-black uppercase leading-[1.02] sm:text-6xl">Your progress</h1>
        <p className="mt-3 text-muted-foreground">Every scored attempt, newest first.</p>
      </header>

      {failed && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm">
          <span>Could not load your attempts. Check your connection or try again.</span>
          <Button size="small" variant="outlined" color="inherit" onClick={() => refresh()}>Try again</Button>
        </div>
      )}

      {loading && !data && <div className="grid min-h-64 place-items-center"><Loader size={56} label="Loading your attempts…" /></div>}

      {data && (
        <>
          <section aria-label="Summary" className="grid grid-cols-3 divide-x divide-white/10 rounded-3xl border border-white/[0.08]">
            {stats.map(([l, v]) => (
              <div key={l} className="px-4 py-5 sm:px-6">
                <p className="font-display text-4xl font-black leading-none tabular-nums sm:text-5xl">{v}</p>
                <p className="mt-2 text-sm text-muted-foreground">{l}</p>
              </div>
            ))}
          </section>

          {(() => {
            const active = (picked && (HISTORY_TESTS as readonly string[]).includes(picked) ? picked : HISTORY_TESTS.find((t) => data[t].length) ?? "ppdt") as HistoryTest;
            const items = data[active];
            return (
              <>
                <Tabs value={active} onChange={(_, v: string) => setPicked(v)} variant="scrollable" scrollButtons="auto" aria-label="Test history" sx={{ borderBottom: 1, borderColor: "divider" }}>
                  {HISTORY_TESTS.map((t) => (
                    <Tab key={t} value={t} label={<span className="flex items-center gap-2">{t.toUpperCase()}<Chip size="small" label={data[t].length} color={t === active ? "primary" : "default"} sx={{ height: 20, fontSize: 12 }} /></span>} />
                  ))}
                </Tabs>

                <div className="mt-5 space-y-3" role="tabpanel">
                  {!items.length && (
                    <div className="rounded-3xl border border-dashed border-white/15 p-8 text-center">
                      <p className="font-display text-3xl font-black uppercase">No {nameOf(active)} attempts yet</p>
                      <p className="mx-auto mt-2 max-w-sm text-muted-foreground">Your first scored attempt will show up here with feedback.</p>
                      <LinkButton href={`/${active}`} variant="contained" size="large" endIcon={<ArrowRight className="size-4" aria-hidden />} sx={{ mt: 2.5 }}>Start {nameOf(active)}</LinkButton>
                    </div>
                  )}

                  {items.map((a, i) => {
                    const sc = scoreOf(active, a);
                    const when = attemptDate(a.completedAt);
                    return (
                      <article key={a.id ?? i} className="overflow-hidden rounded-2xl border border-white/[0.08] bg-card/40">
                        <div className="flex items-center gap-4 p-4 sm:p-5">
                          <div className="grid size-14 shrink-0 place-items-center rounded-2xl bg-primary/15 font-display text-2xl font-black tabular-nums text-primary">{sc}<span className="text-xs font-bold opacity-70">/10</span></div>
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold">{when ? when.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "Attempt"}</p>
                            <p className="text-sm text-muted-foreground">
                              {when ? when.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" }) : ""}
                              {active === "oir" && a.totalQuestions ? ` · ${a.score}/${a.totalQuestions} correct` : ""}
                            </p>
                            <LinearProgress variant="determinate" value={(Math.min(sc, 10) / 10) * 100} aria-label={`Score ${sc} out of 10`} sx={{ mt: 1.25 }} />
                          </div>
                        </div>
                        {a.aiFeedback && (
                          <details className="group border-t border-white/[0.08]">
                            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 text-sm font-semibold text-primary sm:px-5 [&::-webkit-details-marker]:hidden">
                              Feedback <ChevronDown className="size-4 transition-transform group-open:rotate-180" aria-hidden />
                            </summary>
                            <div className="px-4 pb-5 sm:px-5"><Markdown>{a.aiFeedback}</Markdown></div>
                          </details>
                        )}
                      </article>
                    );
                  })}
                </div>
              </>
            );
          })()}
        </>
      )}
    </div>
  );
}
