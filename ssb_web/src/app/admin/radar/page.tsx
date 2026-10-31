import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminRadar } from "@/components/radar/admin/admin-radar";
import { requireAdmin } from "@/lib/admin";

export const metadata: Metadata = { title: "Radar admin", robots: { index: false, follow: false } };

async function Gate() {
  await requireAdmin();
  return <AdminRadar />;
}

export default function AdminRadarPage() {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-10">
      <Suspense fallback={<p className="text-muted-foreground">Checking access…</p>}>
        <Gate />
      </Suspense>
    </main>
  );
}
