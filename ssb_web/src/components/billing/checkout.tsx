"use client";

import { Loader2 } from "lucide-react";
import { useRef, useState } from "react";
import { ApiError, api } from "@/lib/api";
import { LEGAL } from "@/lib/legal";
import { usePremium } from "@/lib/use-premium";
import { loadRazorpay, type RazorpayResponse } from "./razorpay";

type OrderOut = { keyId: string; orderId: string; amountPaise: number; currency: string; prefill: { name: string; email: string; contact: string } };
type Phase = "idle" | "starting" | "paying" | "confirming" | "done" | "cancelled" | "failed" | "slow";

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Pay button. The server decides the amount and whether the PIQ is complete; this component only
 * opens Razorpay with what the server returned and reports the result back for verification.
 */
export function Checkout() {
  const { refresh } = usePremium();
  const [phase, setPhase] = useState<Phase>("idle");
  const [message, setMessage] = useState("");
  const busy = useRef(false); // synchronous guard: state updates are too slow to stop a double click
  const paidRef = useRef(false); // set once Razorpay reports success, so a late "dismiss" is not read as a cancel

  /** The webhook may confirm the payment before (or instead of) our verify call. Poll for it. */
  async function waitForPaid(orderId: string) {
    for (let i = 0; i < 8; i++) {
      try {
        const s = await api.get<{ status: string }>(`/api/payments/order/${orderId}`);
        if (s.status === "paid") return true;
      } catch { /* keep trying */ }
      await wait(2000);
    }
    return false;
  }

  async function finish(orderId: string, verified: boolean) {
    const paid = verified || (await waitForPaid(orderId));
    if (paid) {
      await refresh();
      setPhase("done");
    } else {
      setPhase("slow");
      setMessage("We have not received confirmation yet. If money left your account, you will get access automatically within a few minutes. You can also refresh this page.");
    }
    busy.current = false;
  }

  async function onPaid(r: RazorpayResponse) {
    paidRef.current = true;
    setPhase("confirming");
    let verified = false;
    try {
      const out = await api.post<{ status: string }>("/api/payments/verify", r);
      verified = out.status === "paid";
    } catch (e) {
      if (e instanceof ApiError && e.status === 400) {
        setPhase("failed");
        setMessage("We could not verify that payment. If money was deducted, write to us and we will sort it out.");
        busy.current = false;
        return;
      }
      // Network trouble or a slow response: the webhook may still have finished it, so keep checking.
    }
    await finish(r.razorpay_order_id, verified);
  }

  async function pay() {
    if (busy.current) return;
    busy.current = true;
    setPhase("starting");
    setMessage("");
    try {
      const [order, Razorpay] = await Promise.all([api.post<OrderOut>("/api/payments/order", {}), loadRazorpay()]);
      paidRef.current = false;
      const rzp = new Razorpay({
        key: order.keyId,
        order_id: order.orderId,
        amount: order.amountPaise,
        currency: order.currency,
        name: "ReadyKadet",
        description: "Lifetime access, paid once",
        prefill: order.prefill,
        theme: { color: "#4b7bf5" },
        handler: (r) => void onPaid(r),
        modal: { ondismiss: () => { setTimeout(() => { if (paidRef.current) return; setPhase((p) => (p === "paying" ? "cancelled" : p)); busy.current = false; }, 400); } },
      });
      rzp.on("payment.failed", (r) => {
        setPhase("failed");
        setMessage(r.error?.description || "The payment did not go through. You have not been charged for access. Please try again.");
        busy.current = false;
      });
      setPhase("paying");
      rzp.open();
    } catch (e) {
      setPhase("failed");
      setMessage(e instanceof Error ? e.message : "Could not start the payment.");
      busy.current = false;
    }
  }

  const working = phase === "starting" || phase === "confirming";
  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={() => void pay()}
        disabled={working || phase === "paying" || phase === "done"}
        className="inline-flex h-12 min-w-48 items-center justify-center gap-2 rounded-full bg-brass px-8 font-semibold text-black transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass disabled:opacity-60 disabled:hover:translate-y-0"
      >
        {working && <Loader2 className="size-4 animate-spin" aria-hidden />}
        {phase === "confirming" ? "Confirming payment…" : phase === "starting" ? "Starting…" : phase === "cancelled" || phase === "failed" ? `Try again, pay ${LEGAL.price}` : `Pay ${LEGAL.price}`}
      </button>
      <p className="mt-2 text-xs text-muted-foreground">Secure checkout by Razorpay. UPI, cards and netbanking. One payment, no renewal.</p>
      <div aria-live="polite" className="mt-3 text-sm">
        {phase === "cancelled" && <p className="text-muted-foreground">Payment cancelled. Nothing was charged. You can try again whenever you are ready.</p>}
        {phase === "confirming" && <p className="text-muted-foreground">Please keep this page open while we confirm your payment.</p>}
        {(phase === "failed" || phase === "slow") && <p role="alert" className={phase === "failed" ? "text-destructive" : "text-muted-foreground"}>{message}</p>}
        {(phase === "failed" || phase === "slow") && (
          <p className="mt-1 text-muted-foreground">Need help? <a className="text-primary underline" href={`mailto:${LEGAL.supportEmail}?subject=Payment%20help`}>{LEGAL.supportEmail}</a></p>
        )}
      </div>
    </div>
  );
}
