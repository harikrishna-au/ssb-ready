import Link from "next/link";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { getPost } from "@/lib/posts";
import { abs, SITE_NAME } from "@/lib/site";
import type { ExamInfo } from "./exam-data";
import { SiteFooter, SiteHeader } from "./header";

/** Shared template for /nda, /cds, /afcat and /capf. */
export function ExamPage({ exam }: { exam: ExamInfo }) {
  const posts = exam.posts.map(getPost).filter((p): p is NonNullable<typeof p> => !!p);
  const jsonLd = [
    {
      "@context": "https://schema.org", "@type": "FAQPage",
      mainEntity: exam.faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
    },
    {
      "@context": "https://schema.org", "@type": "Course",
      name: `${exam.name} SSB preparation`, description: exam.description,
      provider: { "@type": "Organization", name: SITE_NAME, sameAs: abs("/") },
      url: abs(`/${exam.slug}`),
      offers: { "@type": "Offer", category: "Free", price: "0", priceCurrency: "INR" },
    },
  ];
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-5xl flex-1 px-5 py-14">
        <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: exam.name }]} className="mb-6" />
        <p className="text-sm font-semibold text-brass">{exam.full}</p>
        <h1 className="mt-1 max-w-4xl text-5xl font-black uppercase leading-[0.98] sm:text-6xl lg:text-7xl">{exam.title}</h1>
        <p className="mt-5 max-w-2xl text-lg text-muted-foreground">{exam.tagline}</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/sign-up" className="inline-flex min-h-11 items-center rounded-lg bg-primary px-6 font-semibold text-primary-foreground">Start free</Link>
          <Link href="/pricing" className="inline-flex min-h-11 items-center rounded-lg border border-white/20 px-6 font-semibold">See pricing</Link>
        </div>

        <section className="mt-16" aria-labelledby="what"><h2 id="what" className="text-4xl font-extrabold uppercase">What the {exam.name} entry is</h2>
          <div className="mt-4 max-w-3xl space-y-4 leading-relaxed text-muted-foreground">{exam.what.map((t) => <p key={t}>{t}</p>)}</div>
        </section>

        <section className="mt-14 rounded-2xl border border-brass/40 bg-brass/10 p-6" aria-labelledby="elig">
          <h2 id="elig" className="text-3xl font-extrabold uppercase text-brass">Eligibility: check the official notice</h2>
          <p className="mt-3 max-w-3xl text-muted-foreground">{exam.eligibilityNote}</p>
          <ul className="mt-4 space-y-2">
            {exam.official.map((s) => (
              <li key={s.url}><a href={s.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center text-primary underline underline-offset-2">{s.label}</a></li>
            ))}
          </ul>
        </section>

        <section className="mt-14" aria-labelledby="ssb"><h2 id="ssb" className="text-4xl font-extrabold uppercase">{exam.usesSsb ? `How the SSB works for ${exam.name}` : `Is there an SSB for ${exam.name}?`}</h2>
          <ul className="mt-4 max-w-3xl list-disc space-y-3 pl-5 leading-relaxed text-muted-foreground">{exam.ssb.map((t) => <li key={t}>{t}</li>)}</ul>
        </section>

        <section className="mt-14" aria-labelledby="plan"><h2 id="plan" className="text-4xl font-extrabold uppercase">A preparation plan</h2>
          <ol className="mt-6 grid gap-4 md:grid-cols-2">
            {exam.plan.map((s, i) => (
              <li key={s.title} className="grid grid-cols-[2.25rem_1fr] gap-3 rounded-2xl border border-white/10 p-5">
                <span className="font-display text-4xl font-black leading-none text-brass">{i + 1}</span>
                <span><span className="block font-semibold">{s.title}</span><span className="text-sm text-muted-foreground">{s.body}</span></span>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-14" aria-labelledby="practice"><h2 id="practice" className="text-4xl font-extrabold uppercase">What you can practise on ReadyKadet</h2>
          <p className="mt-4 max-w-3xl text-muted-foreground">Timed OIR, PPDT, TAT, WAT, SRT and SDT, lecturette practice and an interview guide. Each written attempt is scored against the Officer Like Qualities. The score is a practice signal, not a prediction of the board&apos;s decision.{!exam.usesSsb && " These are built for the SSB and are only partly relevant to this entry."}</p>
          <Link href="/#tests" className="mt-4 inline-flex min-h-11 items-center text-primary underline underline-offset-2">See the tests</Link>
        </section>

        {posts.length > 0 && (
          <section className="mt-14" aria-labelledby="guides"><h2 id="guides" className="text-4xl font-extrabold uppercase">Guides to read next</h2>
            <ul className="mt-4 grid gap-3 md:grid-cols-2">
              {posts.map((p) => (
                <li key={p.slug}><Link href={`/blog/${p.slug}`} className="block rounded-2xl border border-white/10 p-5 hover:border-primary"><span className="font-semibold">{p.title}</span><span className="mt-1 block text-sm text-muted-foreground">{p.minutes} min read</span></Link></li>
              ))}
            </ul>
          </section>
        )}

        <section className="mt-14" aria-labelledby="faq"><h2 id="faq" className="text-4xl font-extrabold uppercase">Questions</h2>
          <div className="mt-4 max-w-3xl">
            {exam.faq.map((f) => (
              <details key={f.q} className="group border-b border-white/10 py-4">
                <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 font-semibold">{f.q}<span className="text-brass transition-transform group-open:rotate-45 motion-reduce:transition-none" aria-hidden>+</span></summary>
                <p className="mt-2 leading-relaxed text-muted-foreground">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        <p className="mt-12 max-w-3xl text-xs text-muted-foreground">ReadyKadet is an independent practice tool and is not affiliated with UPSC, the Indian Armed Forces, the Services Selection Board or any recruiting body. Reviewed 31 October 2026 by the ReadyKadet team; not yet independently reviewed. Points we could not tie to an official source: {exam.verify.join(" ")}</p>
      </main>
      <SiteFooter />
      {jsonLd.map((j, i) => <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(j) }} />)}
    </>
  );
}
