"use client";

import { useUser } from "@clerk/nextjs";
import { useEffect } from "react";
import { create } from "zustand";
import { api } from "./api";
import type { StatusId, Tracked } from "./store";

export const STATUSES = [
  { id: "saved", label: "Saved" },
  { id: "applied", label: "Applied" },
  { id: "admit_card", label: "Admit card received" },
  { id: "exam_done", label: "Written exam done" },
  { id: "result", label: "Result out" },
  { id: "ssb_call", label: "SSB call received" },
  { id: "final", label: "Final result" },
] as const satisfies readonly { id: StatusId; label: string }[];
export type { StatusId } from "./store";

type TrackerState = {
  userId: string | null;
  phase: "idle" | "loading" | "ready" | "error";
  apps: Record<string, Tracked>;
};
const useTrackerState = create<TrackerState>(() => ({ userId: null, phase: "idle", apps: {} }));
const set = useTrackerState.setState;

type ServerEntry = { status: StatusId; note?: string; updatedAt: string };
type TrackerResponse = { apps: Record<string, ServerEntry>; migrated: boolean };

/** Writes go out one at a time, in order, so quick edits never overtake each other. */
let queue: Promise<unknown> = Promise.resolve();
let loading: Promise<void> | null = null;

/**
 * Loads the tracker from the server. First time for an account, anything saved in the old
 * Clerk-metadata tracker is sent over once (the server ignores a second import).
 */
async function load(userId: string, legacy: unknown) {
  set({ userId, phase: "loading", apps: {} });
  try {
    let res = await api.get<TrackerResponse>("/api/radar/tracker");
    const old = legacy && typeof legacy === "object" ? (legacy as Record<string, Tracked>) : {};
    if (!res.migrated) {
      if (Object.keys(old).length) await api.post("/api/radar/tracker/import", { apps: old });
      else await api.post("/api/radar/tracker/import", { apps: {} }); // marks "nothing to migrate" so we stop asking
      res = await api.get<TrackerResponse>("/api/radar/tracker");
    }
    if (useTrackerState.getState().userId === userId) set({ phase: "ready", apps: res.apps });
  } catch {
    if (useTrackerState.getState().userId === userId) set({ phase: "error" });
  }
}

/**
 * Application tracker, stored on the server so reminders can use it.
 * Changes show instantly and are saved in the background; a failed save rolls back just that entry.
 */
export function useTracker() {
  const { user, isLoaded } = useUser();
  const { apps, phase } = useTrackerState();
  const userId = user?.id ?? null;
  const legacy = user?.unsafeMetadata?.apps;

  useEffect(() => {
    if (!isLoaded) return;
    const cur = useTrackerState.getState();
    if (!userId) {
      if (cur.userId) set({ userId: null, phase: "idle", apps: {} });
      return;
    }
    if (cur.userId !== userId) loading = load(userId, legacy);
    // Legacy metadata is only read when this account first loads.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, userId]);

  const retry = () => { if (userId) loading = load(userId, legacy); return loading; };

  const save = (id: string, next: Tracked | null, send: () => Promise<unknown>) => {
    if (!userId) return Promise.reject(new Error("Not signed in"));
    const before = useTrackerState.getState().apps[id];
    set((s) => {
      const apps = { ...s.apps };
      if (next) apps[id] = next; else delete apps[id];
      return { apps };
    });
    const run = queue.then(() => loading).then(send);
    queue = run.catch(() => undefined);
    return run.then(() => undefined).catch((e) => {
      set((s) => {
        const apps = { ...s.apps };
        if (before) apps[id] = before; else delete apps[id];
        return { apps };
      });
      throw e;
    });
  };
  const now = () => new Date().toISOString();
  const cur = (id: string) => useTrackerState.getState().apps[id];

  return {
    ready: isLoaded && (!userId || phase === "ready" || phase === "error"),
    loadFailed: phase === "error",
    retry,
    signedIn: !!userId,
    apps,
    track: (id: string) => save(id, { status: "saved", updatedAt: now() }, () => api.put(`/api/radar/tracker/${id}`, {})),
    setStatus: (id: string, status: StatusId) => save(id, { ...cur(id), status, updatedAt: now() }, () => api.put(`/api/radar/tracker/${id}`, { status })),
    setNote: (id: string, note: string) => save(id, { ...cur(id), note, updatedAt: now() }, () => api.put(`/api/radar/tracker/${id}`, { note })),
    untrack: (id: string) => save(id, null, () => api.del(`/api/radar/tracker/${id}`)),
  };
}
