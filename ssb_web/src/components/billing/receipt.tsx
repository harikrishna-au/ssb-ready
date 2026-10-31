"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export type PaymentItem = {
  orderId: string; paymentId: string | null; status: "paid" | "failed" | "refunded"; amountInr: number; currency: string;
  baseAmountInr: number; gstRatePercent: number; gstAmountInr: number; gstin: string | null;
  receiptNo: string | null; source: string; email: string | null; createdAt: string; paidAt: string | null; refundedAt: string | null; failureReason: string | null;
};
type History = { premium: boolean; items: PaymentItem[] };

export const inr = (n: number) => `₹${n.toLocaleString("en-IN", { minimumFractionDigits: Number.isInteger(n) ? 0 : 2 })}`;
export const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "");

/** Loads payment history once. `state` is null until the first answer. */
export function usePayments() {
  const [state, setState] = useState<{ data: History | null; error: boolean; loading: boolean }>({ data: null, error: false, loading: true });
  useEffect(() => {
    let live = true;
    api.get<History>("/api/payments/history")
      .then((data) => live && setState({ data, error: false, loading: false }))
      .catch(() => live && setState({ data: null, error: true, loading: false }));
    return () => { live = false; };
  }, []);
  return state;
}

/** Receipt lines for one payment. */
export function ReceiptDetails({ item }: { item: PaymentItem }) {
  const rows: [string, string][] = [];
  if (item.receiptNo) rows.push(["Receipt number", item.receiptNo]);
  if (item.paidAt) rows.push(["Paid on", when(item.paidAt)]);
  if (item.paymentId) rows.push(["Payment id", item.paymentId]);
  rows.push(["Order id", item.orderId]);
  if (item.gstAmountInr > 0) {
    rows.push(["Amount before GST", inr(item.baseAmountInr)], [`GST at ${item.gstRatePercent}%`, inr(item.gstAmountInr)]);
    if (item.gstin) rows.push(["GSTIN", item.gstin]);
  }
  rows.push(["Total paid", inr(item.amountInr)]);
  return (
    <dl className="grid gap-x-8 gap-y-2 text-sm sm:grid-cols-[auto_1fr]">
      {rows.map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="text-muted-foreground">{k}</dt>
          <dd className="break-all font-medium">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Shown on /premium to someone who already has Lifetime access. */
export function OwnedCard({ since }: { since: string | null }) {
  const { data, loading } = usePayments();
  const paid = data?.items.find((i) => i.status === "paid");
  return (
    <section className="mt-8 rounded-2xl border border-green-500/40 bg-green-500/5 p-6" aria-labelledby="owned">
      <h2 id="owned" className="text-2xl font-extrabold uppercase">You have Lifetime access</h2>
      <p className="mt-1 text-muted-foreground">
        All pictures for PPDT and TAT are unlocked on every device you are signed in on.
        {since && ` Active since ${when(since)}.`}
      </p>
      <div className="mt-5 border-t border-white/10 pt-5">
        {loading && <p className="text-sm text-muted-foreground">Loading your receipt…</p>}
        {paid && <ReceiptDetails item={paid} />}
        {!loading && !paid && (
          <p className="text-sm text-muted-foreground">Your access was added without an online payment on this site (for example a purchase in the mobile app), so there is no web receipt to show here.</p>
        )}
      </div>
      <Link href="/billing" className="mt-5 inline-flex h-11 items-center rounded-full border border-white/15 px-6 text-sm font-semibold transition-colors hover:border-white/40">View billing history</Link>
    </section>
  );
}
