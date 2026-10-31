import { NextResponse } from "next/server";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Newsletter signup stub.
 * - Validates the address and ignores bots that fill the hidden `company` field.
 * - If NEWSLETTER_WEBHOOK_URL is set, forwards { email, source } there (any form backend or automation).
 * - If it is not set, returns 503 so the UI says signups are not open yet. It never pretends to have saved an address.
 * Agent 4's reminder system can replace the webhook call with a direct write.
 */
export async function POST(req: Request) {
  let body: { email?: unknown; source?: unknown; company?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  if (typeof body.company === "string" && body.company.length > 0) return NextResponse.json({ ok: true }); // honeypot
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!EMAIL.test(email) || email.length > 254) return NextResponse.json({ error: "invalid_email" }, { status: 400 });

  const hook = process.env.NEWSLETTER_WEBHOOK_URL;
  if (!hook) return NextResponse.json({ error: "not_configured" }, { status: 503 });
  try {
    const r = await fetch(hook, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, source: typeof body.source === "string" ? body.source.slice(0, 60) : "site" }),
    });
    if (!r.ok) return NextResponse.json({ error: "upstream_failed" }, { status: 502 });
  } catch {
    return NextResponse.json({ error: "upstream_failed" }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}
