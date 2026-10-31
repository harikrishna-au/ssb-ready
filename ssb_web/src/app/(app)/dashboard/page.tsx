import type { Metadata } from "next";
import { Suspense } from "react";
import { DashboardView } from "@/components/dashboard/dashboard-view";
import { DashboardRadar } from "@/components/radar/dashboard-radar";

export const metadata: Metadata = { title: "Home" };

export default function DashboardPage() {
  return (
    <DashboardView
      radar={
        <Suspense fallback={<div className="min-h-40 animate-pulse rounded-3xl bg-white/5" aria-hidden />}>
          <DashboardRadar />
        </Suspense>
      }
    />
  );
}
