"use client";

import Link from "next/link";
import { useState } from "react";
import { fmtDate, type AnnotatedItem } from "@/data/radar";
import { STATUSES, useTracker, type StatusId } from "@/lib/use-tracker";
import { Deadline } from "./deadline";
import { ReminderSettings } from "./reminder-settings";

export function ApplicationsBoard({ items }: { items: AnnotatedItem[] }) {
  const { ready, apps, setStatus, setNote, untrack, loadFailed, retry, signedIn } = useTracker();
  const [error, setError] = useState("");

  const mine = items
    .filter((i) => apps[i.id])
    .sort((a, b) => (a.lastDate ?? "9999").localeCompare(b.lastDate ?? "9999"));
  const hidden = Object.keys(apps).length - mine.length;
  const closingSoon = mine.filter((i) => i.status === "open" && (i.daysToLastDate ?? 99) <= 14 && apps[i.id].status === "saved");
  const applied = mine.filter((i) => apps[i.id].status !== "saved").length;

  const run = async (p: Promise<void>) => {
    setError("");
    try { await p; } catch { setError("Could not save that change. Check your connection and try again."); }
  };

  if (!ready) return <p className="text-muted-foreground">Loading your applications…</p>;
  if (loadFailed)
    return (
      <div role="alert" className="rounded-2xl border border-destructive/40 bg-destructive/10 p-6">
        <p className="font-semibold">We could not load your applications.</p>
        <p className="mt-1 text-sm text-muted-foreground">Nothing was lost. Check your connection and try again.</p>
        <button onClick={() => retry()} className="mt-4 min-h-11 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground">Try again</button>
      </div>
    );

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-5xl font-black uppercase leading-none">My applications</h1>
        <p className="mt-3 max-w-xl text-muted-foreground">Every notification you are tracking, with its last date, in one place. Update the status as you move through each stage.</p>
      </div>

      <section aria-label="Summary" className="grid grid-cols-3 gap-4 border-y border-white/10 py-6">
        {([["Tracking", mine.length], ["Applied or further", applied], ["Closing within 14 days", closingSoon.length]] as const).map(([l, v]) => (
          <div key={l}>
            <p className="font-display text-5xl font-black tabular-nums">{v}</p>
            <p className="text-sm text-muted-foreground">{l}</p>
          </div>
        ))}
      </section>

      {closingSoon.length > 0 && (
        <p role="status" className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm">
          You saved {closingSoon.map((i) => i.title).join(", ")} but have not marked {closingSoon.length > 1 ? "them" : "it"} as applied, and the last date is near.
        </p>
      )}
      {hidden > 0 && <p className="text-sm text-muted-foreground">{hidden} tracked {hidden === 1 ? "notification is" : "notifications are"} no longer listed on Radar. Your record is kept.</p>}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}

      {mine.length === 0 ? (
        <div className="rounded-2xl border border-white/10 p-8">
          <p className="text-xl font-semibold">You are not tracking anything yet.</p>
          <p className="mt-1 text-muted-foreground">Open Radar, pick a notification and choose Track this.</p>
          <Link href="/radar" className="mt-5 inline-flex rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground">Open Radar</Link>
        </div>
      ) : (
        <div>
          {mine.map((i) => {
            const t = apps[i.id];
            return (
              <article key={i.id} className="border-b border-white/10 py-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm text-brass">{i.conductedBy}</p>
                    <h2 className="text-3xl font-extrabold leading-tight">{i.title}</h2>
                  </div>
                  <Deadline item={i} />
                </div>
                <dl className="mt-4 grid grid-cols-3 gap-4 text-sm sm:max-w-md">
                  {([["Opens", i.opens], ["Last date", i.lastDate], ["Exam", i.examDate]] as const).map(([l, d]) => (
                    <div key={l}><dt className="text-muted-foreground">{l}</dt><dd className="font-display text-xl font-black">{fmtDate(d)}</dd></div>
                  ))}
                </dl>

                <div className="mt-5 grid gap-4 sm:grid-cols-[14rem_1fr]">
                  <label className="text-sm">
                    <span className="text-muted-foreground">Status</span>
                    <select
                      value={t.status}
                      onChange={(e) => run(setStatus(i.id, e.target.value as StatusId))}
                      className="mt-1 w-full rounded-lg border border-white/15 bg-background px-3 py-2"
                    >
                      {STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                    </select>
                  </label>
                  <label className="text-sm">
                    <span className="text-muted-foreground">Note (roll number, centre, reminder)</span>
                    <input
                      defaultValue={t.note ?? ""} maxLength={160}
                      onBlur={(e) => e.target.value !== (t.note ?? "") && run(setNote(i.id, e.target.value))}
                      className="mt-1 w-full rounded-lg border border-white/15 bg-background px-3 py-2"
                    />
                  </label>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
                  <a href={i.applyUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center font-semibold text-primary hover:underline">{i.applyLabel}</a>
                  <a href={i.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center text-muted-foreground hover:underline">Official source</a>
                  <button onClick={() => run(untrack(i.id))} className="min-h-11 text-muted-foreground hover:text-destructive">Stop tracking</button>
                </div>
              </article>
            );
          })}
        </div>
      )}
      {signedIn && <ReminderSettings />}
      <p className="text-xs text-muted-foreground">
        Dates come from official calendars and notifications and can change. Always confirm on the official site before you apply.
      </p>
    </div>
  );
}
