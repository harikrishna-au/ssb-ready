"use client";

import { useEffect, useState } from "react";
import { api } from "./api";

export type Mode = "quick" | "full";

/**
 * Premium flag from Agent 1's GET /api/me ({ premium }). Until that endpoint exists the call fails
 * and this resolves to false, which is the safe default (quick mode).
 * `null` while loading.
 */
export function usePremium() {
  const [premium, setPremium] = useState<boolean | null>(null);
  useEffect(() => {
    let live = true;
    api.get<{ premium?: boolean }>("/api/me")
      .then((r) => live && setPremium(!!r.premium))
      .catch(() => live && setPremium(false));
    return () => { live = false; };
  }, []);
  return premium;
}

/** Full test is the default for premium accounts; anyone can switch. */
export function useMode(): [Mode, (m: Mode) => void, boolean | null] {
  const premium = usePremium();
  const [picked, setPicked] = useState<Mode | null>(null);
  return [picked ?? (premium ? "full" : "quick"), setPicked, premium];
}
