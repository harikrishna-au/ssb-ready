"use client";

import { useState } from "react";

/**
 * Referral link scaffold. It only builds a share link carrying a ?ref= code.
 * No rewards exist and nothing is tracked yet: the human has to define the programme
 * and a backend must read `ref` on sign-up before this means anything.
 */
export function InviteLink() {
  const [copied, setCopied] = useState(false);
  const [link, setLink] = useState("");

  function build() {
    const url = new URL("/sign-up", window.location.origin);
    url.searchParams.set("ref", "friend");
    return url.toString();
  }
  async function copy() {
    const l = build();
    setLink(l);
    try {
      await navigator.clipboard.writeText(l);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }
  return (
    <div className="space-y-3">
      <button onClick={copy} className="min-h-11 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground">{copied ? "Link copied" : "Copy invite link"}</button>
      <p role="status" className="min-h-5 break-all text-sm text-muted-foreground">{link}</p>
    </div>
  );
}
