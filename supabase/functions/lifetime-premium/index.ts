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

const firebaseJwks = createRemoteJWKSet(
  new URL("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"),
);

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

async function verifyFirebaseToken(token: string) {
  const projectId = requireEnv("FIREBASE_PROJECT_ID");
  const { payload } = await jwtVerify(token, firebaseJwks, {
    issuer: `https://securetoken.google.com/${projectId}`,
    audience: projectId,
  });

  const uid = normalizeText(payload.sub) || normalizeText(payload.user_id);
  if (!uid) throw new Error("Firebase token did not include a user id");

  return {
    uid,
    email: normalizeText(payload.email),
    name: normalizeText(payload.name),
  };
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
        amount_inr: PAYABLE_AMOUNT_INR,
      },
      { onConflict: "user_id" },
    );
  if (premiumError) throw premiumError;
}

async function syncFirestoreProfile(token: string, payload: Record<string, unknown>) {
  const backendUrl = normalizeText(Deno.env.get("BACKEND_URL"));
  if (!backendUrl) return;

  const res = await fetch(`${backendUrl.replace(/\/$/, "")}/api/firestore/user/profile`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(`Firestore premium sync failed: ${await res.text()}`);
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

    const authUser = await verifyFirebaseToken(token);
    const body = await req.json();
    const action = normalizeText(body.action);

    if (action === "create_order") {
      const email = normalizeText(body.email) || authUser.email;
      const username = buildUsername(email, normalizeText(body.username) || authUser.name);
      const order = await createRazorpayOrder({
        uid: authUser.uid,
        email,
        username,
      });

      const admin = supabaseAdmin();
      await admin.from("payment_transactions").insert({
        user_id: authUser.uid,
        txnid: order.id,
        amount: PAYABLE_AMOUNT_INR,
        status: "order_created",
        provider_reference_id: order.id,
        raw_response: order,
      });

      return jsonResponse({
        success: true,
        key_id: requireEnv("RAZORPAY_KEY_ID"),
        order_id: order.id,
        amount_paise: PAYABLE_AMOUNT_PAISE,
        amount_inr: PAYABLE_AMOUNT_INR,
        list_price_inr: LIST_PRICE_INR,
        discount_inr: DISCOUNT_INR,
        currency: "INR",
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

      const order = await fetchRazorpayOrder(orderId);
      const notes = order.notes ?? {};
      const noteUid = normalizeText(notes.uid);
      if (noteUid && noteUid !== authUser.uid) {
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

      await syncFirestoreProfile(token, {
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
      await admin.from("payment_transactions").update({
        status: "premium_activated",
        provider_reference_id: paymentId,
        raw_response: {
          order,
          razorpay_payment_id: paymentId,
        },
      }).eq("txnid", orderId);

      return jsonResponse({
        success: true,
        isPremium: true,
        planType: PLAN_TYPE,
        amount_inr: PAYABLE_AMOUNT_INR,
      });
    }

    throw new Error("Unsupported action");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Premium payment failed";
    console.error("[lifetime-premium]", error);
    return jsonResponse({ error: message }, 400);
  }
});
