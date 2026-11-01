"use client";

import Link from "next/link";
import { useEffect } from "react";

/** Shown when a page throws. Never prints the raw error: it can leak internals and means nothing to an aspirant. */
export function ErrorView({ error, retry, home = "/dashboard" }: { error: unknown; retry: () => void; home?: string }) {
  useEffect(() => { console.error(error); }, [error]);
  return (
    <div role="alert" className="mx-auto flex min-h-[60dvh] max-w-md flex-col justify-center px-4 py-12">
      <p className="font-display text-6xl font-black text-brass">Oops</p>
      <h1 className="mt-2 text-3xl font-black uppercase leading-none">Something went wrong</h1>
      <p className="mt-3 text-muted-foreground">This page hit a problem on our side. Your saved attempts are safe. Try again, and if it keeps happening write to support.</p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <button onClick={retry} className="inline-flex h-12 items-center justify-center rounded-full bg-primary px-8 font-semibold text-primary-foreground">Try again</button>
        <Link href={home} className="inline-flex h-12 items-center justify-center rounded-full border border-white/20 px-8 font-semibold hover:border-white/40">Go home</Link>
      </div>
    </div>
  );
}
