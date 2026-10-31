"use client";

import { useUser } from "@clerk/nextjs";
import { useStore, type StatusId, type Tracked } from "./store";

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

/** Writes go out one at a time, each carrying the latest state, so quick edits never overwrite each other. */
let queue: Promise<unknown> = Promise.resolve();

/**
 * Application tracker, kept on the Clerk user so it follows the aspirant across devices.
 * Changes show instantly and are saved in the background; Clerk caps this metadata at 8 KB.
 */
export function useTracker() {
  const { user, isLoaded } = useUser();
  const apps = useStore((s) => s.apps);
  const { setApps } = useStore.getState();

  const save = (update: (cur: Record<string, Tracked>) => Record<string, Tracked>) => {
    if (!user) return Promise.reject(new Error("Not signed in"));
    const before = useStore.getState().apps;
    setApps(update);
    queue = queue.then(() =>
      user.update({ unsafeMetadata: { ...user.unsafeMetadata, apps: useStore.getState().apps } }),
    );
    return (queue as Promise<unknown>).then(() => undefined).catch((e) => {
      setApps(() => before); // roll back so the screen never shows something that was not saved
      throw e;
    });
  };
  const now = () => new Date().toISOString();

  return {
    ready: isLoaded,
    signedIn: !!user,
    apps,
    track: (id: string) => save((c) => ({ ...c, [id]: { status: "saved", updatedAt: now() } })),
    setStatus: (id: string, status: StatusId) => save((c) => ({ ...c, [id]: { ...c[id], status, updatedAt: now() } })),
    setNote: (id: string, note: string) => save((c) => ({ ...c, [id]: { ...c[id], note, updatedAt: now() } })),
    untrack: (id: string) =>
      save((c) => {
        const rest = { ...c };
        delete rest[id];
        return rest;
      }),
  };
}
