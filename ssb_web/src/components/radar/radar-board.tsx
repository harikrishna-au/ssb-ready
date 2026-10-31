"use client";

import { useMemo, useState } from "react";
import { fmtDate, type AnnotatedItem, type Status } from "@/data/radar";
import { Deadline } from "./deadline";
import { NotificationCard } from "./notification-card";
import { Timeline } from "./timeline";

const FILTERS: { id: "all" | Status; label: string }[] = [
  { id: "all", label: "All" },
  { id: "open", label: "Open now" },
  { id: "upcoming", label: "Upcoming" },
  { id: "closed", label: "Closed" },
];
const field = "min-h-11 rounded-lg border border-white/15 bg-background px-3 text-foreground";

export function RadarBoard({ items }: { items: AnnotatedItem[] }) {
  const [filter, setFilter] = useState<"all" | Status>("all");
  const [service, setService] = useState("All");
  const [exam, setExam] = useState("All");
  const [q, setQ] = useState("");
  const [view, setView] = useState<"list" | "timeline">("list");
  const services = useMemo(() => ["All", ...Array.from(new Set(items.map((i) => i.service)))], [items]);
  const exams = useMemo(() => ["All", ...Array.from(new Set(items.map((i) => i.exam)))], [items]);
  const needle = q.trim().toLowerCase();
  const shown = items.filter(
    (i) =>
      (filter === "all" || i.status === filter) &&
      (service === "All" || i.service === service) &&
      (exam === "All" || i.exam === exam) &&
      (!needle || `${i.title} ${i.exam} ${i.conductedBy}`.toLowerCase().includes(needle)),
  );
  const count = (s: Status) => items.filter((i) => i.status === s).length;
  const lastChecked = items.map((i) => i.verifiedOn).sort().at(-1);

  if (items.length === 0)
    return (
      <div className="rounded-2xl border border-white/10 p-8">
        <p className="text-xl font-semibold">No notifications are published yet.</p>
        <p className="mt-1 text-muted-foreground">We only list a notification after someone has checked it against the official source. Please look at the official sites in the meantime.</p>
      </div>
    );

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter by status">
        {FILTERS.map((f) => (
          <button
            key={f.id} onClick={() => setFilter(f.id)} aria-pressed={filter === f.id}
            className={`min-h-11 rounded-full border px-4 text-sm font-semibold transition-colors ${filter === f.id ? "border-primary bg-primary text-primary-foreground" : "border-white/15 text-muted-foreground hover:border-white/40"}`}
          >
            {f.label}{f.id !== "all" ? ` (${count(f.id)})` : ""}
          </button>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap items-end gap-3 text-sm text-muted-foreground">
        <label className="flex min-w-48 flex-1 flex-col gap-1">Search
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="NDA, Navy, TES…" className={field} />
        </label>
        <label className="flex flex-col gap-1">Service
          <select value={service} onChange={(e) => setService(e.target.value)} className={field}>{services.map((s) => <option key={s}>{s}</option>)}</select>
        </label>
        <label className="flex flex-col gap-1">Exam
          <select value={exam} onChange={(e) => setExam(e.target.value)} className={field}>{exams.map((s) => <option key={s}>{s}</option>)}</select>
        </label>
        <div role="group" aria-label="View" className="flex gap-1">
          {(["list", "timeline"] as const).map((v) => (
            <button key={v} onClick={() => setView(v)} aria-pressed={view === v} className={`min-h-11 rounded-lg border px-4 font-semibold capitalize ${view === v ? "border-primary text-foreground" : "border-white/15"}`}>{v}</button>
          ))}
        </div>
      </div>

      <div className="mt-6" aria-live="polite">
        {shown.length === 0 && (
          <div className="py-10">
            <p className="text-muted-foreground">Nothing matches these filters.</p>
            <button onClick={() => { setFilter("all"); setService("All"); setExam("All"); setQ(""); }} className="mt-3 min-h-11 rounded-lg border border-white/20 px-4 text-sm font-semibold hover:border-primary">Clear filters</button>
          </div>
        )}
        {view === "timeline" ? <Timeline items={shown} /> : shown.map((i) => <NotificationCard key={i.id} item={i} />)}
      </div>
      {lastChecked && <p className="mt-6 text-xs text-muted-foreground">Most recent check of an official source: {fmtDate(lastChecked)}.</p>}
    </div>
  );
}

export { Deadline };
