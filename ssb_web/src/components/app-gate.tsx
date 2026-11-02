"use client";

import { PageLoader } from "@/components/loader";
import { useUser } from "@clerk/nextjs";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useStore } from "@/lib/store";

const OPEN = ["/onboarding", "/profile"];

/** Holds the page back until user state is ready, and sends new users through onboarding once. */
export function AppGate({ children }: { children: React.ReactNode }) {
  const { user, isLoaded } = useUser();
  const path = usePathname();
  const router = useRouter();
  const hydrated = useStore((s) => !!user && s.userId === user.id);
  const exam = useStore((s) => s.prefs.exam);
  const needsOnboarding = hydrated && !exam && !OPEN.some((p) => path.startsWith(p));

  useEffect(() => {
    if (needsOnboarding) router.replace("/onboarding");
  }, [needsOnboarding, router]);

  const waiting = !isLoaded || (!!user && !hydrated) || needsOnboarding;

  // The page is always rendered, just hidden until ready, so there is never a blank frame
  // and Next can validate the route. The skeleton shows in its place.
  return (
    <>
      {waiting && <PageLoader label="Getting things ready…" />}
      <div hidden={waiting}>{children}</div>
    </>
  );
}
