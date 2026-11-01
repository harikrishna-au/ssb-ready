import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Razorpay webhook for the Lifetime plan. Backs up lifetime-premium's verify_payment (user closed the
 * tab before verifying), and records failures and refunds. Configure in the Razorpay dashboard:
 *   URL    https://<project-ref>.supabase.co/functions/v1/razorpay-webhook
 *   Events payment.captured, order.paid, payment.failed, refund.processed
 *   Secret same value as the RAZORPAY_WEBHOOK_SECRET function secret
 * Every delivery is logged once in payment_events (event_id is unique), so replays are harmless.
 */

const PLAN_TYPE = "lifetime";

function requireEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`${name} is missing`);
  return value;
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

async function hmacSha256Hex(message: string, secret: string) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

const ok = (body: Record<string, unknown> = { received: true }) =>
  new Response(JSON.stringify(body), { headers: { "Content-Type": "application/json" } });

serve(async (req: Request) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const signature = req.headers.get("x-razorpay-signature");
  if (!signature) return new Response("No signature", { status: 400 });

  // Raw body: the signature is over the exact bytes Razorpay sent.
  const rawBody = await req.text();
  const secret = Deno.env.get("RAZORPAY_WEBHOOK_SECRET") || requireEnv("RAZORPAY_KEY_SECRET");
  if (!safeEqual(await hmacSha256Hex(rawBody, secret), signature)) return new Response("Invalid signature", { status: 403 });

  try {
    const payload = JSON.parse(rawBody);
    const event = text(payload.event);
    const eventId = req.headers.get("x-razorpay-event-id") || "";
    const admin = createClient(requireEnv("SUPABASE_URL"), requireEnv("SUPABASE_SERVICE_ROLE_KEY"));

    const payment = payload.payload?.payment?.entity ?? null;
    const refund = payload.payload?.refund?.entity ?? null;
    const orderId = text(payment?.order_id) || text(payload.payload?.order?.entity?.id);
    const paymentId = text(payment?.id) || text(refund?.payment_id);

    // Idempotency: first delivery inserts, a replay hits the unique event_id and stops here.
    if (eventId) {
      const { error } = await admin.from("payment_events").insert({
        event_id: eventId, order_id: orderId || null, payment_id: paymentId || null,
        kind: `webhook:${event}`, detail: { event },
      });
      if (error?.code === "23505") return ok({ received: true, duplicate: true });
      if (error) throw error;
    }

    // Find our row: by order id, or for refunds by payment id.
    let txnQuery = admin.from("payment_transactions").select("*");
    txnQuery = orderId ? txnQuery.eq("order_id", orderId) : txnQuery.eq("payment_id", paymentId);
    const { data: txn } = await txnQuery.maybeSingle();
    if (!txn) {
      console.warn(`[razorpay-webhook] ${event}: no matching transaction (order=${orderId} payment=${paymentId})`);
      return ok();
    }

    const now = new Date().toISOString();
    const log = (kind: string, from: string, to: string) =>
      admin.from("payment_events").insert({
        order_id: txn.order_id, payment_id: paymentId || null, user_id: txn.user_id, kind,
        from_status: from, to_status: to,
      });

    if (event === "payment.captured" || event === "order.paid") {
      if (txn.status === "refunded") return ok();
      // Never trust the notes alone: the amount must match what lifetime-premium created the order for.
      if (payment && txn.amount_paise && payment.amount !== txn.amount_paise) {
        console.error(`[razorpay-webhook] amount mismatch order=${orderId} got=${payment.amount} want=${txn.amount_paise}`);
        return ok();
      }

      const notes = payment?.notes ?? {};
      const email = text(notes.email) || text(payment?.email) || txn.email || "";
      const username = text(notes.username) || (email.split("@")[0] || "member").toLowerCase().replace(/[^a-z0-9]+/g, "_").slice(0, 24) || "member";

      const { data: existing } = await admin.from("premium_members").select("premium_since, subscription_status").eq("user_id", txn.user_id).maybeSingle();
      const premiumSince = existing?.subscription_status === "active" && existing.premium_since ? existing.premium_since : now;

      const member = {
        user_id: txn.user_id, email, username, is_premium: true, plan_type: PLAN_TYPE,
        subscription_id: paymentId, subscription_status: "active", premium_expires_at: null, updated_at: now,
      };
      const { error: pErr } = await admin.from("profiles").upsert(member, { onConflict: "user_id" });
      if (pErr) throw pErr;
      const { error: mErr } = await admin.from("premium_members").upsert(
        { ...member, order_id: txn.order_id, payment_id: paymentId, amount_inr: txn.amount, premium_since: premiumSince },
        { onConflict: "user_id" },
      );
      if (mErr) throw mErr;

      // Only move created/failed rows forward so verify_payment's result is not overwritten.
      if (txn.status === "created" || txn.status === "failed") {
        await admin.from("payment_transactions").update({
          status: "paid", payment_id: paymentId, provider_reference_id: paymentId, paid_at: now,
          receipt_no: txn.receipt_no || `RK-${paymentId.replace(/^pay_/, "").toUpperCase()}`,
          raw_response: payment ?? txn.raw_response,
        }).eq("order_id", txn.order_id);
        await log("entitlement_granted", txn.status, "paid");
      }
    } else if (event === "payment.failed") {
      if (txn.status === "created") {
        await admin.from("payment_transactions").update({
          status: "failed", failure_reason: text(payment?.error_description) || text(payment?.error_code) || "payment failed",
          raw_response: payment,
        }).eq("order_id", txn.order_id);
        await log("payment_failed", "created", "failed");
      }
    } else if (event === "refund.processed") {
      if (txn.status !== "refunded") {
        await admin.from("payment_transactions").update({ status: "refunded", refunded_at: now }).eq("order_id", txn.order_id);
        await admin.from("profiles").update({ is_premium: false, subscription_status: "refunded", updated_at: now }).eq("user_id", txn.user_id);
        await admin.from("premium_members").update({ subscription_status: "refunded", updated_at: now }).eq("user_id", txn.user_id);
        await log("entitlement_revoked", txn.status, "refunded");
      }
    }

    return ok();
  } catch (e) {
    console.error("[razorpay-webhook]", e);
    // 500 makes Razorpay retry, which is what we want for a transient database error.
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "webhook failed" }), { status: 500 });
  }
});
