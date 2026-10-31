import { Show } from "@clerk/nextjs";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AppShell } from "@/components/app-shell";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { RadarFull } from "@/components/radar/radar-data";
import { SiteFooter, SiteHeader } from "@/components/site/header";

export const metadata: Metadata = {
  title: "Radar: defence recruitment dates",
  description: "Open and upcoming defence officer notifications (NDA, CDS, AFCAT, Army, Navy, Air Force, CAPF) with last dates, exam dates and official apply links. Track your applications in one place.",
  alternates: { canonical: "/radar" },
};

function Body({ large }: { large?: boolean }) {
  return (
    <>
      <h1 className={`font-black uppercase leading-none ${large ? "text-5xl sm:text-6xl lg:text-7xl" : "text-5xl sm:text-6xl"}`}>Radar</h1>
      <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
        Defence officer recruitment notifications we have checked against official sources, with last dates and a link to the official site. Exam pages: <Link className="underline" href="/radar/nda">NDA</Link>, <Link className="underline" href="/radar/cds">CDS</Link>, <Link className="underline" href="/radar/afcat">AFCAT</Link>. Feeds: <a className="underline" href={`${process.env.NEXT_PUBLIC_BACKEND_URL ?? ""}/api/radar/feed.xml`}>RSS</a>, <a className="underline" href={`${process.env.NEXT_PUBLIC_BACKEND_URL ?? ""}/api/radar/feed.json`}>JSON</a>. Track the ones you apply to and see all your deadlines together.
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
