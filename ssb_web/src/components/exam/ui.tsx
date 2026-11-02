"use client";

import { ArrowLeft, Check, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { Markdown } from "@/components/markdown";
import { fmt } from "@/lib/use-countdown";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import LinearProgress from "@mui/material/LinearProgress";
import TextField from "@mui/material/TextField";
import { LinkButton } from "@/components/ui/link-button";

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
  /** Extra controls shown above the start button, such as a ModeSwitch. */
  extra?: ReactNode;
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

          {props.extra}
          <div className="hidden md:block">
            <StartButton {...props} className="mt-10" />
            {props.note && <p className="mt-3 text-sm text-muted-foreground">{props.note}</p>}
          </div>
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

      {/* Phones: pinned above the tab bar so Start is always under the thumb. */}
      <div className="sticky bottom-[calc(4rem+env(safe-area-inset-bottom))] z-20 -mx-4 mt-6 border-t border-white/[0.08] bg-background/90 px-4 py-3 backdrop-blur-md md:hidden">
        <StartButton {...props} className="w-full" />
        {props.note && <p className="mt-2 text-center text-xs text-muted-foreground">{props.note}</p>}
      </div>
    </div>
  );
}

function StartButton(props: { onStart: () => void; loading?: boolean; startLabel?: string; className?: string }) {
  return (
    <Button variant="contained" size="large" onClick={props.onStart} disabled={props.loading} className={props.className} sx={{ minHeight: 56, px: 5, fontSize: "1rem", boxShadow: "0 10px 24px -8px var(--primary)" }}>
      {props.loading ? "Loading…" : (props.startLabel ?? "Start test")}
    </Button>
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
  /** Rendered above the stage (z-70), for dialogs. Kept outside the animated content so `fixed` works. */
  overlay?: React.ReactNode;
}) {
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const p = props.progress;
  return (
    <div className="stage-glow fixed inset-0 z-[60] flex flex-col overflow-y-auto bg-background">
      <header className="sticky top-0 z-10 border-b border-white/[0.06] bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-5xl items-center gap-4 px-4 sm:px-6">
          <button onClick={() => setConfirm(true)} aria-label="Exit test" className="grid size-11 shrink-0 place-items-center rounded-full border border-white/10 text-muted-foreground transition-colors hover:border-white/30 hover:text-foreground">
            <X className="size-4" aria-hidden />
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{props.title}</p>
            {p && <p className="text-xs text-muted-foreground">{p.current} of {p.total}</p>}
          </div>
          {props.timer && <TimerPill {...props.timer} />}
        </div>
        {p && (
          <LinearProgress variant="determinate" value={(p.current / p.total) * 100} aria-label="Test progress" sx={{ height: 4, borderRadius: 0 }} />
        )}
        {props.stepper && <Stepper {...props.stepper} />}
      </header>

      <main className={`mx-auto flex w-full flex-1 flex-col px-4 sm:px-6 pt-6 pb-[max(2rem,env(safe-area-inset-bottom))] sm:py-8 ${props.wide ? "max-w-5xl" : "max-w-3xl"}`}>
        <div key={String(p?.current ?? 0)} className="rise my-auto">{props.children}</div>
      </main>

      {props.overlay}
      <Dialog open={confirm} onClose={() => setConfirm(false)} sx={{ zIndex: 70 }} aria-labelledby="leave-title">
        <DialogTitle id="leave-title" sx={{ fontWeight: 800, textTransform: "uppercase" }}>Leave this test?</DialogTitle>
        <DialogContent>
          <DialogContentText>Your answers so far will be lost. On the real day there is no going back either.</DialogContentText>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 1, gap: 1 }}>
          <Button color="inherit" variant="outlined" onClick={() => router.push("/tests")}>Leave</Button>
          <Button autoFocus variant="contained" onClick={() => setConfirm(false)}>Keep going</Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}

export function Stepper({ steps, current }: { steps: string[]; current: number }) {
  return (
    <ol className="mx-auto flex max-w-5xl items-center gap-2 px-4 py-2.5 sm:px-6 text-xs" aria-label="Test stages">
      {steps.map((s, i) => (
        <li key={s} aria-current={i === current ? "step" : undefined} className="flex items-center gap-2">
          <span className={`grid size-5 place-items-center rounded-full text-[10px] font-bold ${i < current ? "bg-primary text-primary-foreground" : i === current ? "border border-primary text-primary" : "border border-white/15 text-muted-foreground"}`}>
            {i < current ? <Check className="size-3" aria-hidden /> : i + 1}
          </span>
          <span className={i === current ? "font-semibold text-foreground" : "hidden text-muted-foreground sm:inline"}>{s}</span>
          {i < steps.length - 1 && <span className="mx-0.5 h-px w-4 bg-white/15 sm:mx-1 sm:w-6" aria-hidden />}
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
      <TextField
        multiline fullWidth minRows={props.rows ?? 9} autoFocus={props.autoFocus} value={props.value} placeholder={props.placeholder}
        onChange={(e) => props.onChange(e.target.value)} slotProps={{ htmlInput: { "aria-label": props.label }, input: { sx: { fontSize: { xs: "1rem", sm: "1.125rem" }, lineHeight: 1.7, p: { xs: 2, sm: 2.5 } } } }}
      />
      <p className="mt-2 text-right text-xs text-muted-foreground">{words} {words === 1 ? "word" : "words"}</p>
    </div>
  );
}

export function PrimaryButton(props: React.ComponentProps<typeof Button>) {
  return <Button variant="contained" size="large" {...props} />;
}

/* ───────────── States ───────────── */

export function EvaluatingView({ label = "Scoring your answers" }: { label?: string }) {
  return (
    <div className="grid min-h-[60vh] place-items-center text-center" role="status" aria-live="polite">
      <div>
        <CircularProgress size={64} thickness={3} aria-hidden />
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
        <LinkButton href="/tests" variant="outlined" color="inherit">Back to tests</LinkButton>
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
  extra?: ReactNode;
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
        <LinkButton href="/history" variant="outlined" color="inherit" size="large">View progress</LinkButton>
        <LinkButton href="/tests" color="inherit" size="large" sx={{ color: "text.secondary" }}>Another test</LinkButton>
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

/** Quick practice vs full (real-format) test. Labels say exactly what each mode contains. */
export function ModeSwitch(props: {
  mode: "quick" | "full";
  onChange: (m: "quick" | "full") => void;
  quick: string;
  full: string;
  note?: string;
}) {
  const opts = [
    { key: "quick" as const, title: "Quick practice", desc: props.quick },
    { key: "full" as const, title: "Full test", desc: props.full },
  ];
  return (
    <div className="mt-8 max-w-xl">
      <div role="radiogroup" aria-label="Test mode" className="grid gap-3 sm:grid-cols-2">
        {opts.map((o) => (
          <button
            key={o.key} type="button" role="radio" aria-checked={props.mode === o.key} onClick={() => props.onChange(o.key)}
            className={`min-h-11 rounded-2xl border p-4 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${props.mode === o.key ? "border-primary bg-primary/10" : "border-white/10 hover:border-white/30"}`}
          >
            <span className="block font-semibold">{o.title}</span>
            <span className="mt-1 block text-sm text-muted-foreground">{o.desc}</span>
          </button>
        ))}
      </div>
      {props.note && <p className="mt-3 text-sm text-muted-foreground">{props.note}</p>}
    </div>
  );
}

/** "Submit before the time is up?" prompt. Shows the time left so the choice is informed. */
export function SubmitEarlyDialog(props: { open: boolean; left: number; onConfirm: () => void; onCancel: () => void }) {
  return (
    <Dialog open={props.open} onClose={props.onCancel} sx={{ zIndex: 70 }} aria-labelledby="submit-early-title">
      <DialogTitle id="submit-early-title" sx={{ fontWeight: 800, textTransform: "uppercase" }}>Submit now?</DialogTitle>
      <DialogContent>
        <DialogContentText>
          You still have <b className="tabular-nums text-foreground">{fmt(props.left)}</b> left. Once you submit, you can&apos;t edit your answer.
        </DialogContentText>
      </DialogContent>
      <DialogActions sx={{ p: 3, pt: 1, gap: 1 }}>
        <Button autoFocus color="inherit" variant="outlined" onClick={props.onCancel}>Keep writing</Button>
        <Button variant="contained" onClick={props.onConfirm}>Submit</Button>
      </DialogActions>
    </Dialog>
  );
}
