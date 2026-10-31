"use client";

import { ArrowLeft, Check, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Markdown } from "@/components/markdown";
import { fmt } from "@/lib/use-countdown";

/* ───────────── Intro ───────────── */

export function TestIntro(props: {
  kicker: string;
  code: string;
  title: string;
  blurb: string;
  facts: [label: string, value: string][];
  steps?: string[];
  tips: string[];
  startLabel?: string;
  onStart: () => void;
  loading?: boolean;
  note?: string;
}) {
  return (
    <div className="rise">
      <Link href="/tests" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden /> All tests
      </Link>
      <div className="mt-6 grid gap-10 lg:grid-cols-[1.1fr_1fr]">
        <div>
          <p className="text-sm text-brass">{props.kicker}</p>
          <h1 className="mt-1 font-display text-8xl font-black uppercase leading-[0.85] text-primary sm:text-9xl">{props.code}</h1>
          <h2 className="mt-3 text-3xl font-extrabold leading-tight sm:text-4xl">{props.title}</h2>
          <p className="mt-4 max-w-prose text-lg leading-relaxed text-muted-foreground">{props.blurb}</p>

          <dl className="mt-8 grid max-w-lg grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4">
            {props.facts.map(([l, v]) => (
              <div key={l}>
                <dd className="font-display text-4xl font-black leading-none">{v}</dd>
                <dt className="mt-1 text-xs text-muted-foreground">{l}</dt>
              </div>
            ))}
          </dl>

          <button
            onClick={props.onStart} disabled={props.loading}
            className="mt-10 inline-flex h-14 items-center rounded-full bg-primary px-9 text-base font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary/30 disabled:opacity-60"
          >
            {props.loading ? "Loading…" : (props.startLabel ?? "Start test")}
          </button>
          {props.note && <p className="mt-3 text-sm text-muted-foreground">{props.note}</p>}
        </div>

        <div className="space-y-5">
          {props.steps && (
            <section className="rounded-2xl border border-white/[0.08] bg-card/60 p-6">
              <h3 className="text-xl font-extrabold uppercase">How it runs</h3>
              <ol className="mt-4 space-y-3">
                {props.steps.map((s, i) => (
                  <li key={s} className="grid grid-cols-[1.75rem_1fr] items-start gap-3 text-sm leading-relaxed">
                    <span className="grid size-7 place-items-center rounded-full bg-primary/15 text-xs font-bold text-primary">{i + 1}</span>
                    <span className="pt-0.5">{s}</span>
                  </li>
                ))}
              </ol>
            </section>
          )}
          <section className="rounded-2xl border border-white/[0.08] p-6">
            <h3 className="text-xl font-extrabold uppercase">Before you begin</h3>
            <ul className="mt-4 space-y-3">
              {props.tips.map((t) => (
                <li key={t} className="flex gap-3 text-sm leading-relaxed text-muted-foreground">
                  <Check className="mt-0.5 size-4 shrink-0 text-brass" aria-hidden />
                  {t}
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}

/* ───────────── Timer ───────────── */

export function TimerRing({ left, total, size = 176 }: { left: number; total: number; size?: number }) {
  const r = 54;
  const circ = 2 * Math.PI * r;
  const urgent = left <= Math.max(3, total * 0.2);
  return (
    <div className="relative mx-auto grid place-items-center" style={{ width: size, height: size }} role="timer" aria-label={`${left} seconds left`}>
      <svg viewBox="0 0 120 120" className="absolute inset-0 -rotate-90" aria-hidden>
        <circle cx="60" cy="60" r={r} fill="none" stroke="currentColor" strokeOpacity="0.1" strokeWidth="6" />
        <circle
          cx="60" cy="60" r={r} fill="none" strokeWidth="6" strokeLinecap="round"
          stroke={urgent ? "var(--destructive)" : "var(--brass)"}
          strokeDasharray={circ} strokeDashoffset={circ * (1 - left / total)}
          style={{ transition: "stroke-dashoffset 1s linear, stroke .3s" }}
        />
      </svg>
      <span className={`font-display text-6xl font-black tabular-nums ${urgent ? "timer-urgent text-destructive" : "text-brass"}`}>{left}</span>
    </div>
  );
}

function TimerPill({ left, total }: { left: number; total: number }) {
  const urgent = left <= Math.max(10, total * 0.1);
  return (
    <span
      role="timer" aria-label={`${fmt(left)} left`}
      className={`inline-flex min-w-20 items-center justify-center rounded-full border px-4 py-1.5 font-display text-2xl font-black tabular-nums ${urgent ? "timer-urgent border-destructive/60 bg-destructive/10 text-destructive" : "border-brass/40 bg-brass/10 text-brass"}`}
    >
      {fmt(left)}
    </span>
  );
}

/* ───────────── Stage (focus mode) ───────────── */

/** Full-screen focus mode that covers the app chrome while a timed test runs. */
export function ExamStage(props: {
  title: string;
  progress?: { current: number; total: number };
  timer?: { left: number; total: number };
  stepper?: { steps: string[]; current: number };
  children: React.ReactNode;
  wide?: boolean;
}) {
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);
  useEffect(() => {
    if (!confirm) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setConfirm(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [confirm]);

  const p = props.progress;
  return (
    <div className="stage-glow fixed inset-0 z-[60] flex flex-col overflow-y-auto bg-background">
      <header className="sticky top-0 z-10 border-b border-white/[0.06] bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-5xl items-center gap-4 px-4">
          <button onClick={() => setConfirm(true)} aria-label="Exit test" className="grid size-10 shrink-0 place-items-center rounded-full border border-white/10 text-muted-foreground transition-colors hover:border-white/30 hover:text-foreground">
            <X className="size-4" aria-hidden />
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{props.title}</p>
            {p && <p className="text-xs text-muted-foreground">{p.current} of {p.total}</p>}
          </div>
          {props.timer && <TimerPill {...props.timer} />}
        </div>
        {p && (
          <div className="h-1 bg-white/5" role="progressbar" aria-valuemin={0} aria-valuemax={p.total} aria-valuenow={p.current}>
            <div className="h-full bg-primary transition-[width] duration-500" style={{ width: `${(p.current / p.total) * 100}%` }} />
          </div>
        )}
        {props.stepper && <Stepper {...props.stepper} />}
      </header>

      <main className={`mx-auto flex w-full flex-1 flex-col justify-center px-4 py-8 ${props.wide ? "max-w-5xl" : "max-w-3xl"}`}>
        <div key={String(p?.current ?? 0)} className="rise">{props.children}</div>
      </main>

      {confirm && (
        <div className="fixed inset-0 z-[70] grid place-items-center bg-black/70 p-4" role="dialog" aria-modal="true" aria-labelledby="leave-title">
          <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-card p-6">
            <h2 id="leave-title" className="text-2xl font-extrabold uppercase">Leave this test?</h2>
            <p className="mt-2 text-sm text-muted-foreground">Your answers so far will be lost. On the real day there is no going back either.</p>
            <div className="mt-6 flex gap-3">
              <button autoFocus onClick={() => setConfirm(false)} className="h-11 flex-1 rounded-full bg-primary font-semibold text-primary-foreground">Keep going</button>
              <button onClick={() => router.push("/tests")} className="h-11 flex-1 rounded-full border border-white/20 font-semibold hover:border-destructive hover:text-destructive">Leave</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function Stepper({ steps, current }: { steps: string[]; current: number }) {
  return (
    <ol className="mx-auto flex max-w-5xl items-center gap-2 px-4 py-2.5 text-xs" aria-label="Test stages">
      {steps.map((s, i) => (
        <li key={s} aria-current={i === current ? "step" : undefined} className="flex items-center gap-2">
          <span className={`grid size-5 place-items-center rounded-full text-[10px] font-bold ${i < current ? "bg-primary text-primary-foreground" : i === current ? "border border-primary text-primary" : "border border-white/15 text-muted-foreground"}`}>
            {i < current ? <Check className="size-3" aria-hidden /> : i + 1}
          </span>
          <span className={i === current ? "font-semibold text-foreground" : "text-muted-foreground"}>{s}</span>
          {i < steps.length - 1 && <span className="mx-1 h-px w-6 bg-white/15" aria-hidden />}
        </li>
      ))}
    </ol>
  );
}

/* ───────────── Inputs ───────────── */

export function WritingPad(props: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  label: string;
  rows?: number;
  autoFocus?: boolean;
}) {
  const words = props.value.trim() ? props.value.trim().split(/\s+/).length : 0;
  return (
    <div>
      <textarea
        aria-label={props.label} autoFocus={props.autoFocus} rows={props.rows ?? 9}
        value={props.value} onChange={(e) => props.onChange(e.target.value)} placeholder={props.placeholder}
        className="w-full resize-none rounded-2xl border border-white/10 bg-card/60 p-5 text-lg leading-relaxed outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary"
      />
      <p className="mt-2 text-right text-xs text-muted-foreground">{words} {words === 1 ? "word" : "words"}</p>
    </div>
  );
}

export function PrimaryButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { className = "", ...rest } = props;
  return (
    <button
      {...rest}
      className={`inline-flex h-12 items-center justify-center rounded-full bg-primary px-8 font-semibold text-primary-foreground transition-all hover:-translate-y-0.5 disabled:opacity-60 ${className}`}
    />
  );
}

/* ───────────── States ───────────── */

export function EvaluatingView({ label = "Scoring your answers" }: { label?: string }) {
  return (
    <div className="grid min-h-[60vh] place-items-center text-center" role="status" aria-live="polite">
      <div>
        <div className="mx-auto size-16 animate-spin rounded-full border-4 border-white/10 border-t-primary" aria-hidden />
        <p className="mt-6 font-display text-4xl font-black uppercase">{label}</p>
        <p className="mt-2 text-muted-foreground">Matching what you wrote to Officer Like Qualities.</p>
      </div>
    </div>
  );
}

export function ErrorView({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="mx-auto max-w-md rounded-2xl border border-destructive/40 bg-destructive/10 p-8 text-center" role="alert">
      <p className="font-display text-4xl font-black uppercase text-destructive">Something went wrong</p>
      <p className="mt-3 text-muted-foreground">{message}</p>
      <div className="mt-6 flex justify-center gap-3">
        {onRetry && <PrimaryButton onClick={onRetry}>Try again</PrimaryButton>}
        <Link href="/tests" className="inline-flex h-12 items-center rounded-full border border-white/20 px-6 font-semibold hover:border-white/40">Back to tests</Link>
      </div>
    </div>
  );
}

/* ───────────── Result ───────────── */

const band = (pct: number) => (pct >= 0.85 ? "Excellent" : pct >= 0.7 ? "Strong" : pct >= 0.45 ? "Developing" : "Needs work");

export function ScoreDial({ score, outOf = 10, size = 168 }: { score: number; outOf?: number; size?: number }) {
  const r = 54;
  const circ = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, score / outOf));
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg viewBox="0 0 120 120" className="absolute inset-0 -rotate-90" aria-hidden>
        <circle cx="60" cy="60" r={r} fill="none" stroke="currentColor" strokeOpacity="0.1" strokeWidth="8" />
        <circle
          cx="60" cy="60" r={r} fill="none" stroke="var(--primary)" strokeWidth="8" strokeLinecap="round"
          strokeDasharray={circ} className="dial-arc"
          style={{ ["--full" as string]: circ, ["--to" as string]: circ * (1 - pct) }}
        />
      </svg>
      <div className="text-center">
        <span className="font-display text-7xl font-black leading-none">{score}</span>
        <span className="block text-sm text-muted-foreground">out of {outOf}</span>
      </div>
    </div>
  );
}

export function ScoreResult(props: {
  title: string;
  score: number;
  outOf?: number;
  olqs?: string[];
  markdown: string;
  extra?: React.ReactNode;
  onRetry: () => void;
  retryLabel?: string;
}) {
  const outOf = props.outOf ?? 10;
  return (
    <div className="rise space-y-8">
      <Link href="/tests" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden /> All tests
      </Link>
      <section className="grid gap-8 rounded-3xl border border-white/[0.08] bg-card/60 p-7 sm:grid-cols-[auto_1fr] sm:items-center md:p-10">
        <ScoreDial score={props.score} outOf={outOf} />
        <div>
          <p className="text-sm text-brass">{props.title}</p>
          <p className="font-display text-5xl font-black uppercase leading-none">{band(props.score / outOf)}</p>
          {props.olqs && props.olqs.length > 0 && (
            <>
              <p className="mt-5 text-sm text-muted-foreground">Qualities your answers showed</p>
              <ul className="mt-2 flex flex-wrap gap-2">
                {props.olqs.map((q) => (
                  <li key={q} className="rounded-full border border-primary/30 bg-primary/10 px-3.5 py-1 text-sm font-medium text-primary">{q}</li>
                ))}
              </ul>
            </>
          )}
        </div>
      </section>

      <section className="rounded-3xl border border-white/[0.08] p-7 md:p-10">
        <h2 className="text-3xl font-extrabold uppercase">Feedback</h2>
        <div className="mt-4"><Markdown>{props.markdown}</Markdown></div>
      </section>

      {props.extra}

      <div className="flex flex-wrap gap-3">
        <PrimaryButton onClick={props.onRetry}>{props.retryLabel ?? "Try again"}</PrimaryButton>
        <Link href="/history" className="inline-flex h-12 items-center rounded-full border border-white/20 px-7 font-semibold transition-colors hover:border-white/40">View progress</Link>
        <Link href="/tests" className="inline-flex h-12 items-center rounded-full px-5 font-semibold text-muted-foreground transition-colors hover:text-foreground">Another test</Link>
      </div>
      <p className="text-xs text-muted-foreground">AI feedback helps you practise. It is not an official assessment or a prediction of the board&apos;s decision.</p>
    </div>
  );
}


/* ───────────── Picture match ───────────── */

/** Shows how well a story fit the picture: elements used, elements missed and a short note. */
export function ImageMatch(props: { imageUrl?: string; alignment?: { score: number; matched: string[]; missed: string[]; notes: string } | null }) {
  const a = props.alignment;
  if (!a) return null;
  return (
    <section className="grid gap-6 rounded-3xl border border-white/[0.08] p-7 sm:grid-cols-[11rem_1fr] md:p-10">
      {props.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={props.imageUrl} alt="The picture you wrote about" className="w-full rounded-2xl border border-white/10 object-cover" />
      )}
      <div>
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-3xl font-extrabold uppercase">Fit with the picture</h2>
          <span className="font-display text-5xl font-black text-primary">{a.score}<span className="text-lg text-muted-foreground">/10</span></span>
        </div>
        {a.notes && <p className="mt-2 text-muted-foreground">{a.notes}</p>}
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <div>
            <p className="text-sm font-semibold text-green-400">You used</p>
            <ul className="mt-2 flex flex-wrap gap-2">
              {a.matched.length ? a.matched.map((m) => <li key={m} className="rounded-full border border-green-500/40 bg-green-500/10 px-3 py-1 text-sm">{m}</li>) : <li className="text-sm text-muted-foreground">Nothing clearly picked out.</li>}
            </ul>
          </div>
          <div>
            <p className="text-sm font-semibold text-brass">You missed</p>
            <ul className="mt-2 flex flex-wrap gap-2">
              {a.missed.length ? a.missed.map((m) => <li key={m} className="rounded-full border border-brass/40 bg-brass/10 px-3 py-1 text-sm">{m}</li>) : <li className="text-sm text-muted-foreground">No major elements missed.</li>}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
