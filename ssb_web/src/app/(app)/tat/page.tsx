"use client";

/* eslint-disable @next/next/no-img-element */
import { useRef, useState } from "react";
import { ErrorView, EvaluatingView, ExamStage, ImageMatch, PrimaryButton, TestIntro, WritingPad } from "@/components/exam/ui";
import { Markdown } from "@/components/markdown";
import { api } from "@/lib/api";
import { fetchPictures, type Alignment, type Picture } from "@/lib/images";
import { useCountdown, useLatest } from "@/lib/use-countdown";
import { useLeaveGuard } from "@/lib/use-leave-guard";
import { usePremium } from "@/lib/use-premium";

type Eval = { analysisMarkdown: string; score: number; alignment: Alignment | null };
const CARDS = 12;
type Phase = "intro" | "view" | "write" | "waiting" | "done" | "error";
const VIEW = 30;
const WRITE = 240;

export default function TatPage() {
  const access = usePremium();
  const [cards, setCards] = useState<Picture[]>([]);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");
  const [phase, setPhase] = useState<Phase>("intro");
  useLeaveGuard(phase === "view" || phase === "write");
  const [index, setIndex] = useState(0);
  const [story, setStory] = useState("");
  const [results, setResults] = useState<(Eval | string | undefined)[]>([]);
  const pending = useRef<Promise<void>[]>([]);
  const storyRef = useLatest(story);
  const indexRef = useLatest(index);
  const cardsRef = useLatest(cards);

  const finishCard = () => {
    const i = indexRef.current;
    const text = storyRef.current.trim();
    if (text) {
      pending.current.push(
        api
          .post<Eval>("/api/tat/pipeline", {
            imageId: cardsRef.current[i].id, imageIndex: i, storyMode: "typing", storyText: text, perception: {},
          })
          .then((r) => setResults((p) => { const n = [...p]; n[i] = r; return n; }))
          .catch((e) => setResults((p) => { const n = [...p]; n[i] = String(e?.message ?? e); return n; })),
      );
    }
    setStory("");
    if (i + 1 < cardsRef.current.length) {
      setIndex(i + 1);
      setPhase("view");
    } else {
      setPhase("waiting");
      Promise.all(pending.current).then(() => setPhase("done"));
    }
  };

  const running = phase === "view" || phase === "write";
  const secs = phase === "view" ? VIEW : WRITE;
  const left = useCountdown(secs, running, () => (phase === "view" ? setPhase("write") : finishCard()), index * 2 + (phase === "view" ? 0 : 1));

  const start = async () => {
    setStarting(true);
    try {
      const set = await fetchPictures("tat", CARDS);
      setCards(set.data);
      setResults([]);
      pending.current = [];
      setIndex(0);
      setStory("");
      setPhase("view");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load pictures");
      setPhase("error");
    } finally {
      setStarting(false);
    }
  };

  if (phase === "intro")
    return (
      <TestIntro
        kicker="Psychology test" code="TAT" title="Thematic Apperception Test"
        blurb="Pictures, one at a time. For each, you write a story. The stories are read together, so your habits as a writer show up across all of them."
        facts={[["Pictures", "5–12"], ["Look", "30s"], ["Write", "4 min each"], ["Scored on", "OLQs"]]}
        steps={["A picture is shown for 30 seconds.", "It disappears and you write a story in 4 minutes.", "Move on, or the next picture arrives when time ends.", "After the last one, each story is scored."]}
        tips={["Use situation, problem, action, outcome for every story.", "Show qualities through what the hero does. Do not list them.", "Avoid revenge, luck and giving up as endings.", ...(access.loading ? [] : [access.premium ? "You have Lifetime access, so your pictures come from the full bank." : "Free accounts get 5 pictures per set; Lifetime access unlocks the full bank."])]}
        onStart={start} loading={starting}
      />
    );

  if (phase === "view" || phase === "write") {
    const c = cards[index];
    return (
      <ExamStage
        title="Thematic Apperception Test" wide={phase === "view"}
        progress={{ current: index + 1, total: cards.length }} timer={{ left, total: secs }}
        stepper={{ steps: ["Look", "Write"], current: phase === "view" ? 0 : 1 }}
      >
        {phase === "view" ? (
          <div className="text-center">
            <img src={c.url} alt={`Picture ${index + 1}`} className="mx-auto max-h-[62vh] rounded-3xl border border-white/10 shadow-2xl shadow-black/50" />
            <p className="mt-5 text-muted-foreground">Decide who the hero is and what the problem is.</p>
          </div>
        ) : (
          <div>
            <h2 className="font-display text-5xl font-black uppercase leading-none">Story {index + 1}</h2>
            <p className="mt-2 text-muted-foreground">Situation, problem, action, outcome.</p>
            <div className="mt-6"><WritingPad autoFocus rows={11} label={`Story ${index + 1}`} value={story} onChange={setStory} placeholder="Write your story…" /></div>
            <div className="mt-5 flex justify-end">
              <PrimaryButton onClick={finishCard}>{index + 1 < cards.length ? "Next picture" : "Finish and score"}</PrimaryButton>
            </div>
          </div>
        )}
      </ExamStage>
    );
  }

  if (phase === "error") return <ErrorView message={error} onRetry={() => setPhase("intro")} />;

  if (phase === "waiting") return <EvaluatingView label="Reading your stories" />;

  const scored = results.filter((r): r is Eval => !!r && typeof r !== "string");
  const avg = scored.length ? (scored.reduce((a, r) => a + r.score, 0) / scored.length).toFixed(1) : "–";

  return (
    <div className="rise space-y-8">
      <section className="rounded-3xl border border-white/[0.08] bg-card/60 p-7 md:p-10">
        <p className="text-sm text-brass">Thematic Apperception Test</p>
        <h1 className="font-display text-6xl font-black uppercase leading-none">Average {avg}<span className="text-2xl text-muted-foreground"> / 10</span></h1>
        <p className="mt-3 text-muted-foreground">{scored.length} of {cards.length} stories scored. Read them one after another, the way an assessor would.</p>
      </section>

      {cards.map((c, i) => {
        const r = results[i];
        return (
          <article key={i} className="grid gap-6 rounded-3xl border border-white/[0.08] p-6 sm:grid-cols-[12rem_1fr] md:p-8">
            <img src={c.url} alt={`Picture ${i + 1}`} className="w-full rounded-2xl border border-white/10 object-cover" />
            <div>
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="text-3xl font-extrabold uppercase">Picture {i + 1}</h2>
                {r && typeof r !== "string" && <span className="font-display text-4xl font-black text-primary">{r.score}/10</span>}
              </div>
              {!r && <p className="mt-2 text-muted-foreground">No story written for this picture.</p>}
              {typeof r === "string" && <p role="alert" className="mt-2 text-destructive">{r}</p>}
              {r && typeof r !== "string" && (
                <>
                  {r.alignment && (
                    <p className="mt-2 text-sm text-muted-foreground">
                      Fit with picture <span className="font-semibold text-foreground">{r.alignment.score}/10</span>
                      {r.alignment.missed.length > 0 && <> · missed: {r.alignment.missed.slice(0, 3).join(", ")}</>}
                    </p>
                  )}
                  <details className="mt-3 group">
                    <summary className="cursor-pointer text-sm font-semibold text-primary">Read feedback</summary>
                    <div className="mt-3"><Markdown>{r.analysisMarkdown}</Markdown></div>
                    <div className="mt-6"><ImageMatch imageUrl={c.url} alignment={r.alignment} /></div>
                  </details>
                </>
              )}
            </div>
          </article>
        );
      })}

      <div className="flex flex-wrap gap-3">
        <PrimaryButton onClick={() => setPhase("intro")}>Try again</PrimaryButton>
      </div>
    </div>
  );
}
