"use client";

import { useState } from "react";

type State = { kind: "idle" } | { kind: "busy" } | { kind: "ok" } | { kind: "err"; msg: string };

/** Weekly Radar digest signup. Honest about what happens when the backend is not connected. */
export function NewsletterForm({ source = "site", compact = false }: { source?: string; compact?: boolean }) {
  const [state, setState] = useState<State>({ kind: "idle" });

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setState({ kind: "busy" });
    try {
      const r = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: form.get("email"), company: form.get("company"), source }),
      });
      if (r.ok) return setState({ kind: "ok" });
      const j = (await r.json().catch(() => ({}))) as { error?: string };
      setState({
        kind: "err",
        msg: j.error === "invalid_email" ? "That email address does not look right." : j.error === "not_configured" ? "The weekly digest is not open yet. Please check back soon." : "Something went wrong. Please try again in a minute.",
      });
    } catch {
      setState({ kind: "err", msg: "Could not reach the server. Check your connection and try again." });
    }
  }

  if (state.kind === "ok") return <p role="status" className="text-sm font-semibold text-brass">Thanks. Check your inbox for a confirmation.</p>;

  return (
    <form onSubmit={onSubmit} className={compact ? "space-y-2" : "space-y-3"} noValidate>
      <div className="flex flex-col gap-2 sm:flex-row">
        <label htmlFor={`nl-${source}`} className="sr-only">Email address</label>
        <input
          id={`nl-${source}`} name="email" type="email" required autoComplete="email" inputMode="email" placeholder="you@example.com"
          className="min-h-11 flex-1 rounded-lg border border-white/15 bg-background px-4 text-sm placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        />
        <input name="company" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />
        <button type="submit" disabled={state.kind === "busy"} className="min-h-11 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground disabled:opacity-60">
          {state.kind === "busy" ? "Sending…" : "Send me the digest"}
        </button>
      </div>
      {state.kind === "err" && <p role="alert" className="text-sm text-red-400">{state.msg}</p>}
      <p className="text-xs text-muted-foreground">The plan is one email a week: open officer-entry dates and one prep guide. You will be able to unsubscribe from any email. Read the <a className="underline" href="/privacy">privacy policy</a>.</p>
    </form>
  );
}
