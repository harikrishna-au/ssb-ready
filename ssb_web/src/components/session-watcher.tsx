"use client";

import { useUser } from "@clerk/nextjs";
import { useEffect } from "react";
import type { Prefs, Tracked } from "@/lib/store";
import { useStore } from "@/lib/store";

/**
 * The single place where the signed-in Clerk user is copied into app state.
 * Signing in hydrates it; signing out (or switching accounts) wipes it, so one person's
 * data can never show up for the next person on the same browser.
 */
export function SessionWatcher() {
  const { user, isLoaded } = useUser();
  const userId = user?.id ?? null;
  const meta = user?.unsafeMetadata;

  useEffect(() => {
    if (!isLoaded) return;
    const { hydrate, reset, userId: current } = useStore.getState();
    if (!userId) {
      if (current) reset();
      return;
    }
    hydrate(userId, {
      prefs: { exam: meta?.exam as string | undefined, stage: meta?.stage as string | undefined } as Prefs,
      apps: (meta?.apps as Record<string, Tracked> | undefined) ?? {},
    });
    // Metadata is only read on first hydrate for this user, on purpose.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, userId]);

  return null;
}
