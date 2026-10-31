"use client";

import { ArrowUpRight, Clock } from "lucide-react";
import Link from "next/link";
import { GROUPS, TESTS, type Group } from "@/lib/tests";
import { useHistory, type Attempt, type HistoryTest } from "@/lib/use-history";

const HAS_HISTORY = ["oir", "ppdt", "tat", "wat", "srt"];

const last = (slug: string, data: ReturnType<typeof useHistory>["data"]) => {
  if (!HAS_HISTORY.includes(slug)) return undefined;
  const a = (data?.[slug as HistoryTest] ?? [])[0] as Attempt | undefined;
  if (!a) return null;
  return slug === "oir" ? `${a.score}/${a.totalQuestions}` : `${a.score ?? 0}/10`;
};

export default function TestsHub() {
  const { data } = useHistory();
  return (
    <div className="rise">
      <h1 className="font-display text-6xl font-black uppercase leading-none">Choose a test</h1>
      <p className="mt-3 max-w-xl text-muted-foreground">Each test runs on the real clock and opens in focus mode. Once it starts, it does not pause.</p>

      {(["screening", "psychology", "speaking"] as Group[]).map((g) => (
        <section key={g} className="mt-12">
          <h2 className="text-3xl font-extrabold uppercase text-brass">{GROUPS[g].title}</h2>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">{GROUPS[g].blurb}</p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {TESTS.filter((t) => t.group === g).map((t) => {
              const score = last(t.slug, data);
              return (
                <Link
                  key={t.slug} href={`/${t.slug}`}
                  className="group relative flex flex-col rounded-3xl border border-white/[0.08] bg-card/50 p-6 transition-all hover:-translate-y-1 hover:border-primary/60 hover:bg-card"
                >
                  <div className="flex items-start justify-between">
                    <span className="font-display text-5xl font-black uppercase leading-none transition-colors group-hover:text-primary">{t.name}</span>
                    <ArrowUpRight className="size-5 text-muted-foreground transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-primary" aria-hidden />
                  </div>
                  <p className="mt-3 font-semibold">{t.full}</p>
                  <p className="mt-1 flex-1 text-sm leading-relaxed text-muted-foreground">{t.format}</p>
                  <div className="mt-5 flex items-center justify-between border-t border-white/[0.06] pt-4 text-sm">
                    <span className="inline-flex items-center gap-1.5 text-muted-foreground"><Clock className="size-4" aria-hidden /> {t.minutes}</span>
                    {score === undefined ? null : score === null ? (
                      <span className="rounded-full border border-white/15 px-3 py-0.5 text-xs text-muted-foreground">Not tried yet</span>
                    ) : (
                      <span className="rounded-full border border-primary/40 bg-primary/10 px-3 py-0.5 text-xs font-semibold text-primary">Last {score}</span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
