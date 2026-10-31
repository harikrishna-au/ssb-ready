"use client";

import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";

type Prefs = { remindersEnabled: boolean; digest: boolean; hasEmail: boolean; confirmed: boolean };
type Res = { prefs: Prefs; confirmationSent?: boolean };

/** Email reminder preferences. Mail only goes to a verified address the user confirms through an emailed link. */
export function ReminderSettings() {
  const [prefs, setPrefs] = useState<Prefs | null>(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let live = true;
    api.get<Res>("/api/radar/prefs").then((r) => live && setPrefs(r.prefs)).catch(() => live && setLoadError(true));
    return () => { live = false; };
  }, []);

  const save = async (patch: Partial<Pick<Prefs, "remindersEnabled" | "digest">>) => {
    setBusy(true);
    setMsg("");
    try {
      const r = await api.put<Res>("/api/radar/prefs", { remindersEnabled: prefs?.remindersEnabled, digest: prefs?.digest, ...patch });
      setPrefs(r.prefs);
      if (r.confirmationSent) setMsg("We sent a confirmation link to your account email. Reminders start once you click it.");
    } catch (e) {
      setMsg(e instanceof ApiError ? e.message : "Could not save. Try again.");
    }
    setBusy(false);
  };

  if (loadError) return <p role="alert" className="text-sm text-destructive">Could not load reminder settings.</p>;
  if (!prefs) return <p className="text-sm text-muted-foreground">Loading reminder settings…</p>;
  const on = prefs.remindersEnabled && prefs.confirmed;
  return (
    <section aria-labelledby="rem-h" className="rounded-2xl border border-white/10 p-5">
      <h2 id="rem-h" className="text-2xl font-extrabold">Email reminders</h2>
      <p className="mt-1 max-w-xl text-sm text-muted-foreground">
        We email you 7, 3 and 1 days before the last date of a notification you saved but have not marked as applied, and when its dates change. Times use India time. Every email has an unsubscribe link.
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-4">
        <label className="flex min-h-11 items-center gap-2 text-sm">
          <input type="checkbox" className="size-5" checked={on} disabled={busy} onChange={(e) => save({ remindersEnabled: e.target.checked })} />
          Send me reminders
        </label>
        <label className="flex min-h-11 items-center gap-2 text-sm">
          <input type="checkbox" className="size-5" checked={prefs.digest} disabled={busy} onChange={(e) => save({ digest: e.target.checked })} />
          One daily digest instead of separate emails
        </label>
      </div>
      {prefs.remindersEnabled && prefs.hasEmail && !prefs.confirmed && (
        <p className="mt-2 text-sm text-brass">Waiting for you to confirm your email. Check your inbox for the link.
          <button disabled={busy} onClick={() => save({ remindersEnabled: true })} className="ml-2 min-h-11 underline">Send it again</button>
        </p>
      )}
      {msg && <p role="status" className="mt-2 text-sm">{msg}</p>}
    </section>
  );
}
