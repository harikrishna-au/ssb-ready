"use client";

import { useUser } from "@clerk/nextjs";
import { useEffect } from "react";
import { create } from "zustand";
import { api } from "./api";

/** Mirror of GET /api/me. The server is the only source of truth; nothing here is ever sent back as a claim. */
export type Me = { userId: string; premium: boolean; plan: string | null; premiumSince: string | null; piqComplete: boolean };

type Slice = {
  /** Which Clerk user `me` belongs to, so a different login never sees someone else's state. */
  userId: string | null;
  status: "idle" | "loading" | "ready" | "error";
  me: Me | null;
  set: (p: Partial<Pick<Slice, "userId" | "status" | "me">>) => void;
};

const usePremiumStore = create<Slice>((set) => ({ userId: null, status: "idle", me: null, set: (p) => set(p) }));

let inflight: Promise<void> | null = null;

/** Asks the server who this is. The premium answer comes only from the server. */
const fetchMe = () => api.get<Me>("/api/me");

async function load(userId: string) {
  if (inflight) return inflight;
  const s = usePremiumStore.getState();
  // Keep showing the last known answer while refreshing the same user's data.
  usePremiumStore.setState({ userId, status: "loading", me: s.userId === userId ? s.me : null });
  inflight = fetchMe()
    .then((me) => usePremiumStore.setState({ userId, status: "ready", me }))
    .catch(() => usePremiumStore.setState({ status: "error" }))
    .finally(() => { inflight = null; });
  return inflight;
}

/** Whether the signed-in user has Lifetime access. Fetched once per login and shared by every consumer. */
export function usePremium() {
  const { user, isLoaded } = useUser();
  const slice = usePremiumStore();
  const id = user?.id ?? null;

  useEffect(() => {
    if (!isLoaded || !id) return;
    const s = usePremiumStore.getState();
    if (s.userId !== id || s.status === "idle") void load(id);
  }, [isLoaded, id]);

  const mine = slice.userId === id ? slice.me : null;
  return {
    /** False until the server has said otherwise: never assume premium. */
    premium: mine?.premium === true,
    plan: mine?.plan ?? null,
    premiumSince: mine?.premiumSince ?? null,
    piqComplete: mine?.piqComplete ?? false,
    /** True until the first answer arrives, so callers can avoid flashing an upsell at a paying user. */
    loading: !isLoaded || (!!id && (slice.userId !== id || slice.status === "idle" || (slice.status === "loading" && !mine))),
    failed: slice.status === "error" && !mine,
    refresh: async () => { if (id) await load(id); },
  };
}
