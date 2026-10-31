"use client";

/* eslint-disable @next/next/no-img-element */
import { useState } from "react";
import { ErrorView, EvaluatingView, ExamStage, ImageMatch, PrimaryButton, ScoreResult, TestIntro, WritingPad } from "@/components/exam/ui";
import { Leaderboard, type LeaderboardRow } from "@/components/leaderboard";
import { api } from "@/lib/api";
import { fetchPictures, type Alignment, type Picture } from "@/lib/images";
import { useCountdown, useLatest } from "@/lib/use-countdown";
import { useLeaveGuard } from "@/lib/use-leave-guard";

type Phase = "intro" | "observe" | "perception" | "write" | "evaluating" | "done" | "error";
type Result = { analysisMarkdown: string; score: number; leaderboard: LeaderboardRow[]; alignment: Alignment | null };

const STEPS = ["Observe", "Note", "Write"];
const SECONDS = { observe: 30, perception: 60, write: 240 } as const;
const FIELDS: [key: "summary" | "positive" | "negative" | "neutral", label: string, hint: string][] = [
  ["summary", "What is the situation?", "One line on what is happening."],
  ["positive", "Positive characters", "Who helps or acts well?"],
  ["negative", "Negative characters", "Who causes the problem?"],
  ["neutral", "Neutral characters", "Who is just present?"],
];

export default function PpdtPage() {
  const [phase, setPhase] = useState<Phase>("intro");
  useLeaveGuard(phase === "observe" || phase === "perception" || phase === "write");
  const [picture, setPicture] = useState<Picture | null>(null);
  const [starting, setStarting] = useState(false);
  const [notes, setNotes] = useState({ summary: "", positive: "", negative: "", neutral: "" });
  const [story, setStory] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");
  const storyRef = useLatest(story);
  const notesRef = useLatest(notes);

  const submit = async () => {
    const text = storyRef.current.trim();
    if (!text) {
      setError("Write your story before submitting.");
      setPhase("error");
      return;
    }
    setPhase("evaluating");
    try {
      const n = notesRef.current;
      setResult(
        await api.post<Result>("/api/ppdt/pipeline", {
          imageId: picture?.id,
          imageUrl: picture?.url,
          imageToken: picture?.token,
          storyMode: "typing",
          storyText: text,
          perception: { situationSummary: n.summary, positiveCharacters: n.positive, negativeCharacters: n.negative, neutralCharacters: n.neutral, sketchNotes: "" },
        }),
      );
      setPhase("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Evaluation failed");
      setPhase("error");
    }
  };

  const running = phase === "observe" || phase === "perception" || phase === "write";
  const secs = phase === "observe" ? SECONDS.observe : phase === "perception" ? SECONDS.perception : SECONDS.write;
  const onEnd = () => {
    if (phase === "observe") setPhase("perception");
    else if (phase === "perception") setPhase("write");
    else if (phase === "write") void submit();
  };
  const left = useCountdown(secs, running, onEnd, phase === "observe" ? 1 : phase === "perception" ? 2 : 3);
  const stepIndex = phase === "observe" ? 0 : phase === "perception" ? 1 : 2;

  const start = async () => {
    setStarting(true);
    try {
      const { data } = await fetchPictures("ppdt", 1);
      setPicture(data[0]);
      setNotes({ summary: "", positive: "", negative: "", neutral: "" });
      setStory("");
      setPhase("observe");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load a picture");
      setPhase("error");
    } finally {
      setStarting(false);
    }
  };

  if (phase === "intro")
    return (
      <TestIntro
        kicker="Screening round" code="PPDT" title="Picture Perception & Discussion Test"
        blurb="You see a hazy picture briefly, note what you perceive, then write a story. It is the first test where assessors read how you think, so the story matters more than the picture."
        facts={[["Observe", "30s"], ["Note", "60s"], ["Write", "4 min"], ["Round", "Day 1"]]}
        steps={["Look at the picture. Decide the mood and the characters.", "Note the situation and who is positive, negative or neutral.", "Write a story with a past, a present problem and a future outcome.", "Submit for a score and written feedback."]}
        tips={["Make the hero active. Heroes who wait for help score worse.", "End with a constructive action, not luck.", "Keep to two or three characters. Four minutes is short.", "Finish the ending. Running out of time before it costs the most."]}
        onStart={start} loading={starting}
      />
    );

  if (running)
    return (
      <ExamStage
        title="Picture Perception & Discussion Test" wide={phase === "observe"}
        timer={{ left, total: secs }} stepper={{ steps: STEPS, current: stepIndex }}
      >
        {phase === "observe" && (
          <div className="text-center">
            <img src={picture?.url} alt="Test picture" className="mx-auto max-h-[62vh] rounded-3xl border border-white/10 shadow-2xl shadow-black/50" />
            <p className="mt-5 text-muted-foreground">Note the characters, their mood and the setting. The picture will disappear.</p>
          </div>
        )}

        {phase === "perception" && (
          <div>
            <h2 className="font-display text-5xl font-black uppercase leading-none">What did you perceive?</h2>
            <p className="mt-2 text-muted-foreground">Quick notes. These help your story and are sent with it for feedback.</p>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {FIELDS.map(([k, label, hint], i) => (
                <label key={k} className={i === 0 ? "sm:col-span-2" : ""}>
                  <span className="text-sm font-semibold">{label}</span>
                  <input
                    autoFocus={i === 0} value={notes[k]} onChange={(e) => setNotes({ ...notes, [k]: e.target.value })} placeholder={hint}
                    className="mt-1.5 h-12 w-full rounded-xl border border-white/10 bg-card/60 px-4 outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary"
                  />
                </label>
              ))}
            </div>
            <div className="mt-6 flex justify-end"><PrimaryButton onClick={() => setPhase("write")}>Start writing</PrimaryButton></div>
          </div>
        )}

        {phase === "write" && (
          <div>
            <h2 className="font-display text-5xl font-black uppercase leading-none">Write your story</h2>
            <p className="mt-2 text-muted-foreground">Past, present problem, future outcome. Let your hero act.</p>
            <div className="mt-6"><WritingPad autoFocus rows={11} label="Your story" value={story} onChange={setStory} placeholder="Start writing…" /></div>
            <div className="mt-5 flex justify-end"><PrimaryButton onClick={submit}>Submit story</PrimaryButton></div>
          </div>
        )}
      </ExamStage>
    );

  if (phase === "evaluating") return <EvaluatingView label="Reading your story" />;
  if (phase === "error") return <ErrorView message={error} onRetry={() => setPhase(story.trim() ? "write" : "intro")} />;

  return (
    <ScoreResult
      title="Picture Perception & Discussion Test" score={result?.score ?? 0} markdown={result?.analysisMarkdown ?? ""}
      extra={<><ImageMatch imageUrl={picture?.url} alignment={result?.alignment} /><Leaderboard rows={result?.leaderboard ?? []} /></>} onRetry={() => setPhase("intro")} retryLabel="Try another picture"
    />
  );
}
