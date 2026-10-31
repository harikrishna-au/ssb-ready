import { Suspense } from "react";
import { AppGate } from "@/components/app-gate";
import { BottomNav, Sidebar, TopBar } from "@/components/app-nav";

/** The signed-in frame: sidebar, top bar with breadcrumbs, bottom nav on phones. */
export function AppShell({ children, gate = true }: { children: React.ReactNode; gate?: boolean }) {
  return (
    <div className="flex flex-1">
      <Suspense><Sidebar /></Suspense>
      <div className="flex min-w-0 flex-1 flex-col">
        <Suspense><TopBar /></Suspense>
        <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 pb-28 md:px-8 md:py-10 md:pb-12">
          {gate ? <Suspense fallback={null}><AppGate>{children}</AppGate></Suspense> : children}
        </main>
      </div>
      <Suspense><BottomNav /></Suspense>
    </div>
  );
}
