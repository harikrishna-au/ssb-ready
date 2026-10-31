"use client";

import Link from "next/link";
import { useState } from "react";
import { useTracker } from "@/lib/use-tracker";

const btn = "inline-flex min-h-11 items-center rounded-lg border px-4 text-sm font-semibold disabled:opacity-60";

export function TrackButton({ id, from = "/radar" }: { id: string; from?: string }) {
  const { ready, signedIn, apps, track, setStatus, loadFailed, retry } = useTracker();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  if (!ready) return <span className="inline-flex h-11 w-24 rounded-lg bg-white/5" aria-hidden />;

  if (!signedIn)
    return (
      <Link href={`/sign-up?redirect_url=${encodeURIComponent(from)}`} className={`${btn} border-white/20 hover:border-primary`}>
        Sign up to track
      </Link>
    );

  if (loadFailed)
    return <button onClick={() => retry()} className={`${btn} border-white/20`}>Could not load your list. Retry</button>;

  const run = async (p: Promise<void>) => {
    setBusy(true);
    setError(false);
    try { await p; } catch { setError(true); }
    setBusy(false);
  };

  const mine = apps[id];
  return (
    <span className="inline-flex flex-col">
      <span className="inline-flex flex-wrap items-center gap-2">
        {mine ? (
          <>
            <Link href="/applications" className={`${btn} border-primary/50 bg-primary/10 text-primary`}>Tracking · view</Link>
            {mine.status === "saved" && (
              <button disabled={busy} onClick={() => run(setStatus(id, "applied"))} className={`${btn} border-green-500/50 text-green-400 hover:bg-green-500/10`}>
                {busy ? "Saving…" : "I applied"}
              </button>
            )}
          </>
        ) : (
          <button disabled={busy} onClick={() => run(track(id))} className={`${btn} border-white/20 hover:border-primary`}>
            {busy ? "Saving…" : "Track this"}
          </button>
        )}
      </span>
      {error && <span role="alert" className="mt-1 text-xs text-destructive">Could not save. Try again.</span>}
    </span>
  );
}
