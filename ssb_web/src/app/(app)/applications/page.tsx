import type { Metadata } from "next";
import { Suspense } from "react";
import { ApplicationsData } from "@/components/radar/radar-data";

export const metadata: Metadata = { title: "My applications" };

export default function ApplicationsPage() {
  return (
    <Suspense fallback={<p className="text-muted-foreground">Loading your applications…</p>}>
      <ApplicationsData />
    </Suspense>
  );
}
