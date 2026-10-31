"use client";

import { useRef, useState } from "react";
import { ErrorView, EvaluatingView, ExamStage, PrimaryButton, ScoreResult, TestIntro, WritingPad } from "@/components/exam/ui";
import { api } from "@/lib/api";
import { fmt, useCountdown } from "@/lib/use-countdown";
import { useLeaveGuard } from "@/lib/use-leave-guard";

const SITUATIONS = [
  "He was travelling in a bus and noticed a pickpocket stealing from an old lady. He...",
  "While leading a trekking group, the weather suddenly turned hostile with heavy rain and thunder. He...",
  "He found that his best friend was spreading rumours about him in the college. He...",
  "During a military exercise, his commanding officer collapsed due to a heat stroke. He...",
  "He noticed a child drowning in a lake and no one nearby knew how to swim. He...",
  "His team was losing badly in an inter-college debate competition with one round remaining. He...",
  "He discovered that an important exam paper had been leaked and some students had access to it. He...",
  "While driving on a highway, his car broke down in the middle of the night in an isolated area. He...",
  "He was the only officer in charge when a group of villagers came complaining about contaminated water supply. He...",
  "He received news of his selection for the academy but his family was facing a severe financial crisis. He...",
];
const TOTAL_SECONDS = 300;

type Phase = "intro" | "running" | "evaluating" | "done" | "error";
type Result = { score: number; evaluation: { identified_olqs: string[]; feedback: string } };

export default function SrtPage() {
  const [phase, setPhase] = useState<Phase>("intro");
  useLeaveGuard(phase === "running");
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

  const left = useCountdown(TOTAL_SECONDS, phase === "running", finish);

  const next = () => {
    responses.current[SITUATIONS[index]] = text.trim();
    setText("");
    if (index + 1 < SITUATIONS.length) setIndex(index + 1);
    else finish();
  };

  if (phase === "intro")
    return (
      <TestIntro
        kicker="Psychology test" code="SRT" title="Situation Reaction Test"
        blurb="You read a short situation and write what you would do. It shows how you decide: act, avoid, delegate or freeze."
        facts={[["Situations", String(SITUATIONS.length)], ["Total time", fmt(TOTAL_SECONDS)], ["Per item", "~30s"], ["Scored on", "OLQs"]]}
        steps={["One shared clock runs across every situation.", "Write what you would do, then press Next.", "Anything unanswered when time ends is recorded as blank.", "You get a score, qualities and notes on your reactions."]}
        tips={["Start with the action: what you do first.", "Name who you involve and what you do after.", "Avoid vague lines like 'he will handle it'.", "Keep moving. A blank hurts more than a short answer."]}
        onStart={() => { responses.current = {}; setIndex(0); setText(""); setPhase("running"); }}
      />
    );

  if (phase === "running")
    return (
      <ExamStage title="Situation Reaction Test" progress={{ current: index + 1, total: SITUATIONS.length }} timer={{ left, total: TOTAL_SECONDS }}>
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
  if (phase === "error") return <ErrorView message={error} onRetry={finish} />;

  return (
    <ScoreResult
      title="Situation Reaction Test" score={result?.score ?? 0}
      olqs={result?.evaluation.identified_olqs} markdown={result?.evaluation.feedback ?? ""} onRetry={() => setPhase("intro")}
    />
  );
}
