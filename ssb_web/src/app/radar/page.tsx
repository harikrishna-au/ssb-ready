import { Show } from "@clerk/nextjs";
import type { Metadata } from "next";
import { Suspense } from "react";
import { AppShell } from "@/components/app-shell";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { RadarFull } from "@/components/radar/radar-data";
import { SiteFooter, SiteHeader } from "@/components/site/header";

export const metadata: Metadata = {
  title: "Radar: defence recruitment dates",
  description: "Open and upcoming NDA, CDS and AFCAT notifications with last dates, exam dates and official apply links. Track your applications in one place.",
  alternates: { canonical: "/radar" },
};

function Body({ large }: { large?: boolean }) {
  return (
    <>
      <h1 className={`font-black uppercase leading-none ${large ? "text-5xl sm:text-6xl lg:text-7xl" : "text-5xl sm:text-6xl"}`}>Radar</h1>
      <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
        Every defence officer recruitment notification we are watching, with last dates and a one-click link to the official site. Track the ones you apply to and see all your deadlines together.
      </p>
      <div className="mt-10">
        <Suspense fallback={<p className="text-muted-foreground">Loading notifications…</p>}>
          <RadarFull />
        </Suspense>
      </div>
      <p className="mt-10 max-w-2xl text-sm text-muted-foreground">
        ReadyKadet summarises official calendars and notifications and does not accept applications. Dates marked tentative or expected can change. Always confirm on the official site before you apply.
      </p>
    </>
  );
}

function Public() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-14">
        <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Radar" }]} className="mb-6" />
        <Body large />
      </main>
      <SiteFooter />
    </>
  );
}

/** Same page, two frames: inside the app for signed-in users, public for everyone else. */
export default function RadarPage() {
  return (
    <Suspense fallback={<Public />}>
      <Show when="signed-in">
        <AppShell gate={false}><Body /></AppShell>
      </Show>
      <Show when="signed-out"><Public /></Show>
    </Suspense>
  );
}
