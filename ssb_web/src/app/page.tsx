import Link from "next/link";
import { Suspense } from "react";
import { RadarLanding } from "@/components/radar/radar-data";
import { SiteFooter, SiteHeader } from "@/components/site/header";
import { WatDemo } from "@/components/site/wat-demo";
import { EXAMS, GROUPS, OLQS, TESTS, type Group } from "@/lib/tests";

const FAQ = [
  { q: "What is the SSB?", a: "The Services Selection Board is the multi-day interview and testing process used to select officers for the Army, Navy and Air Force. Day 1 is the screening round (OIR and PPDT). Candidates who pass go on to psychology tests, group tasks including the lecturette, and the personal interview." },
  { q: "Is the AI score the same as an assessor's score?", a: "No. Assessors at the board score you in person and no tool can predict that. ReadyKadet scores your answers against Officer Like Qualities so you can see patterns in how you write: what you avoid, what you repeat and where you run out of time." },
  { q: "Which exams is this for?", a: "NDA, CDS, AFCAT, CAPF and TA aspirants. The SSB tests are the same format for all of them." },
  { q: "Does it work on my phone?", a: "Yes. Every test runs in the browser on a phone, tablet or laptop. There is nothing to install." },
  { q: "What do I get for free?", a: "You can take every test and get AI feedback on each written attempt using a set of five pictures for PPDT and TAT. Lifetime access unlocks the full 45-picture bank." },
  { q: "What happens to my answers?", a: "Your answers are stored against your account so you can review them in your history. They are sent to an AI service to be scored. Read the privacy policy for details." },
  { q: "Can I get a refund?", a: "Refund terms are on the refund policy page. Write to support@readykadet.com and include the email you signed up with." },
];

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQ.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
};

export default function Landing() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-16 md:grid-cols-[1.15fr_1fr] md:py-24">
            <div>
              <h1 className="text-6xl font-black uppercase leading-[0.95] sm:text-7xl lg:text-8xl">
                Practise the SSB on the clock, not on a hunch.
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
                Clear the Day 1 screening, then fix what the psychology tests expose. Timed OIR, PPDT, TAT, WAT, SRT and SDT, Lecturette practice and an interview guide. Every written attempt is scored against Officer Like Qualities.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <Link href="/sign-up" className="w-full rounded-lg bg-primary px-6 py-3.5 text-center font-semibold text-primary-foreground sm:w-auto">Start free</Link>
                <a href="#tests" className="flex min-h-11 w-full items-center justify-center px-2 text-sm text-muted-foreground hover:text-foreground sm:inline-flex sm:w-auto">See what you can practise</a>
              </div>
              <p className="mt-8 text-sm text-muted-foreground">For {EXAMS.slice(0, 5).join(", ")} aspirants. Works on your phone.</p>
            </div>
            <div className="flex justify-center md:justify-end"><WatDemo /></div>
          </div>
        </section>

        {/* Radar */}
        <section id="radar" className="border-t border-white/5 bg-card/40 py-20">
          <div className="mx-auto max-w-6xl px-5">
            <h2 className="max-w-3xl text-5xl font-black uppercase leading-none sm:text-6xl">Radar: never miss a last date</h2>
            <p className="mt-4 max-w-2xl text-muted-foreground">
              See which defence officer exams are open or opening next, jump to the official apply page and track every application you make in one list.
            </p>
            <Suspense fallback={<p className="mt-10 text-muted-foreground">Loading notifications…</p>}>
              <RadarLanding />
            </Suspense>
            <p className="mt-6 max-w-2xl text-xs text-muted-foreground">Dates marked tentative or expected can change. Confirm on the official site before applying.</p>
          </div>
        </section>

        {/* Tests */}
        <section id="tests" className="border-t border-white/5 py-20">
          <div className="mx-auto max-w-6xl px-5">
            <h2 className="max-w-2xl text-5xl font-black uppercase leading-none sm:text-6xl">The rounds that decide whether you stay, in the board&apos;s own format</h2>
            <p className="mt-4 max-w-xl text-muted-foreground">Timings match what you will face on the day.</p>
            <div className="mt-12">
              {(["screening", "psychology", "speaking"] as Group[]).map((g) => (
                <div key={g} className="mb-10">
                  <h3 className="text-2xl font-extrabold uppercase text-brass">{GROUPS[g].title}</h3>
                  <p className="mb-2 max-w-xl text-sm text-muted-foreground">{GROUPS[g].blurb}</p>
                  {TESTS.filter((t) => t.group === g).map((t) => (
                    <Link
                      key={t.slug} href={`/${t.slug}`}
                      className="group grid items-baseline gap-x-8 gap-y-1 border-b border-white/10 py-5 transition-colors hover:bg-white/[0.03] md:grid-cols-[13rem_1fr_1fr_5rem]"
                    >
                      <span className="font-display text-5xl font-black uppercase leading-none group-hover:text-primary">{t.name}</span>
                      <span>
                        <span className="block font-semibold">{t.full}</span>
                        <span className="text-sm text-muted-foreground">{t.format}</span>
                      </span>
                      <span className="text-sm text-muted-foreground">Looks at: {t.measures}</span>
                      <span className="text-sm font-semibold md:text-right">{t.minutes}</span>
                    </Link>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="border-t border-white/5 bg-card/40 py-20">
          <div className="mx-auto grid max-w-6xl gap-12 px-5 md:grid-cols-2">
            <div>
              <h2 className="text-5xl font-black uppercase leading-none sm:text-6xl">What happens after you hit submit</h2>
              <ol className="mt-10 space-y-8">
                {[
                  ["Take the test with the real clock", "No pausing, no second tries on a word. When time runs out your answer is taken as it stands."],
                  ["Get a score and the qualities behind it", "Each attempt is rated out of 10 and matched to the Officer Like Qualities your writing shows."],
                  ["Read what to change", "Feedback names the pattern, such as blaming others, ending a story with no action or leaving situations unanswered."],
                  ["Come back and compare", "Your history keeps every attempt, so you can check whether the same weakness shows up twice."],
                ].map(([title, body], n) => (
                  <li key={title} className="grid grid-cols-[2.5rem_1fr] gap-4">
                    <span className="font-display text-4xl font-black leading-none text-brass">{n + 1}</span>
                    <span>
                      <span className="block text-lg font-semibold">{title}</span>
                      <span className="text-muted-foreground">{body}</span>
                    </span>
                  </li>
                ))}
              </ol>
            </div>
            <div className="self-start rounded-2xl border border-white/10 bg-background p-6">
              <p className="text-sm text-muted-foreground">Example of feedback format (sample text, not a real user)</p>
              <p className="mt-3 font-display text-6xl font-black text-primary">7<span className="text-2xl text-muted-foreground">/10</span></p>
              <p className="mt-2 text-sm font-semibold">Qualities shown</p>
              <p className="text-sm text-muted-foreground">Determination, sense of responsibility, initiative</p>
              <p className="mt-4 text-sm font-semibold">Feedback</p>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Most sentences name a person who acts, which reads as responsible. Three answers end with the problem unsolved; finish each with what the character does next.
              </p>
            </div>
          </div>
        </section>

        {/* OLQs */}
        <section className="border-t border-white/5 py-20">
          <div className="mx-auto max-w-6xl px-5">
            <h2 className="max-w-3xl text-4xl font-black uppercase leading-none sm:text-5xl">Scored against the qualities the board looks for</h2>
            <ul className="mt-8 flex flex-wrap gap-2.5">
              {OLQS.map((q) => (
                <li key={q} className="rounded-full border border-white/10 px-4 py-1.5 text-sm text-muted-foreground">{q}</li>
              ))}
            </ul>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="border-t border-white/5 bg-card/40 py-20">
          <div className="mx-auto max-w-6xl px-5">
            <h2 className="text-5xl font-black uppercase leading-none sm:text-6xl">Pay once. Prepare for as many attempts as it takes.</h2>
            <div className="mt-12 grid gap-6 md:max-w-4xl md:grid-cols-2">
              <div className="rounded-2xl border border-white/10 p-7">
                <h3 className="text-3xl font-extrabold uppercase">Free</h3>
                <p className="mt-1 font-display text-5xl font-black">₹0</p>
                <ul className="mt-6 space-y-2.5 text-sm text-muted-foreground">
                  <li>Every test, with AI feedback on written attempts</li>
                  <li>5 pictures for PPDT and TAT</li>
                  <li>Attempt history</li>
                </ul>
                <Link href="/sign-up" className="mt-8 inline-flex rounded-lg border border-white/20 px-5 py-2.5 text-sm font-semibold">Start free</Link>
              </div>
              <div className="rounded-2xl border-2 border-brass p-7">
                <h3 className="text-3xl font-extrabold uppercase text-brass">Lifetime</h3>
                <p className="mt-1 font-display text-5xl font-black">₹299 <span className="text-lg font-semibold text-muted-foreground">one time</span></p>
                <ul className="mt-6 space-y-2.5 text-sm text-muted-foreground">
                  <li>Everything in Free</li>
                  <li>Full 45-picture bank for PPDT and TAT</li>
                  <li>No subscription, no renewal</li>
                </ul>
                <Link href="/premium" className="mt-8 inline-flex rounded-lg bg-brass px-5 py-2.5 text-sm font-bold text-black">Get lifetime access</Link>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="border-t border-white/5 py-20">
          <div className="mx-auto grid max-w-6xl gap-10 px-5 md:grid-cols-[1fr_1.4fr]">
            <h2 className="text-5xl font-black uppercase leading-none sm:text-6xl">Questions aspirants ask</h2>
            <div>
              {FAQ.map((f) => (
                <details key={f.q} className="group border-b border-white/10 py-4">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold">
                    {f.q}
                    <span className="text-brass transition-transform group-open:rotate-45" aria-hidden>+</span>
                  </summary>
                  <p className="mt-3 max-w-prose leading-relaxed text-muted-foreground">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="border-t border-white/5 py-20 text-center">
          <h2 className="mx-auto max-w-3xl px-5 text-5xl font-black uppercase leading-none sm:text-6xl">Your first WAT takes four minutes.</h2>
          <Link href="/sign-up" className="mt-8 inline-flex min-h-12 items-center rounded-lg bg-primary px-7 py-3.5 font-semibold text-primary-foreground">Start free</Link>
        </section>
      </main>
      <SiteFooter />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
    </>
  );
}
