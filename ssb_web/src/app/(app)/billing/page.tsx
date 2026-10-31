"use client";

import Link from "next/link";
import { inr, ReceiptDetails, usePayments, when } from "@/components/billing/receipt";
import { LEGAL } from "@/lib/legal";

const LABEL = { paid: "Paid", failed: "Failed", refunded: "Refunded" } as const;
const TONE = { paid: "bg-green-500/15 text-green-400", failed: "bg-destructive/15 text-destructive", refunded: "bg-white/10 text-muted-foreground" } as const;

export default function Billing() {
  const { data, error, loading } = usePayments();
  return (
    <div className="rise max-w-3xl">
      <h1 className="font-display text-6xl font-black uppercase leading-none">Billing</h1>
      <p className="mt-3 text-muted-foreground">Your payments and receipts. Refund terms are in the <Link href="/refunds" className="text-primary underline">refund policy</Link>.</p>

      {loading && <p className="mt-8 text-muted-foreground" role="status">Loading…</p>}
      {error && <p role="alert" className="mt-8 text-destructive">Could not load your payments. Refresh to try again.</p>}

      {data && data.items.length === 0 && (
        <div className="mt-8 rounded-2xl border border-white/10 p-6">
          <p className="font-semibold">No payments yet.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {data.premium ? "You have Lifetime access from a purchase that is not recorded on this site (for example the mobile app)." : `Lifetime access is ${LEGAL.price}, paid once.`}
          </p>
          {!data.premium && <Link href="/premium" className="mt-4 inline-flex h-11 items-center rounded-full bg-brass px-6 font-semibold text-black">See Lifetime access</Link>}
        </div>
      )}

      <ul className="mt-8 space-y-4">
        {data?.items.map((i) => (
          <li key={i.orderId} className="rounded-2xl border border-white/10 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-semibold">Lifetime access</p>
                <p className="text-sm text-muted-foreground">{when(i.paidAt ?? i.createdAt)}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-display text-3xl font-black">{inr(i.amountInr)}</span>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${TONE[i.status]}`}>{LABEL[i.status]}</span>
              </div>
            </div>
            {i.status === "failed" && i.failureReason && <p className="mt-3 text-sm text-muted-foreground">Reason given by the bank: {i.failureReason}</p>}
            {i.status === "refunded" && i.refundedAt && <p className="mt-3 text-sm text-muted-foreground">Refunded on {when(i.refundedAt)}. Lifetime access was removed.</p>}
            {i.status !== "failed" && (
              <details className="mt-4">
                <summary className="min-h-11 cursor-pointer py-2 text-sm font-semibold text-primary focus-visible:outline-2 focus-visible:outline-primary">Receipt details</summary>
                <div className="mt-3"><ReceiptDetails item={i} /></div>
              </details>
            )}
          </li>
        ))}
      </ul>
      <p className="mt-8 text-sm text-muted-foreground">Missing a payment? Write to <a className="text-primary underline" href={`mailto:${LEGAL.supportEmail}?subject=Billing`}>{LEGAL.supportEmail}</a> with the email you signed up with.</p>
    </div>
  );
}
