import type { Metadata } from "next";
import { Suspense } from "react";
import { DashboardView } from "@/components/dashboard/dashboard-view";
import { DashboardRadar } from "@/components/radar/dashboard-radar";
import { Loader } from "@/components/loader";

export const metadata: Metadata = { title: "Home" };

export default function DashboardPage() {
  return (
    <DashboardView
      radar={
        <Suspense fallback={<div className="grid min-h-40 place-items-center rounded-3xl border border-white/[0.08]"><Loader size={40} /></div>}>
          <DashboardRadar />
        </Suspense>
      }
    />
  );
}
