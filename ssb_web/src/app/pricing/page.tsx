import type { Metadata } from "next";
import Link from "next/link";
import { Check, Minus } from "lucide-react";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { SiteFooter, SiteHeader } from "@/components/site/header";
import { LEGAL } from "@/lib/legal";
import { abs, SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: "Pricing: ₹199 a month, or ₹1,200 for the year",
  description: `A free trial of the tests. Paid access is ${LEGAL.monthlyPrice} per month, ${LEGAL.threeMonthPrice} for three months, or ${LEGAL.yearPrice} for the year, and includes AI feedback, the mock interview, and the full picture bank.`,
  alternates: { canonical: "/pricing" },
  openGraph: { type: "website", url: "/pricing", title: "ReadyKadet pricing", description: `${LEGAL.monthlyPrice} per month, ${LEGAL.threeMonthPrice} for three months, or ${LEGAL.yearPrice} for the year.` },
};

const ROWS: { feature: string; free: boolean | string; paid: boolean | string }[] = [
  { feature: "OIR, PPDT, TAT, WAT, SRT and SDT timed tests", free: "A short trial", paid: "Full tests" },
  { feature: "AI feedback on every written attempt", free: false, paid: true },
  { feature: "Mock interview with the interviewing officer", free: false, paid: true },
  { feature: "Lecturette practice and interview guide", free: true, paid: true },
  { feature: "Attempt history and OLQ profile", free: "Trial", paid: true },
  { feature: "Pictures for PPDT and TAT", free: "5", paid: "Full 45-picture bank" },
  { feature: "Radar: open entries and your application tracker", free: true, paid: true },
];

const FAQ = [
  { q: "How much does it cost?", a: `${LEGAL.monthlyPrice} per person per month, ${LEGAL.threeMonthPrice} for three months, or ${LEGAL.yearPrice} for the year. The three-month plan is about ₹166 a month. The year is ₹100 a month.` },
  { q: "What does paying include?", a: "AI feedback on written attempts, the mock interview, and the full 45-picture bank for PPDT and TAT. All three paid plans include the same access. The year plan is one payment that covers twelve months." },
  { q: "What is free?", a: "A short trial of the tests, the lecturette practice and interview guide, Radar, and five pictures. AI feedback and the mock interview are on the paid plans." },
  { q: "Can I get a refund?", a: `Refund terms are on the refund policy page. Write to ${LEGAL.supportEmail} with the email you signed up with.` },
  { q: "Will the price change?", a: "We cannot promise a price for the future. The price you see here is the price you pay today." },
  { q: "Does paying improve my chances at the board?", a: "No tool can promise that. The paid plans give you more practice and a score on how you write. That score is a practice signal, not a prediction of the board's decision." },
];

const jsonLd = [
  {
    "@context": "https://schema.org", "@type": "SoftwareApplication",
    name: SITE_NAME, applicationCategory: "EducationalApplication", operatingSystem: "Web",
    url: abs("/"),
    offers: [
      { "@type": "Offer", name: "Free", price: "0", priceCurrency: "INR", url: abs("/sign-up") },
      { "@type": "Offer", name: "Monthly", price: LEGAL.monthlyPrice.replace(/[^\d.]/g, ""), priceCurrency: "INR", url: abs("/pricing") },
      { "@type": "Offer", name: "3 months", price: LEGAL.threeMonthPrice.replace(/[^\d.]/g, ""), priceCurrency: "INR", url: abs("/pricing") },
      { "@type": "Offer", name: "Year", price: LEGAL.yearPrice.replace(/[^\d.]/g, ""), priceCurrency: "INR", url: abs("/pricing") },
    ],
  },
  {
    "@context": "https://schema.org", "@type": "FAQPage",
    mainEntity: FAQ.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  },
];

function Cell({ v }: { v: boolean | string }) {
  if (v === true) return <><Check className="mx-auto size-5 text-green-400" aria-hidden /><span className="sr-only">Included</span></>;
  if (v === false) return <><Minus className="mx-auto size-5 text-muted-foreground" aria-hidden /><span className="sr-only">Not included</span></>;
  return <span className="text-sm">{v}</span>;
}

export default function Pricing() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 sm:px-6 lg:px-8 py-10 md:py-14">
        <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Pricing" }]} className="mb-6" />
        <h1 className="max-w-3xl text-5xl font-black uppercase leading-none sm:text-6xl lg:text-7xl">{LEGAL.monthlyPrice} a month. Or {LEGAL.yearPrice} for the year.</h1>
        <p className="mt-5 max-w-2xl text-lg text-muted-foreground">Start with a free trial of the tests. Paying covers AI feedback, the mock interview, and the full picture bank.</p>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
          <section aria-labelledby="free-h" className="flex flex-col rounded-2xl border border-white/10 p-7">
            <h2 id="free-h" className="text-3xl font-extrabold uppercase">Free</h2>
            <p className="mt-1 font-display text-5xl font-black">₹0</p>
            <p className="mt-3 text-sm text-muted-foreground">A short trial so you can learn the formats.</p>
            <Link href="/sign-up" className="mt-6 flex min-h-12 w-full items-center justify-center rounded-lg border border-white/20 px-5 text-sm font-semibold">Start free</Link>
          </section>
          <section aria-labelledby="month-h" className="flex flex-col rounded-2xl border border-white/10 p-7">
            <h2 id="month-h" className="text-3xl font-extrabold uppercase">Monthly</h2>
            <p className="mt-1 font-display text-5xl font-black">{LEGAL.monthlyPrice} <span className="mt-1 block text-lg font-semibold text-muted-foreground">per month</span></p>
            <p className="mt-3 text-sm text-muted-foreground">One person, billed each month.</p>
            <Link href="/sign-up" className="mt-6 flex min-h-12 w-full items-center justify-center rounded-lg border border-white/20 px-5 text-sm font-semibold">Create an account</Link>
          </section>
          <section aria-labelledby="quarter-h" className="flex flex-col rounded-2xl border border-white/10 p-7">
            <h2 id="quarter-h" className="text-3xl font-extrabold uppercase">3 months</h2>
            <p className="mt-1 font-display text-5xl font-black">{LEGAL.threeMonthPrice} <span className="mt-1 block text-lg font-semibold text-muted-foreground">for 3 months</span></p>
            <p className="mt-3 text-sm text-muted-foreground">Same access as monthly, at about ₹166 a month. One payment covers three months.</p>
            <Link href="/sign-up" className="mt-6 flex min-h-12 w-full items-center justify-center rounded-lg border border-white/20 px-5 text-sm font-semibold">Create an account</Link>
          </section>
          <section aria-labelledby="year-h" className="flex flex-col rounded-2xl border-2 border-brass p-7">
            <h2 id="year-h" className="text-3xl font-extrabold uppercase text-brass">Year</h2>
            <p className="mt-1 font-display text-5xl font-black">{LEGAL.yearPrice} <span className="mt-1 block text-lg font-semibold text-muted-foreground">for the year</span></p>
            <p className="mt-3 text-sm text-muted-foreground">Same access as monthly, at ₹100 a month. One payment covers the year.</p>
            <Link href="/sign-up" className="mt-6 flex min-h-12 w-full items-center justify-center rounded-lg bg-brass px-5 text-sm font-bold text-black">Create an account</Link>
          </section>
        </div>

        <div className="mt-12 overflow-x-auto rounded-2xl border border-white/10" tabIndex={0} role="region" aria-label="Plan comparison, scrolls sideways on small screens">
          <table className="w-full text-left sm:min-w-[34rem]">
            <caption className="sr-only">Free and paid plan comparison</caption>
            <thead className="bg-white/[0.04] text-sm text-muted-foreground">
              <tr><th scope="col" className="px-4 py-3 font-semibold">What you get</th><th scope="col" className="px-4 py-3 text-center font-semibold">Free</th><th scope="col" className="px-4 py-3 text-center font-semibold text-brass">Paid</th></tr>
            </thead>
            <tbody>
              {ROWS.map((r) => (
                <tr key={r.feature} className="border-t border-white/10">
                  <th scope="row" className="px-4 py-3.5 text-sm font-normal">{r.feature}</th>
                  <td className="px-4 py-3.5 text-center"><Cell v={r.free} /></td>
                  <td className="px-4 py-3.5 text-center"><Cell v={r.paid} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <section className="mt-12 max-w-3xl rounded-2xl border border-white/10 p-6" aria-labelledby="honest">
          <h2 id="honest" className="text-2xl font-extrabold uppercase">What paying does not do</h2>
          <p className="mt-2 text-muted-foreground">It does not predict or improve the board&apos;s decision. Scores are practice signals about how you write. ReadyKadet is independent and not affiliated with any recruiting body.</p>
        </section>

        <section className="mt-12" aria-labelledby="faq-h">
          <h2 id="faq-h" className="text-4xl font-extrabold uppercase">Pricing questions</h2>
          <div className="mt-4 max-w-3xl">
            {FAQ.map((f) => (
              <details key={f.q} className="group border-b border-white/10 py-4">
                <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 font-semibold">{f.q}<span className="text-brass transition-transform group-open:rotate-45 motion-reduce:transition-none" aria-hidden>+</span></summary>
                <p className="mt-2 leading-relaxed text-muted-foreground">{f.a}</p>
              </details>
            ))}
          </div>
          <p className="mt-6 text-sm text-muted-foreground">See the <Link className="underline" href="/refunds">refund policy</Link> and <Link className="underline" href="/terms">terms</Link>.</p>
        </section>
      </main>
      <SiteFooter />
      {jsonLd.map((j, i) => <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(j) }} />)}
    </>
  );
}
