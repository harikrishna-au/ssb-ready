import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createRemoteJWKSet, jwtVerify } from "npm:jose@5.9.6";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LIST_PRICE_INR = 499;
const DISCOUNT_INR = 200;
const PAYABLE_AMOUNT_INR = LIST_PRICE_INR - DISCOUNT_INR;
const PAYABLE_AMOUNT_PAISE = PAYABLE_AMOUNT_INR * 100;
const PLAN_TYPE = "lifetime";

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function normalizeText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function requireEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`${name} is missing`);
  return value;
}

function buildUsername(email: string, displayName: string) {
  const seed = normalizeText(displayName) || email.split("@")[0] || "member";
  return seed
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 24) || "member";
}

type AuthUser = { uid: string; email: string; name: string; provider: "clerk" };

let clerkJwks: ReturnType<typeof createRemoteJWKSet> | null = null;

/**
 * Clerk session JWT. The issuer is pinned from CLERK_ISSUER (never read from the token), the
 * signing keys come from that issuer's JWKS, and jose enforces signature, exp and nbf.
 */
async function verifyClerkToken(token: string): Promise<AuthUser> {
  const issuer = requireEnv("CLERK_ISSUER").replace(/\/$/, "");
  clerkJwks ??= createRemoteJWKSet(new URL(Deno.env.get("CLERK_JWKS_URL") || `${issuer}/.well-known/jwks.json`));
  const { payload } = await jwtVerify(token, clerkJwks, { issuer, clockTolerance: 5 });

  const allowed = normalizeText(Deno.env.get("CLERK_AUTHORIZED_PARTIES")).split(",").map((v) => v.trim()).filter(Boolean);
  const azp = normalizeText(payload.azp);
  if (allowed.length && azp && !allowed.includes(azp)) throw new Error("Token was issued for a different app");

  const uid = normalizeText(payload.sub);
  if (!uid) throw new Error("Clerk token did not include a user id");
  return { uid, email: normalizeText(payload.email), name: normalizeText(payload.name), provider: "clerk" };
}

function unverifiedIssuer(token: string): string {
  try {
    const part = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return normalizeText(JSON.parse(atob(part)).iss);
  } catch {
    return "";
  }
}

/** Clerk session tokens only. The issuer is read just to reject junk early; verifyClerkToken checks everything. */
async function verifyAuthToken(token: string): Promise<AuthUser> {
  if (!unverifiedIssuer(token)) throw new Error("Unrecognised token");
  return verifyClerkToken(token);
}

/** For web (Clerk) users the PIQ must be complete before an order exists. The backend reads the database and decides. */
async function assertPiqComplete(token: string) {
  const backendUrl = normalizeText(Deno.env.get("BACKEND_URL")).replace(/\/$/, "");
  if (!backendUrl) throw new Error("Web checkout is not configured (BACKEND_URL missing)");
  const res = await fetch(`${backendUrl}/api/me`, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error("Could not check your PIQ right now");
  const me = await res.json();
  if (!me.piqComplete) throw new Error("Complete your PIQ before paying");
  if (me.premium) throw new Error("You already have Lifetime access");
}

function razorpayAuthHeader() {
  return `Basic ${btoa(`${requireEnv("RAZORPAY_KEY_ID")}:${requireEnv("RAZORPAY_KEY_SECRET")}`)}`;
}

function supabaseAdmin() {
  return createClient(
    requireEnv("SUPABASE_URL"),
    requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
  );
}

async function createRazorpayOrder(params: {
  uid: string;
  email: string;
  username: string;
}) {
  const receipt = `ssb_${params.uid.slice(0, 12)}_${Date.now()}`.slice(0, 40);
  const res = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      Authorization: razorpayAuthHeader(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: PAYABLE_AMOUNT_PAISE,
      currency: "INR",
      receipt,
      notes: {
        uid: params.uid,
        email: params.email,
        username: params.username,
        plan: PLAN_TYPE,
        list_price_inr: String(LIST_PRICE_INR),
        discount_inr: String(DISCOUNT_INR),
        amount_inr: String(PAYABLE_AMOUNT_INR),
      },
    }),
  });

  const body = await res.json();
  if (!res.ok) {
    throw new Error(body.error?.description ?? body.error ?? "Razorpay order creation failed");
  }
  return body;
}

async function razorpayCall(method: string, path: string, body?: Record<string, unknown>) {
  const res = await fetch(`https://api.razorpay.com/v1${path}`, {
    method,
    headers: { Authorization: razorpayAuthHeader(), "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error?.description ?? "Razorpay request failed");
  return json;
}

/** A buyer is one Clerk user id. Kept as a list so callers that check "any of these ids" stay unchanged. */
// deno-lint-ignore require-await
async function linkedIds(_admin: ReturnType<typeof supabaseAdmin>, uid: string): Promise<string[]> {
  return [uid];
}

async function hasPremium(admin: ReturnType<typeof supabaseAdmin>, ids: string[]): Promise<boolean> {
  const { data } = await admin.from("premium_members").select("user_id").in("user_id", ids).eq("subscription_status", "active").limit(1);
  return !!data?.length;
}

function gstBreakup(totalPaise: number) {
  const rate = Number(Deno.env.get("GST_RATE_PERCENT") || 0);
  const base = Math.round(totalPaise / (1 + rate / 100));
  return { base_amount_paise: base, gst_rate_percent: rate, gst_amount_paise: totalPaise - base };
}

/** Same shape for a fresh order and a re-used one. Snake_case keys are for the mobile app, camelCase for the web. */
function orderPayload(order: { order_id: string; amount_paise: number }, name: string, email: string) {
  return {
    success: true,
    key_id: requireEnv("RAZORPAY_KEY_ID"),
    order_id: order.order_id,
    amount_paise: order.amount_paise,
    amount_inr: order.amount_paise / 100,
    list_price_inr: LIST_PRICE_INR,
    discount_inr: DISCOUNT_INR,
    currency: "INR",
    keyId: requireEnv("RAZORPAY_KEY_ID"),
    orderId: order.order_id,
    amountPaise: order.amount_paise,
    amountInr: order.amount_paise / 100,
    prefill: { name, email, contact: "" },
  };
}

const OPEN_ORDER_REUSE_MS = 30 * 60 * 1000;

// ---------------------------------------------------------------- coupon codes (payment bypass)

const COUPON_MAX_ATTEMPTS_PER_USER_PER_HOUR = 5;
const COUPON_MAX_ATTEMPTS_ALL_USERS_PER_HOUR = 60; // blunts guessing spread across many accounts
const COUPON_MAX_REDEMPTIONS_PER_CODE = Number(Deno.env.get("COUPON_MAX_REDEMPTIONS_PER_CODE") || 50);

async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

const normalizeCoupon = (value: unknown) => normalizeText(value).toUpperCase().replace(/\s+/g, "");

/** Codes live only in the COUPON_CODES function secret (comma separated). Returns a short id of the matched code, or null. */
async function matchCoupon(input: string): Promise<string | null> {
  const codes = normalizeText(Deno.env.get("COUPON_CODES")).split(",").map(normalizeCoupon).filter(Boolean);
  const inputHash = await sha256Hex(input);
  let matched: string | null = null;
  // Compare hashes of every code (no early exit) so timing does not reveal how close a guess was.
  for (const code of codes) {
    const h = await sha256Hex(code);
    let diff = h.length ^ inputHash.length;
    for (let i = 0; i < Math.min(h.length, inputHash.length); i++) diff |= h.charCodeAt(i) ^ inputHash.charCodeAt(i);
    if (diff === 0) matched = h.slice(0, 8);
  }
  return matched;
}


async function fetchRazorpayOrder(orderId: string) {
  const res = await fetch(`https://api.razorpay.com/v1/orders/${orderId}`, {
    headers: {
      Authorization: razorpayAuthHeader(),
      "Content-Type": "application/json",
    },
  });
  const body = await res.json();
  if (!res.ok) {
    throw new Error(body.error?.description ?? body.error ?? "Unable to fetch Razorpay order");
  }
  return body;
}

async function hmacSha256(message: string, secret: string) {
  const encoder = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signed = await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(message));
  return Array.from(new Uint8Array(signed))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function updatePremiumProfile(params: {
  uid: string;
  email: string;
  username: string;
  orderId: string;
  paymentId: string;
  amountInr?: number;
}) {
  const admin = supabaseAdmin();
  const now = new Date().toISOString();
  const profilePayload = {
    user_id: params.uid,
    email: params.email,
    username: params.username,
    is_premium: true,
    plan_type: PLAN_TYPE,
    subscription_id: params.paymentId,
    subscription_status: "active",
    premium_expires_at: null,
    updated_at: now,
  };

  const { data: existing } = await admin
    .from("premium_members")
    .select("premium_since, subscription_status")
    .eq("user_id", params.uid)
    .maybeSingle();
  const premiumSince = existing?.subscription_status === "active" && existing.premium_since ? existing.premium_since : now;

  const { error: profileError } = await admin
    .from("profiles")
    .upsert(profilePayload, { onConflict: "user_id" });
  if (profileError) throw profileError;

  const { error: premiumError } = await admin
    .from("premium_members")
    .upsert(
      {
        ...profilePayload,
        order_id: params.orderId,
        payment_id: params.paymentId,
        amount_inr: params.amountInr ?? PAYABLE_AMOUNT_INR,
        premium_since: premiumSince,
      },
      { onConflict: "user_id" },
    );
  if (premiumError) throw premiumError;
}

async function syncProfile(token: string, payload: Record<string, unknown>) {
  const backendUrl = normalizeText(Deno.env.get("BACKEND_URL"));
  if (!backendUrl) return;

  try {
    const res = await fetch(`${backendUrl.replace(/\/$/, "")}/api/data/user/profile`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      // Non-fatal: Supabase records already updated; log and continue.
      console.warn(`[lifetime-premium] profile premium sync failed (${res.status}): ${await res.text()}`);
    }
  } catch (err) {
    // Non-fatal: network error during optional profile sync.
    console.warn("[lifetime-premium] profile premium sync error:", err);
  }
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    if (!token) return jsonResponse({ error: "Unauthorized" }, 401);

    const authUser = await verifyAuthToken(token);
    const body = await req.json();
    const action = normalizeText(body.action);

    if (action === "create_order") {
      await assertPiqComplete(token);
      const admin = supabaseAdmin();
      const ids = await linkedIds(admin, authUser.uid);
      if (await hasPremium(admin, ids)) return jsonResponse({ error: "You already have Lifetime access" }, 409);

      const email = normalizeText(body.email) || authUser.email;
      const username = buildUsername(email, normalizeText(body.username) || authUser.name);

      // Re-use a recent unpaid order (retry after cancel, page refresh) instead of piling up new ones.
      const since = new Date(Date.now() - OPEN_ORDER_REUSE_MS).toISOString();
      const { data: open } = await admin
        .from("payment_transactions")
        .select("order_id, amount_paise")
        .eq("user_id", authUser.uid)
        .in("status", ["created", "failed"])
        .eq("amount_paise", PAYABLE_AMOUNT_PAISE)
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(1);
      if (open?.[0]) return jsonResponse(orderPayload(open[0], authUser.name, email));

      const order = await createRazorpayOrder({
        uid: authUser.uid,
        email,
        username,
      });
      if (order.amount !== PAYABLE_AMOUNT_PAISE) throw new Error("The payment provider returned an unexpected amount");

      const { error: insertError } = await admin.from("payment_transactions").insert({
        user_id: authUser.uid,
        txnid: order.id,
        order_id: order.id,
        amount: PAYABLE_AMOUNT_INR,
        amount_paise: PAYABLE_AMOUNT_PAISE,
        currency: "INR",
        status: "created",
        email,
        source: "web",
        provider_reference_id: order.id,
        raw_response: order,
        ...gstBreakup(PAYABLE_AMOUNT_PAISE),
      });
      if (insertError) throw new Error("Could not start the payment. Please try again.");
      await admin.from("payment_events").insert({ order_id: order.id, user_id: authUser.uid, kind: "order_created", to_status: "created" });

      return jsonResponse(orderPayload({ order_id: order.id, amount_paise: PAYABLE_AMOUNT_PAISE }, authUser.name, email));
    }

    if (action === "order_status") {
      const orderId = normalizeText(body.order_id);
      if (!/^order_\w+$/.test(orderId)) return jsonResponse({ error: "Malformed order id" }, 400);
      const admin = supabaseAdmin();
      const ids = await linkedIds(admin, authUser.uid);
      const { data: row } = await admin.from("payment_transactions").select("user_id, status, payment_id").eq("order_id", orderId).maybeSingle();
      if (!row || !ids.includes(row.user_id)) return jsonResponse({ error: "Order not found" }, 404);
      return jsonResponse({ orderId, status: row.status, paymentId: row.payment_id ?? null });
    }

    if (action === "history") {
      const admin = supabaseAdmin();
      const ids = await linkedIds(admin, authUser.uid);
      const { data, error } = await admin
        .from("payment_transactions")
        .select("order_id, payment_id, status, amount, amount_paise, currency, base_amount_paise, gst_rate_percent, gst_amount_paise, receipt_no, source, email, created_at, paid_at, refunded_at, failure_reason")
        .in("user_id", ids)
        .in("status", ["paid", "failed", "refunded"])
        .order("created_at", { ascending: false });
      if (error) throw new Error("Could not load your payments");
      const gstin = normalizeText(Deno.env.get("BUSINESS_GSTIN")) || null;
      return jsonResponse({
        premium: await hasPremium(admin, ids),
        items: (data ?? []).map((r) => ({
          orderId: r.order_id,
          paymentId: r.payment_id,
          status: r.status,
          amountInr: r.amount,
          currency: r.currency,
          baseAmountInr: r.base_amount_paise != null ? r.base_amount_paise / 100 : r.amount,
          gstRatePercent: Number(r.gst_rate_percent || 0),
          gstAmountInr: (r.gst_amount_paise || 0) / 100,
          gstin,
          receiptNo: r.receipt_no,
          source: r.source,
          email: r.email,
          createdAt: r.created_at,
          paidAt: r.paid_at,
          refundedAt: r.refunded_at,
          failureReason: r.failure_reason,
        })),
      });
    }

    if (action === "verify_payment") {
      const orderId = normalizeText(body.razorpay_order_id);
      const paymentId = normalizeText(body.razorpay_payment_id);
      const signature = normalizeText(body.razorpay_signature);
      if (!orderId || !paymentId || !signature) {
        throw new Error("Missing Razorpay verification fields");
      }

      const expectedSignature = await hmacSha256(
        `${orderId}|${paymentId}`,
        requireEnv("RAZORPAY_KEY_SECRET"),
      );
      if (expectedSignature !== signature) {
        return jsonResponse({ error: "Invalid payment signature" }, 400);
      }

      const { data: txn } = await supabaseAdmin()
        .from("payment_transactions")
        .select("status")
        .eq("txnid", orderId)
        .maybeSingle();
      if (txn?.status === "refunded") {
        return jsonResponse({ error: "This payment was refunded" }, 409);
      }

      // The signature proves the checkout belongs to this order. Also confirm with Razorpay that the money is real.
      let payment = await razorpayCall("GET", `/payments/${paymentId}`);
      if (payment.order_id !== orderId || payment.amount !== PAYABLE_AMOUNT_PAISE) {
        return jsonResponse({ error: "Payment does not match this order" }, 400);
      }
      if (payment.status === "authorized") {
        payment = await razorpayCall("POST", `/payments/${paymentId}/capture`, { amount: PAYABLE_AMOUNT_PAISE, currency: "INR" });
      }
      if (payment.status !== "captured") return jsonResponse({ error: "Payment was not completed" }, 400);

      const order = await fetchRazorpayOrder(orderId);
      const notes = order.notes ?? {};
      const noteUid = normalizeText(notes.uid);
      if (noteUid !== authUser.uid) {
        return jsonResponse({ error: "Order does not belong to this user" }, 403);
      }
      if (order.amount !== PAYABLE_AMOUNT_PAISE) {
        return jsonResponse({ error: "Unexpected payment amount" }, 400);
      }

      const email = normalizeText(notes.email) || authUser.email;
      const username = normalizeText(notes.username) || buildUsername(email, authUser.name);
      await updatePremiumProfile({
        uid: authUser.uid,
        email,
        username,
        orderId,
        paymentId,
      });

      await syncProfile(token, {
        userId: authUser.uid,
        email,
        username,
        isPremium: true,
        planType: PLAN_TYPE,
        premiumAmount: PAYABLE_AMOUNT_INR,
        premiumListPrice: LIST_PRICE_INR,
        premiumDiscount: DISCOUNT_INR,
        premiumOrderId: orderId,
        premiumPaymentId: paymentId,
      });

      const admin = supabaseAdmin();
      // Only move created/failed rows forward, so a webhook or an earlier verify that already ran is not overwritten.
      await admin.from("payment_transactions").update({
        status: "paid",
        payment_id: paymentId,
        provider_reference_id: paymentId,
        paid_at: new Date().toISOString(),
        receipt_no: `RK-${paymentId.replace(/^pay_/, "").toUpperCase()}`,
        raw_response: {
          order,
          razorpay_payment_id: paymentId,
        },
      }).eq("txnid", orderId).in("status", ["created", "failed"]);

      return jsonResponse({
        success: true,
        status: "paid",
        isPremium: true,
        planType: PLAN_TYPE,
        amount_inr: PAYABLE_AMOUNT_INR,
      });
    }

    if (action === "redeem_coupon") {
      const admin = supabaseAdmin();
      const ids = await linkedIds(admin, authUser.uid);
      if (await hasPremium(admin, ids)) return jsonResponse({ success: true, status: "paid", isPremium: true, alreadyPremium: true });

      // Throttle guessing in one locked database step (see migration 20261103000300). Requests that are
      // already blocked are not counted, so they cannot use up the shared allowance. Errors fail closed.
      const tryLater = () => jsonResponse({ error: "Could not process that right now. Please try again shortly." }, 503);
      const gate = await admin.rpc("coupon_attempt", {
        p_user: authUser.uid,
        p_user_max: COUPON_MAX_ATTEMPTS_PER_USER_PER_HOUR,
        p_global_max: COUPON_MAX_ATTEMPTS_ALL_USERS_PER_HOUR,
      });
      if (gate.error || typeof gate.data !== "string") return tryLater();
      if (gate.data === "user_limited") return jsonResponse({ error: "Too many attempts. Try again in an hour." }, 429);
      if (gate.data === "global_limited") return jsonResponse({ error: "Coupons are busy right now. Please try again later." }, 429);
      if (gate.data !== "ok") return tryLater();

      const code = normalizeCoupon(body.code);
      const id = code ? await matchCoupon(code) : null;
      if (!id) return jsonResponse({ error: "That code is not valid." }, 400);

      // A leaked code must not grant unlimited free accounts. Reserve one redemption atomically BEFORE granting.
      // One redemption per person: a repeat request gets status "already" and takes no new slot.
      const slot = await admin.rpc("coupon_reserve", { p_coupon: id, p_user: authUser.uid, p_max: COUPON_MAX_REDEMPTIONS_PER_CODE });
      const status = slot.data && typeof slot.data === "object" ? (slot.data as { status?: string }).status : undefined;
      if (slot.error || !status) return tryLater();
      if (status === "full") return jsonResponse({ error: "That code has reached its limit." }, 400);
      // "already" never grants. Someone who holds a redemption (finished, in progress in another request,
      // or kept after a revocation) must not be able to claim premium again with any code.
      if (status === "already") return jsonResponse({ error: "This account has already used a code." }, 409);
      if (status !== "reserved") return tryLater();
      // The slot THIS request just took: the only row it may release if the grant fails.
      const reservedId = Number((slot.data as { id: number }).id);

      const email = normalizeText(body.email) || authUser.email;
      const username = buildUsername(email, normalizeText(body.username) || authUser.name);
      try {
        await updatePremiumProfile({
          uid: authUser.uid, email, username,
          orderId: `coupon_${id}`, paymentId: `coupon_${id}`, amountInr: 0,
        });
      } catch (grantError) {
        // Give back exactly the slot this request took, so a failed grant does not use up the code.
        // A failed release only makes the cap stricter, never looser, so it is logged and not retried here.
        const released = await admin.from("payment_events").delete().eq("id", reservedId);
        if (released.error) console.error("[lifetime-premium] could not release coupon slot", reservedId, released.error);
        throw grantError;
      }
      await syncProfile(token, {
        userId: authUser.uid, email, username, isPremium: true, planType: PLAN_TYPE,
        premiumAmount: 0, premiumListPrice: LIST_PRICE_INR, premiumDiscount: LIST_PRICE_INR,
        premiumOrderId: `coupon_${id}`, premiumPaymentId: `coupon_${id}`,
      });
      return jsonResponse({ success: true, status: "paid", isPremium: true, planType: PLAN_TYPE });
    }

    throw new Error("Unsupported action");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Premium payment failed";
    console.error("[lifetime-premium]", error);
    return jsonResponse({ error: message }, 400);
  }
});
