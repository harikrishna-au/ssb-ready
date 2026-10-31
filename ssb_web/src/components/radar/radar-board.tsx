"use client";

import { useMemo, useState } from "react";
import { CONFIDENCE_LABEL, fmtDate, type AnnotatedItem, type Status } from "@/data/radar";
import { Deadline } from "./deadline";
import { TrackButton } from "./track-button";

const FILTERS: { id: "all" | Status; label: string }[] = [
  { id: "all", label: "All" },
  { id: "open", label: "Open now" },
  { id: "upcoming", label: "Upcoming" },
  { id: "closed", label: "Closed" },
];

export function RadarBoard({ items }: { items: AnnotatedItem[] }) {
  const [filter, setFilter] = useState<"all" | Status>("all");
  const [exam, setExam] = useState("All");
  const exams = useMemo(() => ["All", ...Array.from(new Set(items.map((i) => i.exam)))], [items]);
  const shown = items.filter((i) => (filter === "all" || i.status === filter) && (exam === "All" || i.exam === exam));
  const count = (s: Status) => items.filter((i) => i.status === s).length;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter by status">
        {FILTERS.map((f) => (
          <button
            key={f.id} onClick={() => setFilter(f.id)} aria-pressed={filter === f.id}
            className={`rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors ${filter === f.id ? "border-primary bg-primary text-primary-foreground" : "border-white/15 text-muted-foreground hover:border-white/40"}`}
          >
            {f.label}{f.id !== "all" ? ` (${count(f.id)})` : ""}
          </button>
        ))}
        <label className="ml-auto flex items-center gap-2 text-sm text-muted-foreground">
          Exam
          <select value={exam} onChange={(e) => setExam(e.target.value)} className="rounded-lg border border-white/15 bg-background px-3 py-1.5 text-foreground">
            {exams.map((e) => <option key={e}>{e}</option>)}
          </select>
        </label>
      </div>

      <div className="mt-6">
        {shown.length === 0 && <p className="py-10 text-muted-foreground">Nothing matches these filters.</p>}
        {shown.map((i) => (
          <article key={i.id} className={`border-b border-white/10 py-7 ${i.status === "closed" ? "opacity-70" : ""}`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm text-brass">{i.conductedBy} · {i.service}</p>
                <h2 className="mt-1 text-3xl font-extrabold leading-tight sm:text-4xl">{i.title}</h2>
              </div>
              <Deadline item={i} />
            </div>

            <dl className="mt-5 grid grid-cols-3 gap-4 text-sm sm:max-w-xl">
              {([["Opens", i.opens], ["Last date", i.lastDate], ["Exam", i.examDate]] as const).map(([label, d]) => (
                <div key={label}>
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd className="mt-0.5 font-display text-2xl font-black leading-tight">{fmtDate(d)}</dd>
                </div>
              ))}
            </dl>

            <p className="mt-4 max-w-2xl text-muted-foreground">{i.note}</p>
            <p className="mt-2 text-xs text-muted-foreground/80">{CONFIDENCE_LABEL[i.confidence]} · checked {fmtDate(i.verifiedOn)}</p>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <a href={i.applyUrl} target="_blank" rel="noopener noreferrer" className="inline-flex rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground">
                {i.status === "closed" ? "Official site" : i.applyLabel}
              </a>
              {i.status !== "closed" && <TrackButton id={i.id} />}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
