"use client";

import Link from "next/link";
import { useState } from "react";
import { useTracker } from "@/lib/use-tracker";

export function TrackButton({ id, from = "/radar" }: { id: string; from?: string }) {
  const { ready, signedIn, apps, track } = useTracker();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  if (!ready) return <span className="inline-flex h-9 w-24 rounded-lg bg-white/5" aria-hidden />;

  if (!signedIn)
    return (
      <Link href={`/sign-up?redirect_url=${encodeURIComponent(from)}`} className="inline-flex rounded-lg border border-white/20 px-4 py-2 text-sm font-semibold hover:border-primary">
        Sign up to track
      </Link>
    );

  if (apps[id])
    return (
      <Link href="/applications" className="inline-flex rounded-lg border border-primary/50 bg-primary/10 px-4 py-2 text-sm font-semibold text-primary">
        Tracking · view
      </Link>
    );

  return (
    <span className="inline-flex flex-col">
      <button
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError(false);
          try { await track(id); } catch { setError(true); }
          setBusy(false);
        }}
        className="inline-flex rounded-lg border border-white/20 px-4 py-2 text-sm font-semibold hover:border-primary disabled:opacity-60"
      >
        {busy ? "Saving…" : "Track this"}
      </button>
      {error && <span role="alert" className="mt-1 text-xs text-destructive">Could not save. Try again.</span>}
    </span>
  );
}
