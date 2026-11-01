"use client";

import { useUser } from "@clerk/nextjs";
import { useEffect } from "react";
import { api } from "./api";
import { completeness, type PiqValues } from "./piq";
import { useStore } from "./store";

let inflight: Promise<void> | null = null;

async function load(userId: string) {
  if (inflight) return inflight;
  useStore.getState().setPiq({ data: useStore.getState().piq.data, status: "loading" });
  inflight = api
    .get<{ data: PiqValues | null }>(`/api/data/piq/${userId}`)
    .then((r) => useStore.getState().setPiq({ data: r.data ?? {}, status: "ready" }))
    .catch(() => useStore.getState().setPiq({ data: useStore.getState().piq.data, status: "error" }))
    .finally(() => { inflight = null; });
  return inflight;
}

/** The signed-in user's PIQ: loaded once, shared by the form, payment gate, sidebar and interview. */
export function usePiq() {
  const { user } = useUser();
  const piq = useStore((s) => s.piq);

  useEffect(() => {
    if (user && piq.status === "idle") void load(user.id);
  }, [user, piq.status]);

  const values = piq.data ?? {};
  const status = completeness(values);

  return {
    values,
    ready: piq.status === "ready",
    loading: piq.status === "idle" || piq.status === "loading",
    failed: piq.status === "error",
    completeness: status,
    reload: () => user && load(user.id),
    /** Saves the whole record. Marks it complete only when every required field is valid. */
    save: async (next: PiqValues) => {
      if (!user) throw new Error("Not signed in");
      const done = completeness(next).complete;
      await api.post("/api/data/piq", {
        ...next,
        userId: user.id,
        piqVersion: 2,
        piqComplete: done,
        piqUpdatedAt: new Date().toISOString(),
      });
      useStore.getState().setPiq({ data: next, status: "ready" });
      return done;
    },
  };
}
