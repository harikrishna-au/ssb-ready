"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

const WORDS = ["Leader", "Failure", "Courage"];
const SECONDS = 15;

/** A real, playable slice of the WAT so visitors feel the clock before signing up. */
export function WatDemo() {
  const [i, setI] = useState(0);
  const [left, setLeft] = useState(SECONDS);
  const [text, setText] = useState("");
  const [answers, setAnswers] = useState<string[]>([]);
  const done = answers.length === WORDS.length;
  const input = useRef<HTMLInputElement>(null);

  const next = (value: string) => {
    setAnswers((a) => [...a, value.trim()]);
    setText("");
    setLeft(SECONDS);
    setI((n) => Math.min(n + 1, WORDS.length - 1));
    input.current?.focus();
  };

  useEffect(() => {
    if (done) return;
    if (left <= 0) {
      const t = setTimeout(() => next(text), 0);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [left, done]);

  const r = 54;
  const circ = 2 * Math.PI * r;

  return (
    <div className="w-full max-w-md rounded-2xl border border-white/10 bg-card p-6 shadow-2xl shadow-black/40" aria-label="Playable word association demo">
      {!done ? (
        <>
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Word {i + 1} of {WORDS.length}</span>
            <span>Try it. This is the real format.</span>
          </div>
          <div className="relative mx-auto my-6 grid size-36 place-items-center">
            <svg viewBox="0 0 120 120" className="absolute inset-0 -rotate-90" aria-hidden>
              <circle cx="60" cy="60" r={r} fill="none" stroke="currentColor" strokeOpacity="0.12" strokeWidth="6" />
              <circle
                cx="60" cy="60" r={r} fill="none" stroke="var(--brass)" strokeWidth="6" strokeLinecap="round"
                strokeDasharray={circ} strokeDashoffset={circ * (1 - left / SECONDS)}
                style={{ transition: "stroke-dashoffset 1s linear" }}
              />
            </svg>
            <span className="font-display text-5xl font-black tabular-nums text-brass" aria-live="off">{left}</span>
          </div>
          <p className="text-center font-display text-5xl font-black uppercase tracking-wide">{WORDS[i]}</p>
          <form
            className="mt-6 flex gap-2"
            onSubmit={(e) => { e.preventDefault(); next(text); }}
          >
            <input
              ref={input}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Write the first sentence that comes to mind"
              aria-label={`Sentence for the word ${WORDS[i]}`}
              className="min-w-0 flex-1 rounded-lg border border-white/15 bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
            />
            <button className="rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground">Next</button>
          </form>
        </>
      ) : (
        <div className="space-y-4 py-2">
          <h3 className="text-3xl font-black">That took about {WORDS.length * SECONDS} seconds at most.</h3>
          <ul className="space-y-1 text-sm text-muted-foreground">
            {WORDS.map((w, k) => (
              <li key={w}><span className="font-semibold text-foreground">{w}:</span> {answers[k] || "no answer"}</li>
            ))}
          </ul>
          <p className="text-sm text-muted-foreground">
            The full test has 15 words. Sign up free to get your answers scored against Officer Like Qualities.
          </p>
          <Link href="/sign-up" className="inline-flex rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground">
            Take the full WAT free
          </Link>
        </div>
      )}
    </div>
  );
}
