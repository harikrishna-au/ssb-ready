import type { Metadata } from "next";
import { Suspense } from "react";
import { PageLoader } from "@/components/loader";
import { ApplicationsData } from "@/components/radar/radar-data";

export const metadata: Metadata = { title: "My applications" };

export default function ApplicationsPage() {
  return (
    <Suspense fallback={<PageLoader label="Loading your applications…" />}>
      <ApplicationsData />
    </Suspense>
  );
}
