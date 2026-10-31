import { Show } from "@clerk/nextjs";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AppShell } from "@/components/app-shell";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { ExamData } from "@/components/radar/radar-data";
import { SiteFooter, SiteHeader } from "@/components/site/header";
import { EXAM_PAGES, type ExamSlug } from "@/data/radar";

const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export function generateStaticParams() {
  return Object.keys(EXAM_PAGES).map((exam) => ({ exam }));
}

export async function generateMetadata({ params }: { params: Promise<{ exam: string }> }): Promise<Metadata> {
  const { exam } = await params;
  const e = EXAM_PAGES[exam as ExamSlug];
  if (!e) return {};
  return {
    title: `${e.name} dates: last date, exam date and official link`,
    description: `${e.name} notification dates with the last date to apply, exam date and the official link. Each entry shows where it was checked and when.`,
    alternates: { canonical: `/radar/${exam}` },
  };
}

function Body({ slug }: { slug: ExamSlug }) {
  const e = EXAM_PAGES[slug];
  const ld = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: `${e.name} dates on ReadyKadet Radar`,
    url: `${site}/radar/${slug}`,
    description: e.blurb,
    about: { "@type": "Thing", name: e.name },
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld).replace(/</g, "\\u003c") }} />
      <h1 className="text-5xl font-black uppercase leading-none sm:text-6xl">{e.name} dates</h1>
      <p className="mt-4 max-w-2xl text-lg text-muted-foreground">{e.blurb}</p>
      <div className="mt-10">
        <Suspense fallback={<p className="text-muted-foreground">Loading notifications…</p>}>
          <ExamData exam={e.exam} />
        </Suspense>
      </div>
      <p className="mt-10 max-w-2xl text-sm text-muted-foreground">
        ReadyKadet summarises official notices and does not take applications. Tentative or expected dates can change. Always confirm on the official site before you apply.
      </p>
    </>
  );
}

async function Page({ params }: { params: Promise<{ exam: string }> }) {
  const { exam } = await params;
  if (!(exam in EXAM_PAGES)) notFound();
  const slug = exam as ExamSlug;
  const crumbs = [{ label: "Home", href: "/" }, { label: "Radar", href: "/radar" }, { label: EXAM_PAGES[slug].name }];
  return (
    <>
      <Show when="signed-in"><AppShell gate={false}><Body slug={slug} /></AppShell></Show>
      <Show when="signed-out">
        <SiteHeader />
        <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-14">
          <Breadcrumbs items={crumbs} className="mb-6" />
          <Body slug={slug} />
        </main>
        <SiteFooter />
      </Show>
    </>
  );
}

export default function ExamRadarPage(props: { params: Promise<{ exam: string }> }) {
  return (
    <Suspense fallback={null}>
      <Page {...props} />
    </Suspense>
  );
}
