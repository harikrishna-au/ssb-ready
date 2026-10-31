"use client";

import { useRef, useState } from "react";
import { ErrorView, EvaluatingView, ExamStage, ModeSwitch, PrimaryButton, ScoreResult, TestIntro, WritingPad } from "@/components/exam/ui";
import { api } from "@/lib/api";
import { fetchContent } from "@/lib/content";
import { useMode } from "@/lib/modes";
import { fmt, useCountdown } from "@/lib/use-countdown";
import { useLeaveGuard } from "@/lib/use-leave-guard";

const FORMATS = { quick: { count: 10, seconds: 300 }, full: { count: 60, seconds: 1800 } } as const;

type Phase = "intro" | "running" | "evaluating" | "done" | "error";
type Result = { score: number; evaluation: { identified_olqs: string[]; feedback: string } };

export default function SrtPage() {
  const [phase, setPhase] = useState<Phase>("intro");
  useLeaveGuard(phase === "running");
  const [mode, setMode, premium] = useMode();
  const [SITUATIONS, setSituations] = useState<string[]>([]);
  const [totalSeconds, setTotalSeconds] = useState<number>(FORMATS.quick.seconds);
  const [starting, setStarting] = useState(false);
  const [index, setIndex] = useState(0);
  const [text, setText] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");
  const responses = useRef<Record<string, string>>({});

  const finish = async () => {
    // Unanswered situations are recorded as empty, like the mobile app.
    for (const s of SITUATIONS) responses.current[s] ??= "";
    setPhase("evaluating");
    try {
      setResult(await api.post<Result>("/api/evaluation/run", { testType: "SRT", payload: { responses: responses.current } }));
      setPhase("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Evaluation failed");
      setPhase("error");
    }
  };

  const left = useCountdown(totalSeconds, phase === "running", finish);

  const next = () => {
    responses.current[SITUATIONS[index]] = text.trim();
    setText("");
    if (index + 1 < SITUATIONS.length) setIndex(index + 1);
    else finish();
  };

  const start = async () => {
    setStarting(true);
    try {
      const f = FORMATS[mode];
      const set = await fetchContent("srt", f.count);
      setSituations(set.items.map((i) => i.text));
      setTotalSeconds(f.seconds);
      responses.current = {}; setIndex(0); setText(""); setPhase("running");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load situations");
      setPhase("error");
    } finally {
      setStarting(false);
    }
  };

  if (phase === "intro")
    return (
      <TestIntro
        kicker="Psychology test" code="SRT" title="Situation Reaction Test"
        blurb="You read a short situation and write what you would do. It shows how you decide: act, avoid, delegate or freeze."
        facts={[["Situations", String(FORMATS[mode].count)], ["Total time", fmt(FORMATS[mode].seconds)], ["Per item", "~30s"], ["Scored on", "OLQs"]]}
        steps={["One shared clock runs across every situation.", "Write what you would do, then press Next.", "Anything unanswered when time ends is recorded as blank.", "You get a score, qualities and notes on your reactions."]}
        tips={["Start with the action: what you do first.", "Name who you involve and what you do after.", "Avoid vague lines like 'he will handle it'.", "Keep moving. A blank hurts more than a short answer."]}
        onStart={start} loading={starting}
        extra={<ModeSwitch mode={mode} onChange={setMode} quick="10 situations in 5 minutes" full="60 situations in 30 minutes. The real format." note={premium === false ? "Full test is the default for Lifetime accounts. You can still try it here." : undefined} />}
      />
    );

  if (phase === "running")
    return (
      <ExamStage title="Situation Reaction Test" progress={{ current: index + 1, total: SITUATIONS.length }} timer={{ left, total: totalSeconds }}>
        <p className="font-display text-4xl font-black leading-tight sm:text-5xl">{SITUATIONS[index]}</p>
        <div className="mt-8">
          <WritingPad autoFocus rows={5} label="What you would do" value={text} onChange={setText} placeholder="He…" />
        </div>
        <div className="mt-5 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Be specific and brief.</p>
          <PrimaryButton onClick={next}>{index + 1 < SITUATIONS.length ? "Next situation" : "Finish and score"}</PrimaryButton>
        </div>
      </ExamStage>
    );

  if (phase === "evaluating") return <EvaluatingView />;
  if (phase === "error") return <ErrorView message={error} onRetry={SITUATIONS.length ? finish : () => setPhase("intro")} />;

  return (
    <ScoreResult
      title="Situation Reaction Test" score={result?.score ?? 0}
      olqs={result?.evaluation.identified_olqs} markdown={result?.evaluation.feedback ?? ""} onRetry={() => setPhase("intro")}
    />
  );
}
