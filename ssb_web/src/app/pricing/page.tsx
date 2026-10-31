import type { Metadata } from "next";
import Link from "next/link";
import { Check, Minus } from "lucide-react";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { SiteFooter, SiteHeader } from "@/components/site/header";
import { LEGAL } from "@/lib/legal";
import { abs, SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: "Pricing: free practice, one-time Lifetime plan",
  description: `Practise every SSB test for free. Lifetime access is a single payment of ${LEGAL.price} with no subscription and no renewal.`,
  alternates: { canonical: "/pricing" },
  openGraph: { type: "website", url: "/pricing", title: "ReadyKadet pricing", description: `Free to start. Lifetime access is ${LEGAL.price}, paid once.` },
};

const ROWS: { feature: string; free: boolean | string; life: boolean | string }[] = [
  { feature: "OIR, PPDT, TAT, WAT, SRT and SDT timed tests", free: true, life: true },
  { feature: "AI feedback on every written attempt", free: true, life: true },
  { feature: "Lecturette practice and interview guide", free: true, life: true },
  { feature: "Attempt history and OLQ profile", free: true, life: true },
  { feature: "Pictures for PPDT and TAT", free: "5", life: "Full 45-picture bank" },
  { feature: "Radar: open entries and your application tracker", free: true, life: true },
  { feature: "Renewals", free: "None", life: "None, you pay once" },
];

const FAQ = [
  { q: "Is Lifetime really one payment?", a: `Yes. Lifetime access is a single payment of ${LEGAL.price}. There is no subscription and no renewal.` },
  { q: "What does Lifetime unlock?", a: "The full 45-picture bank for PPDT and TAT. Everything else is already free." },
  { q: "Can I get a refund?", a: `Refund terms are on the refund policy page. Write to ${LEGAL.supportEmail} with the email you signed up with.` },
  { q: "Will the price change?", a: "We cannot promise a price for the future. The price you see here is the price you pay today." },
  { q: "Does paying improve my chances at the board?", a: "No tool can promise that. A larger picture bank gives you more practice material, and the score is a practice signal, not a prediction of the board's decision." },
];

const jsonLd = [
  {
    "@context": "https://schema.org", "@type": "SoftwareApplication",
    name: SITE_NAME, applicationCategory: "EducationalApplication", operatingSystem: "Web",
    url: abs("/"),
    offers: [
      { "@type": "Offer", name: "Free", price: "0", priceCurrency: "INR", url: abs("/sign-up") },
      { "@type": "Offer", name: "Lifetime", price: LEGAL.price.replace(/[^\d.]/g, ""), priceCurrency: "INR", url: abs("/premium") },
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
      <main className="mx-auto w-full max-w-5xl flex-1 px-5 py-14">
        <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Pricing" }]} className="mb-6" />
        <h1 className="max-w-3xl text-5xl font-black uppercase leading-none sm:text-6xl lg:text-7xl">Start free. Pay once if you want more pictures.</h1>
        <p className="mt-5 max-w-2xl text-lg text-muted-foreground">Every test and every written-attempt score is free. Lifetime unlocks the full picture bank for PPDT and TAT.</p>

        <div className="mt-12 grid gap-6 md:grid-cols-2">
          <section aria-labelledby="free-h" className="rounded-2xl border border-white/10 p-7">
            <h2 id="free-h" className="text-3xl font-extrabold uppercase">Free</h2>
            <p className="mt-1 font-display text-5xl font-black">₹0</p>
            <p className="mt-3 text-sm text-muted-foreground">Everything you need to learn the formats and see your patterns.</p>
            <Link href="/sign-up" className="mt-6 inline-flex min-h-11 items-center rounded-lg border border-white/20 px-5 text-sm font-semibold">Start free</Link>
          </section>
          <section aria-labelledby="life-h" className="rounded-2xl border-2 border-brass p-7">
            <h2 id="life-h" className="text-3xl font-extrabold uppercase text-brass">Lifetime</h2>
            <p className="mt-1 font-display text-5xl font-black">{LEGAL.price} <span className="text-lg font-semibold text-muted-foreground">one time</span></p>
            <p className="mt-3 text-sm text-muted-foreground">For aspirants who want more practice material. No subscription, no renewal.</p>
            <Link href="/premium" className="mt-6 inline-flex min-h-11 items-center rounded-lg bg-brass px-5 text-sm font-bold text-black">Get lifetime access</Link>
          </section>
        </div>

        <div className="mt-12 overflow-x-auto rounded-2xl border border-white/10" tabIndex={0} role="region" aria-label="Plan comparison, scrolls sideways on small screens">
          <table className="w-full min-w-[34rem] text-left">
            <caption className="sr-only">Free and Lifetime plan comparison</caption>
            <thead className="bg-white/[0.04] text-sm text-muted-foreground">
              <tr><th scope="col" className="px-4 py-3 font-semibold">What you get</th><th scope="col" className="px-4 py-3 text-center font-semibold">Free</th><th scope="col" className="px-4 py-3 text-center font-semibold text-brass">Lifetime</th></tr>
            </thead>
            <tbody>
              {ROWS.map((r) => (
                <tr key={r.feature} className="border-t border-white/10">
                  <th scope="row" className="px-4 py-3.5 text-sm font-normal">{r.feature}</th>
                  <td className="px-4 py-3.5 text-center"><Cell v={r.free} /></td>
                  <td className="px-4 py-3.5 text-center"><Cell v={r.life} /></td>
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
