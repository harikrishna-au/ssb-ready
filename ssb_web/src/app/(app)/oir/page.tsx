"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect, useState } from "react";
import { ErrorView, EvaluatingView, ExamStage, PrimaryButton, ScoreResult, TestIntro } from "@/components/exam/ui";
import { api } from "@/lib/api";
import { fmt, useCountdown, useLatest } from "@/lib/use-countdown";
import { useLeaveGuard } from "@/lib/use-leave-guard";

type Question = {
  id: string;
  text: string;
  options: string[];
  correct_answer_index: number;
  image_url: string | null;
  explanation: string | null;
};
type Phase = "loading" | "intro" | "running" | "analyzing" | "done" | "error";
const TOTAL_SECONDS = 600;
const LETTERS = ["A", "B", "C", "D", "E", "F"];

export default function OirPage() {
  const [phase, setPhase] = useState<Phase>("loading");
  useLeaveGuard(phase === "running");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState("");
  const scoreRef = useLatest(score);

  const fetchQuestions = () =>
    api
      .get<{ data: Question[] }>("/api/firestore/oir/questions")
      .then((r) => { setQuestions(r.data); setPhase("intro"); })
      .catch((e) => { setError(e instanceof Error ? e.message : "Could not load questions"); setPhase("error"); });
  const retry = () => { setPhase("loading"); void fetchQuestions(); };
  useEffect(() => { void fetchQuestions(); }, []);

  const finish = async (finalScore = scoreRef.current) => {
    setPhase("analyzing");
    try {
      const r = await api.post<{ feedbackMarkdown?: string }>("/api/evaluation/run", {
        testType: "OIR",
        payload: { score: finalScore, totalQuestions: questions.length },
      });
      setFeedback(r.feedbackMarkdown ?? null);
    } catch {
      setFeedback(null); // the result is still shown, like the mobile app
    }
    setPhase("done");
  };

  const left = useCountdown(TOTAL_SECONDS, phase === "running", () => finish());
  const q = questions[index];

  const answer = (i: number) => {
    if (picked !== null || !q) return;
    setPicked(i);
    if (i === q.correct_answer_index) setScore((s) => s + 1);
  };
  const next = () => {
    setPicked(null);
    if (index + 1 < questions.length) setIndex(index + 1);
    else finish(scoreRef.current);
  };

  // Keyboard: A–D or 1–4 to answer, Enter for next.
  const onKey = useLatest((e: KeyboardEvent) => {
    if (phase !== "running" || !q) return;
    const n = "abcdef".indexOf(e.key.toLowerCase());
    const d = Number(e.key) - 1;
    const i = n >= 0 ? n : d >= 0 ? d : -1;
    if (i >= 0 && i < q.options.length) answer(i);
    if (e.key === "Enter" && picked !== null) next();
  });
  useEffect(() => {
    const h = (e: KeyboardEvent) => onKey.current(e);
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onKey]);

  if (phase === "loading") return <div className="h-72 animate-pulse rounded-3xl bg-white/5" role="status" aria-label="Loading questions" />;
  if (phase === "error") return <ErrorView message={error} onRetry={retry} />;
  if (phase === "analyzing") return <EvaluatingView label="Totalling your score" />;

  if (phase === "intro")
    return (
      <TestIntro
        kicker="Screening round" code="OIR" title="Officer Intelligence Rating"
        blurb="Reasoning questions on a clock. Each one is easy on its own. The difficulty is doing enough of them in the time."
        facts={[["Questions", String(questions.length)], ["Time", fmt(TOTAL_SECONDS)], ["Format", "MCQ"], ["Round", "Day 1"]]}
        steps={["One shared clock covers every question.", "Choose an option. You see at once whether it was right.", "Press Next to continue. Unfinished questions score zero.", "You get your total and a short breakdown."]}
        tips={["Skip a question after about 30 seconds and move on.", "Use A–D or 1–4 on your keyboard, and Enter for next.", "Learn the common non-verbal patterns: rotation, mirror image, add and remove.", "Do not leave questions blank when a guess is possible."]}
        onStart={() => { setIndex(0); setScore(0); setPicked(null); setPhase("running"); }}
      />
    );

  if (phase === "running" && q)
    return (
      <ExamStage title="Officer Intelligence Rating" progress={{ current: index + 1, total: questions.length }} timer={{ left, total: TOTAL_SECONDS }}>
        <h2 className="text-2xl font-semibold leading-snug sm:text-3xl">{q.text}</h2>
        {q.image_url && <img src={q.image_url} alt="Question figure" className="mt-6 max-h-72 rounded-2xl border border-white/10 bg-white p-2" />}
        <div className="mt-7 grid gap-3" role="group" aria-label="Answer options">
          {q.options.map((o, i) => {
            const correct = picked !== null && i === q.correct_answer_index;
            const wrong = picked === i && i !== q.correct_answer_index;
            return (
              <button
                key={i} onClick={() => answer(i)} disabled={picked !== null}
                className={`flex items-center gap-4 rounded-2xl border p-4 text-left text-lg transition-all ${
                  correct ? "border-green-500 bg-green-500/10" : wrong ? "border-destructive bg-destructive/10" : picked !== null ? "border-white/10 opacity-50" : "border-white/10 bg-card/50 hover:-translate-y-0.5 hover:border-primary"
                }`}
              >
                <span className={`grid size-9 shrink-0 place-items-center rounded-full text-sm font-bold ${correct ? "bg-green-500 text-black" : wrong ? "bg-destructive text-white" : "bg-white/10"}`}>{LETTERS[i]}</span>
                {o}
              </button>
            );
          })}
        </div>
        {picked !== null && (
          <div className="rise mt-6 space-y-4">
            {q.explanation && <p className="rounded-xl bg-white/5 p-4 text-sm leading-relaxed text-muted-foreground">{q.explanation}</p>}
            <PrimaryButton onClick={next}>{index + 1 < questions.length ? "Next question" : "Finish"}</PrimaryButton>
          </div>
        )}
      </ExamStage>
    );

  return (
    <ScoreResult
      title="Officer Intelligence Rating" score={score} outOf={questions.length || 1}
      markdown={feedback ?? `You answered ${score} of ${questions.length} correctly.`}
      onRetry={() => setPhase("intro")}
    />
  );
}
