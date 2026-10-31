"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, Send, Square, Volume2, VolumeX } from "lucide-react";
import Link from "next/link";
import { ErrorView } from "@/components/exam/ui";
import { api } from "@/lib/api";
import { usePiq } from "@/lib/use-piq";

type Msg = { role: "assistant" | "user"; content: string };

// Web Speech API is not in the TS DOM lib.
type Recognition = {
  lang: string; interimResults: boolean;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null; start(): void; stop(): void;
};
const getRecognition = (): Recognition | null => {
  const w = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
  const C = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  return C ? new C() : null;
};

const GREETING: Msg = {
  role: "assistant",
  content: "Jai Hind! I am your Interviewing Officer today. I have reviewed your PIQ. Let's begin. Can you tell me a bit about your family and the place you come from?",
};

export default function InterviewPage() {
  const { values: piq, completeness: c, loading, failed, reload } = usePiq();
  const [chat, setChat] = useState<Msg[]>([GREETING]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [speak, setSpeak] = useState(true);
  const [error, setError] = useState("");
  const rec = useRef<Recognition | null>(null);
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => bottom.current?.scrollIntoView({ behavior: "smooth" }), [chat]);

  const say = (text: string) => {
    if (!speak || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(new SpeechSynthesisUtterance(text));
  };

  const send = async (override?: string) => {
    const text = (override ?? input).trim();
    if (!text || busy || !c.complete) return;
    const history: Msg[] = [...chat, { role: "user", content: text }];
    setChat(history);
    setInput("");
    setBusy(true);
    setError("");
    try {
      const r = await api.post<{ reply?: string }>("/api/evaluation/run", {
        testType: "INTERVIEW_REPLY",
        payload: { piq, chatHistory: history },
      });
      const reply = r.reply?.trim() || "Please continue.";
      setChat([...history, { role: "assistant", content: reply }]);
      say(reply);
    } catch (e) {
      setError(e instanceof Error ? e.message : "The officer is unavailable");
    } finally {
      setBusy(false);
    }
  };

  const toggleMic = () => {
    if (listening) return rec.current?.stop();
    const r = getRecognition();
    if (!r) return setError("Speech input is not supported in this browser.");
    r.lang = "en-IN";
    r.interimResults = false;
    r.onresult = (e) => setInput((p) => `${p} ${e.results[0][0].transcript}`.trim());
    r.onend = () => setListening(false);
    rec.current = r;
    setListening(true);
    r.start();
  };

  if (failed) return <ErrorView message="Could not load your PIQ. Check your connection and try again." onRetry={() => void reload()} />;
  if (loading) return <div className="h-72 animate-pulse rounded-3xl bg-white/5" role="status" aria-label="Loading your PIQ" />;

  if (!c.complete)
    return (
      <div className="rise max-w-xl">
        <Link href="/interview-guide" className="text-sm text-muted-foreground transition-colors hover:text-foreground">← Interview guide</Link>
        <h1 className="mt-4 font-display text-6xl font-black uppercase leading-none">Fill your PIQ first</h1>
        <p className="mt-3 text-muted-foreground">The interviewing officer questions you from your PIQ, so the mock interview starts once it is complete. You have {c.done} of {c.total} required fields done.</p>
        <Link href="/piq?next=/interview" className="mt-8 inline-flex h-14 items-center rounded-full bg-primary px-10 font-semibold text-primary-foreground transition-transform hover:-translate-y-0.5">
          {c.done === 0 ? "Fill my PIQ" : "Continue my PIQ"}
        </Link>
      </div>
    );

  return (
    <div className="rise flex flex-col" style={{ minHeight: "calc(100dvh - 9rem)" }}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/interview-guide" className="text-sm text-muted-foreground transition-colors hover:text-foreground">← Interview guide</Link>
          <h1 className="font-display text-5xl font-black uppercase leading-none">Mock interview</h1>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setSpeak(!speak)} aria-pressed={speak} className="inline-flex h-10 items-center gap-2 rounded-full border border-white/15 px-4 text-sm transition-colors hover:border-white/35">
            {speak ? <Volume2 className="size-4" aria-hidden /> : <VolumeX className="size-4" aria-hidden />} {speak ? "Voice on" : "Voice off"}
          </button>
          <Link href="/piq?next=/interview" className="inline-flex h-10 items-center rounded-full border border-white/15 px-4 text-sm transition-colors hover:border-white/35">Edit PIQ</Link>
        </div>
      </div>

      <div className="mt-6 flex-1 space-y-4 overflow-y-auto rounded-3xl border border-white/[0.08] bg-card/40 p-5 md:p-7" style={{ maxHeight: "calc(100dvh - 20rem)" }} aria-live="polite">
        {chat.map((m, i) => (
          <div key={i} className={`flex gap-3 ${m.role === "user" ? "justify-end" : ""}`}>
            {m.role === "assistant" && <span className="mt-1 grid size-8 shrink-0 place-items-center rounded-full bg-brass/20 text-xs font-bold text-brass" aria-hidden>IO</span>}
            <div className={`max-w-[82%] rounded-3xl px-5 py-3 leading-relaxed ${m.role === "user" ? "rounded-br-md bg-primary text-primary-foreground" : "rounded-bl-md bg-white/[0.07]"}`}>
              <span className="sr-only">{m.role === "user" ? "You: " : "Interviewing officer: "}</span>
              {m.content}
            </div>
          </div>
        ))}
        {busy && <p className="pl-11 text-sm text-muted-foreground">The officer is thinking…</p>}
        <div ref={bottom} />
      </div>

      {error && <p role="alert" className="mt-3 text-sm text-destructive">{error}</p>}
      <form className="mt-4 flex items-center gap-2" onSubmit={(e) => { e.preventDefault(); void send(); }}>
        <input
          value={input} onChange={(e) => setInput(e.target.value)} aria-label="Your answer" placeholder="Type your answer, or use the microphone…"
          className="h-14 min-w-0 flex-1 rounded-full border border-white/10 bg-card/60 px-6 outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary"
        />
        <button type="button" onClick={toggleMic} aria-label={listening ? "Stop recording" : "Speak your answer"} aria-pressed={listening}
          className={`grid size-14 shrink-0 place-items-center rounded-full border transition-colors ${listening ? "timer-urgent border-destructive bg-destructive/15 text-destructive" : "border-white/15 hover:border-white/35"}`}>
          {listening ? <Square className="size-5" aria-hidden /> : <Mic className="size-5" aria-hidden />}
        </button>
        <button type="submit" disabled={busy || !input.trim()} aria-label="Send answer" className="grid size-14 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground transition-transform hover:-translate-y-0.5 disabled:opacity-50">
          <Send className="size-5" aria-hidden />
        </button>
      </form>
    </div>
  );
}
