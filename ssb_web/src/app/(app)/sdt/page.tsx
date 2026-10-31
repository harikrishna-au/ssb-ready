"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { ErrorView, EvaluatingView, ExamStage, ModeSwitch, PrimaryButton, TestIntro, WritingPad } from "@/components/exam/ui";
import { Markdown } from "@/components/markdown";
import { api } from "@/lib/api";
import { useMode } from "@/lib/modes";
import { useCountdown } from "@/lib/use-countdown";
import { useLeaveGuard } from "@/lib/use-leave-guard";

const PERSPECTIVES = [
  { key: "parents", icon: "👨‍👩‍👦", title: "Your parents or guardians", prompt: "How do they describe you? Your qualities, habits, strengths and what they feel you can improve." },
  { key: "teachers", icon: "🎓", title: "Your teachers or superiors", prompt: "How do they describe you academically, professionally and as a person?" },
  { key: "friends", icon: "🤝", title: "Your friends", prompt: "How do close friends describe your personality and how you behave in a group?" },
  { key: "subordinates", icon: "⭐", title: "Your juniors or team", prompt: "How do people who look up to you describe your leadership and personality?" },
  { key: "self", icon: "🪞", title: "How you see yourself", prompt: "An honest self-description: strengths, weaknesses, values and what you are working on." },
];
/** Per paragraph. Full test = the real format, about 15 minutes in total. */
const SECONDS_EACH = { quick: 300, full: 180 } as const;

type Phase = "intro" | "writing" | "analyzing" | "done" | "error";

export default function SdtPage() {
  const [phase, setPhase] = useState<Phase>("intro");
  useLeaveGuard(phase === "writing");
  const [mode, setMode, premium] = useMode();
  const [runMode, setRunMode] = useState<"quick" | "full">("quick");
  const [index, setIndex] = useState(0);
  const [text, setText] = useState("");
  const [analysis, setAnalysis] = useState("");
  const [error, setError] = useState("");
  const responses = useRef<Record<string, string>>({});

  const analyze = async () => {
    setPhase("analyzing");
    try {
      const r = await api.post<{ analysis: string }>("/api/evaluation/run", { testType: "SDT", payload: { responses: responses.current } });
      setAnalysis(r.analysis);
      setPhase("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Analysis failed");
      setPhase("error");
    }
  };

  const advance = () => {
    responses.current[PERSPECTIVES[index].key] = text.trim();
    setText("");
    if (index + 1 < PERSPECTIVES.length) setIndex(index + 1);
    else analyze();
  };

  const left = useCountdown(SECONDS_EACH[runMode], phase === "writing", advance, index);

  if (phase === "intro")
    return (
      <TestIntro
        kicker="Psychology test" code="SDT" title="Self Description Test"
        blurb="Describe yourself through five sets of eyes. Assessors read all five together, so honesty and consistency matter more than flattery."
        facts={[["Perspectives", "5"], ["Each", `${SECONDS_EACH[mode] / 60} min`], ["Total", `${(SECONDS_EACH[mode] * 5) / 60} min`], ["Output", "Analysis"]]}
        steps={["Five prompts, one after another, each with its own clock.", "Write in your own words. Give examples.", "When a clock ends your text moves on automatically.", "You get an analysis of consistency, qualities and red flags."]}
        tips={["Describe the same core person from each angle.", "Include one real weakness and what you do about it.", "Back every quality with a short example.", "The real test is about 15 minutes in total. Full test mode matches that; quick practice gives more time per paragraph."]}
        extra={<ModeSwitch mode={mode} onChange={setMode} quick="5 minutes per paragraph, 25 minutes in total. Extra time to think." full="3 minutes per paragraph, 15 minutes in total. The real format." note={premium === false ? "Full test is the default for Lifetime accounts. You can still try it here." : undefined} />}
        onStart={() => { setRunMode(mode); responses.current = {}; setIndex(0); setText(""); setPhase("writing"); }}
      />
    );

  if (phase === "writing") {
    const p = PERSPECTIVES[index];
    return (
      <ExamStage title="Self Description Test" progress={{ current: index + 1, total: PERSPECTIVES.length }} timer={{ left, total: SECONDS_EACH[runMode] }}>
        <p className="text-4xl" aria-hidden>{p.icon}</p>
        <h2 className="mt-2 font-display text-5xl font-black uppercase leading-none">{p.title}</h2>
        <p className="mt-3 text-muted-foreground">{p.prompt}</p>
        <div className="mt-6"><WritingPad autoFocus rows={10} label={p.title} value={text} onChange={setText} placeholder="Start writing…" /></div>
        <div className="mt-5 flex justify-end">
          <PrimaryButton onClick={advance}>{index + 1 < PERSPECTIVES.length ? "Next perspective" : "Finish and analyse"}</PrimaryButton>
        </div>
      </ExamStage>
    );
  }

  if (phase === "analyzing") return <EvaluatingView label="Analysing your self-description" />;
  if (phase === "error") return <ErrorView message={error} onRetry={analyze} />;

  return <AnalysisResult analysis={analysis} onRetry={() => setPhase("intro")} />;
}

/** SDT returns an analysis, not a number, so it gets a result page without a dial. */
function AnalysisResult({ analysis, onRetry }: { analysis: string; onRetry: () => void }) {
  return (
    <div className="rise space-y-8">
      <Link href="/tests" className="text-sm text-muted-foreground hover:text-foreground">← All tests</Link>
      <section className="rounded-3xl border border-white/[0.08] bg-card/60 p-7 md:p-10">
        <p className="text-sm text-brass">Self Description Test</p>
        <h1 className="font-display text-6xl font-black uppercase leading-none">Your analysis</h1>
        <div className="mt-6"><Markdown>{analysis}</Markdown></div>
      </section>
      <div className="flex flex-wrap gap-3">
        <PrimaryButton onClick={onRetry}>Try again</PrimaryButton>
        <Link href="/tests" className="inline-flex h-12 items-center rounded-full border border-white/20 px-7 font-semibold hover:border-white/40">Another test</Link>
      </div>
      <p className="text-xs text-muted-foreground">AI analysis helps you practise. It is not an official assessment.</p>
    </div>
  );
}
