"use client";

import { Check, Lock } from "lucide-react";
import Link from "next/link";
import { Checkout } from "@/components/billing/checkout";
import { OwnedCard } from "@/components/billing/receipt";
import { LEGAL } from "@/lib/legal";
import { usePiq } from "@/lib/use-piq";
import { usePremium } from "@/lib/use-premium";

/** Two steps: the PIQ must be complete before the payment step unlocks. */
export default function Premium() {
  const { completeness: c, loading, failed, reload } = usePiq();
  const piqDone = !loading && !failed && c.complete;
  const own = usePremium();

  return (
    <div className="rise max-w-2xl">
      <h1 className="font-display text-6xl font-black uppercase leading-none">Lifetime access</h1>
      <p className="mt-4 font-display text-6xl font-black text-brass">{LEGAL.price} <span className="text-xl font-semibold text-muted-foreground">paid once</span></p>
      <ul className="mt-6 space-y-2 text-muted-foreground">
        <li className="flex gap-3"><Check className="mt-1 size-4 shrink-0 text-brass" aria-hidden />The full 45-picture bank for PPDT and TAT, instead of 5</li>
        <li className="flex gap-3"><Check className="mt-1 size-4 shrink-0 text-brass" aria-hidden />No subscription and no renewal</li>
      </ul>

      {own.premium && <OwnedCard since={own.premiumSince} />}
      {own.failed && <p role="alert" className="mt-6 text-sm text-destructive">Could not check your access. <button className="font-semibold underline" onClick={() => void own.refresh()}>Try again</button></p>}

      {!own.premium && !own.loading && (
      <ol className="mt-10 space-y-4">
        <li className={`rounded-2xl border p-6 ${piqDone ? "border-green-500/40 bg-green-500/5" : "border-primary/40 bg-primary/5"}`}>
          <div className="flex items-start gap-4">
            <span className={`grid size-9 shrink-0 place-items-center rounded-full text-sm font-bold ${piqDone ? "bg-green-500 text-black" : "bg-primary text-primary-foreground"}`}>
              {piqDone ? <Check className="size-5" aria-hidden /> : 1}
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="text-2xl font-extrabold uppercase">Complete your PIQ</h2>
              {loading && <p className="mt-1 text-sm text-muted-foreground">Checking your PIQ…</p>}
              {failed && (
                <p role="alert" className="mt-1 text-sm text-destructive">
                  Could not check your PIQ. <button className="font-semibold underline" onClick={() => void reload()}>Try again</button>
                </p>
              )}
              {piqDone && <p className="mt-1 text-sm text-muted-foreground">Done. Everything required is filled in. <Link href="/piq" className="text-primary underline">Review or edit</Link></p>}
              {!loading && !failed && !piqDone && (
                <>
                  <p className="mt-1 text-sm text-muted-foreground">We need your PIQ on file before you pay. It also powers your mock interview. It takes about five minutes.</p>
                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={c.percent} aria-label="PIQ completion">
                    <div className="h-full bg-primary transition-[width]" style={{ width: `${c.percent}%` }} />
                  </div>
                  <p className="mt-1.5 text-xs text-muted-foreground">{c.done} of {c.total} required fields done</p>
                  <Link href="/piq?next=/premium" className="mt-5 inline-flex h-12 items-center rounded-full bg-primary px-8 font-semibold text-primary-foreground transition-transform hover:-translate-y-0.5">
                    {c.done === 0 ? "Fill my PIQ" : "Continue my PIQ"}
                  </Link>
                </>
              )}
            </div>
          </div>
        </li>

        <li className={`rounded-2xl border p-6 transition-opacity ${piqDone ? "border-brass/40" : "border-white/10 opacity-60"}`}>
          <div className="flex items-start gap-4">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-white/10 text-sm font-bold">{piqDone ? 2 : <Lock className="size-4" aria-hidden />}</span>
            <div>
              <h2 className="text-2xl font-extrabold uppercase">Pay {LEGAL.price}</h2>
              {piqDone ? (
                <>
                  <p className="mt-1 text-sm text-muted-foreground">Your PIQ is on file. Pay once and the full picture bank unlocks straight away. Bought it on the mobile app already? Sign in to the web with the same verified email and it carries over.</p>
                  <Checkout />
                </>
              ) : (
                <p className="mt-1 text-sm text-muted-foreground">Unlocks once your PIQ is complete.</p>
              )}
            </div>
          </div>
        </li>
      </ol>
      )}
    </div>
  );
}
