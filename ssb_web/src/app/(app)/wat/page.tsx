"use client";

import { useCallback, useRef, useState } from "react";
import { ErrorView, EvaluatingView, ExamStage, ModeSwitch, ScoreResult, TestIntro, TimerRing } from "@/components/exam/ui";
import { api } from "@/lib/api";
import { fetchContent } from "@/lib/content";
import { useMode } from "@/lib/modes";
import { useCountdown } from "@/lib/use-countdown";
import { useLeaveGuard } from "@/lib/use-leave-guard";

const COUNTS = { quick: 15, full: 60 } as const;
const SECONDS_PER_WORD = 15;

type Evaluation = { score: number; identified_olqs: string[]; feedback: string };
type Phase = "intro" | "running" | "evaluating" | "done" | "error";

export default function WatPage() {
  const [phase, setPhase] = useState<Phase>("intro");
  useLeaveGuard(phase === "running");
  const [mode, setMode, premium] = useMode();
  const [words, setWords] = useState<string[]>([]);
  const [starting, setStarting] = useState(false);
  const WORDS = words;
  const [index, setIndex] = useState(0);
  const [sentence, setSentence] = useState("");
  const [result, setResult] = useState<Evaluation | null>(null);
  const [error, setError] = useState("");
  const responses = useRef<Record<string, string>>({});

  const submit = useCallback(async () => {
    setPhase("evaluating");
    try {
      const r = await api.post<{ evaluation: Evaluation }>("/api/evaluation/run", {
        testType: "WAT",
        payload: { responses: responses.current },
      });
      setResult(r.evaluation);
      setPhase("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Evaluation failed");
      setPhase("error");
    }
  }, []);

  const next = useCallback(() => {
    responses.current[WORDS[index]] = sentence.trim();
    setSentence("");
    if (index + 1 < WORDS.length) setIndex(index + 1);
    else submit();
  }, [index, sentence, submit, WORDS]);

  const left = useCountdown(SECONDS_PER_WORD, phase === "running", next, index);

  const start = async () => {
    setStarting(true);
    try {
      const set = await fetchContent("wat", COUNTS[mode]);
      setWords(set.items.map((i) => i.text));
      responses.current = {}; setIndex(0); setSentence(""); setPhase("running");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load words");
      setPhase("error");
    } finally {
      setStarting(false);
    }
  };

  if (phase === "intro")
    return (
      <TestIntro
        kicker="Psychology test" code="WAT" title="Word Association Test"
        blurb="A word appears. You write the first meaningful sentence that comes to mind before it disappears. It reads your spontaneous thinking, so there is no time to plan."
        facts={[["Words", String(COUNTS[mode])], ["Per word", `${SECONDS_PER_WORD}s`], ["Total", mode === "full" ? "15 min" : "~4 min"], ["Scored on", "OLQs"]]}
        steps={["A word is shown with a 15-second clock.", "Type one complete sentence and press Enter.", "When time runs out your sentence is taken as it stands.", "After the last word you get a score and feedback."]}
        tips={["Write a full sentence, not a single word.", "Keep it short, positive and active.", "Never leave a word blank. A plain sentence beats a gap.", "Full test mode matches the real test: 60 words at 15 seconds each."]}
        onStart={start} loading={starting}
        extra={<ModeSwitch mode={mode} onChange={setMode} quick="15 words, about 4 minutes" full="60 words, 15 seconds each, about 15 minutes. The real format." note={premium === false ? "Full test is the default for Lifetime accounts. You can still try it here." : undefined} />}
      />
    );

  if (phase === "running")
    return (
      <ExamStage title="Word Association Test" progress={{ current: index + 1, total: WORDS.length }}>
        <div className="text-center">
          <TimerRing left={left} total={SECONDS_PER_WORD} />
          <p className="mt-6 font-display text-8xl font-black uppercase leading-none tracking-wide sm:text-9xl">{WORDS[index]}</p>
          <form className="mx-auto mt-10 max-w-xl" onSubmit={(e) => { e.preventDefault(); next(); }}>
            <input
              autoFocus value={sentence} onChange={(e) => setSentence(e.target.value)}
              aria-label={`Your sentence for ${WORDS[index]}`} placeholder="Write your sentence…" autoComplete="off"
              className="h-16 w-full rounded-2xl border border-white/10 bg-card/60 px-5 text-center text-xl outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary"
            />
            <p className="mt-3 text-sm text-muted-foreground">Press <kbd className="rounded border border-white/20 px-1.5 py-0.5 text-xs">Enter</kbd> for the next word</p>
          </form>
        </div>
      </ExamStage>
    );

  if (phase === "evaluating") return <EvaluatingView />;
  if (phase === "error") return <ErrorView message={error} onRetry={words.length ? submit : () => setPhase("intro")} />;

  return (
    <ScoreResult
      title="Word Association Test" score={result?.score ?? 0}
      olqs={result?.identified_olqs} markdown={result?.feedback ?? ""} onRetry={() => setPhase("intro")}
    />
  );
}
