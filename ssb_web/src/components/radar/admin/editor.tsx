"use client";

import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import type { AdminItem, HistoryRow } from "./types";

const SERVICES = ["Army", "Navy", "Air Force", "Tri-service", "CAPF", "State / other"];
const input = "mt-1 min-h-11 w-full rounded-lg border border-white/15 bg-background px-3";
const FIELDS = ["title", "conductedBy", "service", "exam", "opens", "lastDate", "examDate", "confidence", "sourceUrl", "officialApplyUrl", "applyLabel", "verifiedOn", "body"] as const;
type Form = Record<(typeof FIELDS)[number], string>;
const blank: Form = { title: "", conductedBy: "", service: "Army", exam: "", opens: "", lastDate: "", examDate: "", confidence: "expected", sourceUrl: "", officialApplyUrl: "", applyLabel: "Official site", verifiedOn: "", body: "" };

export function Editor({ id, onClose }: { id: string | null; onClose: () => void }) {
  const [form, setForm] = useState<Form>(blank);
  const [item, setItem] = useState<AdminItem | null>(null);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [problems, setProblems] = useState<string[]>([]);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(id === null);

  useEffect(() => {
    if (!id) return;
    api.get<{ item: AdminItem; problems: string[]; history: HistoryRow[] }>(`/api/radar/admin/items/${id}`).then((r) => {
      setItem(r.item); setHistory(r.history); setProblems(r.problems);
      setForm(Object.fromEntries(FIELDS.map((k) => [k, (r.item[k as keyof AdminItem] as string | undefined) ?? ""])) as Form);
      setLoaded(true);
    }).catch(() => setMsg("Could not load this entry."));
  }, [id]);

  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const run = async (fn: () => Promise<{ item: AdminItem }>, ok: string) => {
    setBusy(true); setMsg("");
    try {
      const r = await fn();
      setItem(r.item); setMsg(ok);
      const h = await api.get<{ problems: string[]; history: HistoryRow[] }>(`/api/radar/admin/items/${r.item.id}`);
      setProblems(h.problems); setHistory(h.history);
    } catch (e) {
      const p = (e as { problems?: string[] }).problems;
      setMsg(e instanceof ApiError ? e.message : "Something went wrong.");
      if (p) setProblems(p);
    }
    setBusy(false);
  };
  const save = () => run(() => (item ? api.patch(`/api/radar/admin/items/${item.id}`, form) : api.post("/api/radar/admin/items", form)), "Saved.");
  const act = (what: "publish" | "archive" | "verified", ok: string) => item && run(() => api.post(`/api/radar/admin/items/${item.id}/${what}`, {}), ok);

  if (!loaded) return <p className="text-muted-foreground">{msg || "Loading…"}</p>;
  const checklist = [
    ["Official source link (https)", /^https:\/\//.test(form.sourceUrl)],
    ["Official apply link (https)", /^https:\/\//.test(form.officialApplyUrl)],
    ["Checked on date stamped", !!form.verifiedOn],
  ] as const;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-4xl font-black uppercase leading-none">{item ? item.title : "New notification"}</h1>
        <button onClick={onClose} className="min-h-11 rounded-lg border border-white/20 px-4 text-sm font-semibold">Back to list</button>
      </div>

      <form onSubmit={(e) => { e.preventDefault(); save(); }} className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm sm:col-span-2">Title<input required className={input} value={form.title} onChange={set("title")} /></label>
        <label className="text-sm">Conducted by<input required className={input} value={form.conductedBy} onChange={set("conductedBy")} /></label>
        <label className="text-sm">Service<select className={input} value={form.service} onChange={set("service")}>{SERVICES.map((s) => <option key={s}>{s}</option>)}</select></label>
        <label className="text-sm">Exam or entry<input required className={input} value={form.exam} onChange={set("exam")} /></label>
        <label className="text-sm">Date confidence
          <select className={input} value={form.confidence} onChange={set("confidence")}>
            <option value="official">Official (stated in the notice)</option><option value="tentative">Tentative (calendar, can change)</option><option value="expected">Expected (not announced)</option>
          </select>
        </label>
        <label className="text-sm">Opens<input type="date" className={input} value={form.opens} onChange={set("opens")} /></label>
        <label className="text-sm">Last date<input type="date" className={input} value={form.lastDate} onChange={set("lastDate")} /></label>
        <label className="text-sm">Exam date<input type="date" className={input} value={form.examDate} onChange={set("examDate")} /></label>
        <p className="self-end text-xs text-muted-foreground">Leave a date empty unless the official source states it. Never estimate one.</p>
        <label className="text-sm sm:col-span-2">Official source (notice or page the dates come from)<input type="url" className={input} value={form.sourceUrl} onChange={set("sourceUrl")} /></label>
        <label className="text-sm sm:col-span-2">Official apply link<input type="url" className={input} value={form.officialApplyUrl} onChange={set("officialApplyUrl")} /></label>
        <label className="text-sm">Apply button label<input className={input} value={form.applyLabel} onChange={set("applyLabel")} /></label>
        <label className="text-sm">Checked on<input type="date" className={input} value={form.verifiedOn} onChange={set("verifiedOn")} /></label>
        <label className="text-sm sm:col-span-2">Note shown to aspirants<textarea rows={4} className={`${input} py-2`} value={form.body} onChange={set("body")} /></label>
        <div className="flex flex-wrap gap-2 sm:col-span-2">
          <button disabled={busy} className="min-h-11 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground disabled:opacity-60">{busy ? "Working…" : "Save"}</button>
          {item && <button type="button" disabled={busy} onClick={() => act("verified", "Stamped as checked today.")} className="min-h-11 rounded-lg border border-white/20 px-4 text-sm font-semibold">I checked the source today, nothing changed</button>}
          {item && item.status !== "published" && <button type="button" disabled={busy || checklist.some(([, ok]) => !ok)} onClick={() => act("publish", "Published.")} className="min-h-11 rounded-lg border border-green-500/60 px-4 text-sm font-semibold text-green-400 disabled:opacity-40">Publish</button>}
          {item && item.status !== "archived" && <button type="button" disabled={busy} onClick={() => act("archive", "Archived.")} className="min-h-11 rounded-lg border border-white/20 px-4 text-sm font-semibold">Archive</button>}
        </div>
      </form>
      {msg && <p role="status" className="text-sm">{msg}</p>}

      <section aria-label="Publish checklist" className="rounded-2xl border border-white/10 p-5">
        <h2 className="text-xl font-bold">Before this goes public</h2>
        <ul className="mt-2 space-y-1 text-sm">
          {checklist.map(([l, ok]) => <li key={l} className={ok ? "text-green-400" : "text-muted-foreground"}>{ok ? "Done" : "Missing"}: {l}</li>)}
        </ul>
        <p className="mt-2 text-xs text-muted-foreground">Save first, then Publish. Status: <strong>{item?.status ?? "not saved yet"}</strong>{item?.verifiedBy ? ` · last stamped by ${item.verifiedBy}` : ""}</p>
        {problems.length > 0 && <ul className="mt-2 list-disc pl-5 text-sm text-destructive">{problems.map((p) => <li key={p}>{p}</li>)}</ul>}
      </section>

      {history.length > 0 && (
        <section aria-label="Change history">
          <h2 className="text-xl font-bold">Change history</h2>
          <ul className="mt-3 space-y-4">
            {history.map((h) => (
              <li key={h.id} className="border-l border-white/20 pl-4 text-sm">
                <p className="font-semibold">{h.action} <span className="font-normal text-muted-foreground">· {h.createdAt.slice(0, 16).replace("T", " ")} UTC · {h.changedBy ?? "system"}</span></p>
                <ul className="mt-1 font-mono text-xs">
                  {Object.entries(h.changes).filter(([k]) => h.action !== "created" || k === "status").map(([k, c]) => (
                    <li key={k}><span className="text-muted-foreground">{k}: </span><span className="text-destructive line-through">{c.from ?? "empty"}</span> <span className="text-green-400">{c.to ?? "empty"}</span></li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
