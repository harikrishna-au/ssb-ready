"use client";

import { useUser } from "@clerk/nextjs";
import { useEffect } from "react";
import { api } from "./api";
import { HISTORY_TESTS, useStore, type Attempt, type History } from "./store";

export { HISTORY_TESTS };
export type { Attempt, HistoryTest } from "./store";

export const attemptDate = (v: Attempt["completedAt"]) =>
  v ? new Date(typeof v === "string" ? v : v._seconds * 1000) : null;

let inflight: Promise<void> | null = null;

async function load(userId: string) {
  if (inflight) return inflight;
  const { setHistory, history } = useStore.getState();
  setHistory({ data: history.data, status: "loading" });
  inflight = Promise.all(
    HISTORY_TESTS.map((t) =>
      api.get<{ data: Attempt[] }>(`/api/firestore/${t}/history/${userId}`).then((r) => [t, r.data ?? []] as const),
    ),
  )
    .then((entries) => useStore.getState().setHistory({ data: Object.fromEntries(entries) as History, status: "ready" }))
    .catch(() => useStore.getState().setHistory({ data: useStore.getState().history.data, status: "error" }))
    .finally(() => { inflight = null; });
  return inflight;
}

/** One shared copy of history. Loads once, refreshes after any test result is saved. */
export function useHistory() {
  const { user } = useUser();
  const { history, historyStale } = useStore();

  useEffect(() => {
    if (!user) return;
    if (history.status === "idle" || historyStale) void load(user.id);
  }, [user, history.status, historyStale]);

  return {
    data: history.data,
    failed: history.status === "error" && !history.data,
    loading: !history.data && history.status !== "error",
    refresh: () => user && load(user.id),
  };
}

/** Consecutive days, ending today or yesterday, with at least one attempt. */
export function streakDays(all: Attempt[]): number {
  const days = new Set(all.map((a) => attemptDate(a.completedAt)?.toDateString()).filter(Boolean));
  let n = 0;
  const d = new Date();
  if (!days.has(d.toDateString())) d.setDate(d.getDate() - 1);
  while (days.has(d.toDateString())) { n++; d.setDate(d.getDate() - 1); }
  return n;
}
