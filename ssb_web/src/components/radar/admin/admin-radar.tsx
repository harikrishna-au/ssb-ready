"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { Editor } from "./editor";
import type { AdminItem, Review } from "./types";

const tab = (on: boolean) => `min-h-11 rounded-lg border px-4 text-sm font-semibold ${on ? "border-primary bg-primary text-primary-foreground" : "border-white/15 text-muted-foreground"}`;
const badge: Record<string, string> = { draft: "border-brass/50 text-brass", published: "border-green-500/50 text-green-400", archived: "border-white/20 text-muted-foreground" };

export function AdminRadar() {
  const [view, setView] = useState<"items" | "reviews">("items");
  const [items, setItems] = useState<AdminItem[] | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [sources, setSources] = useState<{ url: string; label: string; lastCheckedAt?: string; lastError?: string }[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [error, setError] = useState("");

  const reload = useCallback(async () => {
    try {
      const [a, b] = await Promise.all([
        api.get<{ items: AdminItem[] }>("/api/radar/admin/items"),
        api.get<{ reviews: Review[]; sources: typeof sources }>("/api/radar/admin/reviews"),
      ]);
      setItems(a.items); setReviews(b.reviews); setSources(b.sources); setError("");
    } catch (e) {
      setError(e instanceof ApiError && e.status === 403 ? "Your account is not an admin on the server." : "Could not load. Check the server and try again.");
    }
  }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void reload();
  }, [reload]);

  const resolve = async (id: number, status: "done" | "dismissed") => {
    await api.post(`/api/radar/admin/reviews/${id}/resolve`, { status });
    reload();
  };

  if (editing !== null) return <Editor id={editing === "new" ? null : editing} onClose={() => { setEditing(null); reload(); }} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-5xl font-black uppercase leading-none">Radar admin</h1>
        <button onClick={() => setEditing("new")} className="min-h-11 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground">New notification</button>
      </div>
      <div className="flex gap-2" role="group" aria-label="Section">
        <button className={tab(view === "items")} aria-pressed={view === "items"} onClick={() => setView("items")}>Notifications{items ? ` (${items.length})` : ""}</button>
        <button className={tab(view === "reviews")} aria-pressed={view === "reviews"} onClick={() => setView("reviews")}>Needs review ({reviews.length})</button>
      </div>
      {error && <p role="alert" className="text-destructive">{error}</p>}

      {view === "items" && (
        <ul className="divide-y divide-white/10 border-y border-white/10">
          {(items ?? []).map((n) => (
            <li key={n.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="font-semibold">{n.title}</p>
                <p className="text-sm text-muted-foreground">
                  {n.conductedBy} · last date {n.lastDate ?? "none"} · {n.confidence} · checked {n.verifiedOn ?? "never"}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${badge[n.status]}`}>{n.status}</span>
                <button onClick={() => setEditing(n.id)} className="min-h-11 rounded-lg border border-white/20 px-4 text-sm font-semibold hover:border-primary">Open</button>
              </div>
            </li>
          ))}
          {items?.length === 0 && <li className="py-6 text-muted-foreground">Nothing yet. Run the seed script or add one.</li>}
        </ul>
      )}

      {view === "reviews" && (
        <div className="space-y-6">
          {reviews.length === 0 && <p className="text-muted-foreground">No source page has changed since the last review.</p>}
          {reviews.map((r) => (
            <article key={r.id} className="rounded-2xl border border-white/10 p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-xl font-bold">{r.label}</h2>
                <a href={r.sourceUrl} target="_blank" rel="noopener noreferrer" className="min-h-11 text-sm text-primary underline">Open the official page</a>
              </div>
              <p className="text-xs text-muted-foreground">Changed on {r.createdAt.slice(0, 10)}. Read the page yourself before editing anything.</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <DiffList title="Added" lines={r.diff.added} cls="text-green-400" mark="+" />
                <DiffList title="Removed" lines={r.diff.removed} cls="text-destructive" mark="-" />
              </div>
              <div className="mt-4 flex gap-2">
                <button onClick={() => resolve(r.id, "done")} className="min-h-11 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground">Mark as handled</button>
                <button onClick={() => resolve(r.id, "dismissed")} className="min-h-11 rounded-lg border border-white/20 px-4 text-sm font-semibold">Not relevant</button>
              </div>
            </article>
          ))}
          <section aria-label="Watched pages">
            <h2 className="text-lg font-bold">Pages being watched</h2>
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
              {sources.map((s) => <li key={s.url}>{s.label}: {s.lastCheckedAt ? `checked ${s.lastCheckedAt.slice(0, 16).replace("T", " ")} UTC` : "not checked yet"}{s.lastError ? `, last error: ${s.lastError}` : ""}</li>)}
              {sources.length === 0 && <li>None yet. The first scheduled run adds them.</li>}
            </ul>
          </section>
        </div>
      )}
    </div>
  );
}

function DiffList({ title, lines, cls, mark }: { title: string; lines: string[]; cls: string; mark: string }) {
  return (
    <div>
      <h3 className="text-sm font-semibold">{title} ({lines.length})</h3>
      <ul className={`mt-1 space-y-1 font-mono text-xs ${cls}`}>{lines.map((l, i) => <li key={i}>{mark} {l}</li>)}</ul>
    </div>
  );
}
