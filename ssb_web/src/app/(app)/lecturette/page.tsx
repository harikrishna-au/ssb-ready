"use client";

import { useEffect, useRef, useState } from "react";
import { ExamStage, PrimaryButton, TestIntro } from "@/components/exam/ui";
import { fetchContent } from "@/lib/content";
import { useCountdown } from "@/lib/use-countdown";
import { useLeaveGuard } from "@/lib/use-leave-guard";

const SPEAK_SECONDS = 180;
const BELL_AT = 30; // seconds left

type Phase = "intro" | "choose" | "speaking" | "review";

type Recognition = {
  lang: string; continuous: boolean; interimResults: boolean;
  onresult: ((e: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
  start(): void; stop(): void;
};
const makeRecognition = (): Recognition | null => {
  const w = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
  const C = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  return C ? new C() : null;
};

const CHECKLIST = [
  "I opened with a clear line on what the topic means.",
  "I had two or three distinct points, not one repeated.",
  "I gave at least one example or fact.",
  "I linked it to India or to the armed forces where it fit.",
  "I ended with a conclusion instead of trailing off.",
  "I kept eye-line and voice steady, without fillers like 'umm'.",
];

function beep() {
  try {
    const ctx = new AudioContext();
    const o = ctx.createOscillator();
    o.frequency.value = 880;
    o.connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + 0.4);
  } catch { /* audio not available */ }
}

function Speaking({ topic, onDone }: { topic: string; onDone: (t: string) => void }) {
  const [transcript, setTranscript] = useState("");
  const rec = useRef<Recognition | null>(null);
  const text = useRef("");
  const [supported] = useState(() => (typeof window !== "undefined" ? !!makeRecognition() : false));
  const [started, setStarted] = useState(false);

  const stop = () => { rec.current?.stop(); onDone(text.current); };
  const left = useCountdown(SPEAK_SECONDS, started, stop);

  const begin = () => {
    setStarted(true);
    const r = makeRecognition();
    if (!r) return;
    r.lang = "en-IN"; r.continuous = true; r.interimResults = false;
    r.onresult = (e) => {
      for (let i = e.resultIndex; i < e.results.length; i++)
        if (e.results[i].isFinal) { text.current += ` ${e.results[i][0].transcript}`; setTranscript(text.current); }
    };
    rec.current = r;
    r.start();
  };

  useEffect(() => { if (started && left === BELL_AT) beep(); }, [started, left]);

  return (
    <ExamStage title="Lecturette" timer={started ? { left, total: SPEAK_SECONDS } : undefined}>
      <p className="text-sm text-brass">Your topic</p>
      <h2 className="mt-2 font-display text-5xl font-black uppercase leading-[0.95] sm:text-6xl">{topic}</h2>

      {!started ? (
        <div className="mt-8">
          <p className="max-w-prose text-lg leading-relaxed text-muted-foreground">
            You have three minutes. A bell sounds when 30 seconds are left. Speak out loud, as you would to the group.
            {supported ? " Your speech is transcribed in this browser so you can read it back." : " Transcription is not supported in this browser, so review will be by checklist only."}
          </p>
          <PrimaryButton className="mt-8 h-14 px-10 text-base" onClick={begin}>Start speaking</PrimaryButton>
        </div>
      ) : (
        <div className="mt-8">
          <div className="flex items-center gap-3">
            <span className={`size-3 rounded-full ${left <= BELL_AT ? "timer-urgent bg-destructive" : "bg-green-500"}`} aria-hidden />
            <p className="text-sm text-muted-foreground">{left <= BELL_AT ? "Bell rung. Wrap up with a conclusion." : "Recording. Keep going."}</p>
          </div>
          <p className="mt-6 min-h-32 max-h-64 overflow-y-auto rounded-2xl border border-white/10 bg-card/60 p-5 text-lg leading-relaxed text-muted-foreground">
            {transcript || (supported ? "Your words will appear here as you speak…" : "Transcription is unavailable here. Just speak.")}
          </p>
          <button onClick={stop} className="mt-6 inline-flex h-12 items-center rounded-full border border-white/20 px-7 font-semibold transition-colors hover:border-white/40">Finish early</button>
        </div>
      )}
    </ExamStage>
  );
}

export default function LecturettePage() {
  const [phase, setPhase] = useState<Phase>("intro");
  useLeaveGuard(phase === "speaking");
  const [options, setOptions] = useState<string[]>([]);
  const [topic, setTopic] = useState("");
  const [transcript, setTranscript] = useState("");
  const [checked, setChecked] = useState<boolean[]>(CHECKLIST.map(() => false));

  const [dealing, setDealing] = useState(false);
  const [dealError, setDealError] = useState("");
  const deal = async () => {
    setDealing(true);
    setDealError("");
    try {
      const set = await fetchContent("lecturette", 4);
      setOptions(set.items.map((i) => i.text));
      setPhase("choose");
    } catch (e) {
      setDealError(e instanceof Error ? e.message : "Could not load topics");
    } finally {
      setDealing(false);
    }
  };
  const words = transcript.trim() ? transcript.trim().split(/\s+/).length : 0;
  const done = checked.filter(Boolean).length;

  if (phase === "intro")
    return (
      <TestIntro
        kicker="GTO round" code="LECT" title="Lecturette practice"
        blurb="In the GTO round you pick one of a few topics and speak on it for about three minutes. Here you get four random topics, a clock and a bell, then check yourself against a structure."
        facts={[["Topics", "4"], ["Speak", "3 min"], ["Bell at", "2:30"], ["Review", "Checklist"]]}
        steps={["Four random topics are dealt. Pick the one you can speak on longest.", "Start the clock and speak out loud for three minutes.", "A bell sounds at 30 seconds left.", "Read your transcript and tick the structure checklist."]}
        tips={["Open by defining the topic, then make two or three distinct points.", "Back each point with a fact or example.", "Link it to India or the armed forces where it fits.", "Close with a conclusion. Do not trail off."]}
        startLabel="Deal me four topics" onStart={deal} loading={dealing} note={dealError || undefined}
      />
    );

  if (phase === "choose")
    return (
      <div className="rise">
        <h1 className="font-display text-6xl font-black uppercase leading-none">Pick one topic</h1>
        <p className="mt-3 text-muted-foreground">Choose the one you can speak on longest, not the one that sounds most impressive.</p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {options.map((t, i) => (
            <button
              key={t} onClick={() => { setTopic(t); setPhase("speaking"); }}
              className="group rounded-3xl border border-white/10 bg-card/50 p-6 text-left transition-all hover:-translate-y-1 hover:border-primary"
            >
              <span className="font-display text-5xl font-black text-white/15 transition-colors group-hover:text-primary/60">{i + 1}</span>
              <span className="mt-2 block text-xl font-semibold leading-snug">{t}</span>
            </button>
          ))}
        </div>
        <button onClick={deal} disabled={dealing} className="mt-6 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground">Deal four new topics</button>
      </div>
    );

  if (phase === "speaking")
    return <Speaking topic={topic} onDone={(t) => { setTranscript(t); setChecked(CHECKLIST.map(() => false)); setPhase("review"); }} />;

  return (
    <div className="rise space-y-8">
      <div>
        <p className="text-sm text-brass">Review</p>
        <h1 className="font-display text-5xl font-black uppercase leading-none">{topic}</h1>
      </div>
      {words > 0 && (
        <section className="rounded-3xl border border-white/[0.08] p-7">
          <p className="font-display text-6xl font-black">{words} <span className="text-xl text-muted-foreground">words</span></p>
          <p className="mt-1 text-sm text-muted-foreground">Around 300 to 450 words in three minutes is a steady pace. Much lower usually means long pauses.</p>
          <p className="mt-5 rounded-2xl bg-white/5 p-5 leading-relaxed text-muted-foreground">{transcript}</p>
        </section>
      )}
      <section className="rounded-3xl border border-white/[0.08] p-7">
        <h2 className="text-3xl font-extrabold uppercase">Be honest: tick what you did</h2>
        <div className="mt-4 grid gap-2.5">
          {CHECKLIST.map((c, i) => (
            <label key={c} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 text-sm transition-colors ${checked[i] ? "border-primary/50 bg-primary/10" : "border-white/10 hover:border-white/25"}`}>
              <input type="checkbox" className="mt-0.5 size-4 accent-[var(--primary)]" checked={checked[i]} onChange={() => setChecked(checked.map((v, k) => (k === i ? !v : v)))} />
              {c}
            </label>
          ))}
        </div>
        <p className="mt-5 text-sm text-muted-foreground">{done} of {CHECKLIST.length} ticked. {done < 4 ? "Repeat this topic and fix the unticked items first." : "Try a new topic with the same structure."}</p>
      </section>
      <PrimaryButton onClick={deal}>Practise another topic</PrimaryButton>
    </div>
  );
}
