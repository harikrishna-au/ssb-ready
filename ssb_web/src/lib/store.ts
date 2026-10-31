"use client";

import { create } from "zustand";

export type StatusId = "saved" | "applied" | "admit_card" | "exam_done" | "result" | "ssb_call" | "final";
export type Tracked = { status: StatusId; note?: string; updatedAt: string };
export type Prefs = { exam?: string; stage?: string };

export type Attempt = {
  id?: string;
  score?: number;
  totalQuestions?: number;
  aiFeedback?: string;
  /** WAT and SRT keep the full AI evaluation; PPDT and TAT keep a flat list. Older attempts have neither. */
  evaluation?: { identified_olqs?: string[] };
  identifiedOlqs?: string[];
  completedAt?: string | { _seconds: number };
};
export const HISTORY_TESTS = ["ppdt", "tat", "wat", "srt", "oir"] as const;
export type HistoryTest = (typeof HISTORY_TESTS)[number];
export type History = Record<HistoryTest, Attempt[]>;

export type PiqRecord = Record<string, string>;

type Loadable<T> = { data: T | null; status: "idle" | "loading" | "ready" | "error" };

type Store = {
  /** Which Clerk user the cached data belongs to. Everything resets when this changes. */
  userId: string | null;
  prefs: Prefs;
  apps: Record<string, Tracked>;
  history: Loadable<History>;
  historyStale: boolean;
  piq: Loadable<PiqRecord>;

  hydrate: (userId: string, meta: { prefs?: Prefs; apps?: Record<string, Tracked> }) => void;
  reset: () => void;
  setPrefs: (p: Prefs) => void;
  setApps: (updater: (cur: Record<string, Tracked>) => Record<string, Tracked>) => void;
  setHistory: (h: Loadable<History>) => void;
  invalidateHistory: () => void;
  setPiq: (p: Loadable<PiqRecord>) => void;
};

const empty = { userId: null, prefs: {}, apps: {}, history: { data: null, status: "idle" } as Loadable<History>, historyStale: false, piq: { data: null, status: "idle" } as Loadable<PiqRecord> };

export const useStore = create<Store>((set) => ({
  ...empty,
  hydrate: (userId, meta) =>
    set((s) =>
      s.userId === userId
        ? s // already hydrated for this user: never clobber optimistic local changes
        : { ...empty, userId, prefs: meta.prefs ?? {}, apps: meta.apps ?? {} },
    ),
  reset: () => set({ ...empty }),
  setPrefs: (p) => set((s) => ({ prefs: { ...s.prefs, ...p } })),
  setApps: (updater) => set((s) => ({ apps: updater(s.apps) })),
  setHistory: (history) => set({ history, historyStale: false }),
  invalidateHistory: () => set({ historyStale: true }),
  setPiq: (piq) => set({ piq }),
}));
