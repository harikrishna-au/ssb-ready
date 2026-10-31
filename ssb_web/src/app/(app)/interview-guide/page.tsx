import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Interview guide" };

const THEMES = [
  ["Your PIQ", "Almost every question starts from something you wrote: your hobbies, schooling, family, achievements and the reason you chose this career. If you cannot talk about it for two minutes, remove it or learn it."],
  ["You as a person", "Strengths, weaknesses, what you do on a bad day, a time you failed and what you did next."],
  ["Why the forces", "A clear and honest reason you want to be an officer, and what you know about the service you chose."],
  ["Current affairs", "Major national and defence news from the last few months. Know the facts and have a view you can defend calmly."],
  ["Consistency", "Your answers should match your PIQ, your TAT stories, your WAT sentences and your SDT. Assessors compare them."],
];

const DO = [
  "Answer the question asked, in a few clear sentences, then stop.",
  "Say 'I don't know' when you don't. Guessing is worse than admitting it.",
  "Give a real example for any quality you claim.",
  "Keep your voice and posture steady when a question is uncomfortable.",
];
const DONT = [
  "Memorise answers word for word. Follow-up questions will expose it.",
  "List qualities with no examples behind them.",
  "Put details in your PIQ you have not prepared to discuss.",
  "Argue with the interviewing officer or try to win a point.",
];

export default function InterviewGuide() {
  return (
    <div className="max-w-2xl space-y-12">
      <div>
        <h1 className="text-5xl font-black uppercase leading-none">Interview guide</h1>
        <p className="mt-4 leading-relaxed text-muted-foreground">
          The personal interview is a one-to-one conversation with the interviewing officer. It is built around you, so the best preparation is knowing your own story well and being able to say it plainly. This is a short guide, not a script.
        </p>
      </div>

      <section>
        <h2 className="text-3xl font-extrabold uppercase">What the questions come from</h2>
        <dl className="mt-3">
          {THEMES.map(([t, d]) => (
            <div key={t} className="border-b border-white/10 py-4">
              <dt className="font-semibold">{t}</dt>
              <dd className="mt-1 text-muted-foreground">{d}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="grid gap-8 sm:grid-cols-2">
        <div>
          <h2 className="text-3xl font-extrabold uppercase text-primary">Do</h2>
          <ul className="mt-3 space-y-3 text-muted-foreground">{DO.map((d) => <li key={d}>{d}</li>)}</ul>
        </div>
        <div>
          <h2 className="text-3xl font-extrabold uppercase text-destructive">Avoid</h2>
          <ul className="mt-3 space-y-3 text-muted-foreground">{DONT.map((d) => <li key={d}>{d}</li>)}</ul>
        </div>
      </section>

      <section>
        <h2 className="text-3xl font-extrabold uppercase">A way to prepare</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-muted-foreground">
          <li>Fill in your PIQ honestly in the mock interview.</li>
          <li>Run the AI mock interview and answer out loud, using the microphone.</li>
          <li>Read the transcript. Mark any answer where you rambled or contradicted your PIQ.</li>
          <li>Repeat with those answers shortened and backed by one example.</li>
        </ol>
      </section>

      <div className="rounded-2xl border border-primary/30 bg-primary/10 p-6">
        <p className="text-xl font-semibold">Practise with questions drawn from your own PIQ.</p>
        <Link href="/interview" className="mt-4 inline-flex rounded-lg bg-primary px-6 py-3 font-semibold text-primary-foreground">Start the mock interview</Link>
      </div>
    </div>
  );
}
