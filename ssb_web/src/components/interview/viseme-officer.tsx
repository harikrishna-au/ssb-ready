"use client";

import { useEffect, useRef, useState } from "react";

const MOUTH: Record<string, number> = {
  a: 2, e: 4, i: 6, o: 8, u: 7,
  b: 21, m: 21, p: 21,
  f: 18, v: 18,
  s: 15, z: 15, c: 15, x: 15,
  j: 16,
  l: 14, r: 13,
  w: 7, y: 6,
  d: 19, t: 19, n: 19,
  k: 20, g: 20, q: 20,
  h: 12,
};

/** Azure-style mouth shape for the character being spoken. 0 is a closed mouth. */
function visemeFor(text: string, index: number): number {
  const pair = text.slice(index, index + 2).toLowerCase();
  if (pair === "th") return 17;
  if (pair === "sh" || pair === "ch") return 16;
  const ch = text[index]?.toLowerCase() ?? "";
  if (!/[a-z]/.test(ch)) return 0;
  return MOUTH[ch] ?? 19;
}

function pickVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices();
  return (
    voices.find((v) => /en-IN/i.test(v.lang) && /female|heera|neerja|swara/i.test(v.name)) ??
    voices.find((v) => /en-IN/i.test(v.lang)) ??
    voices.find((v) => /^en/i.test(v.lang) && /female/i.test(v.name)) ??
    voices.find((v) => /^en/i.test(v.lang)) ??
    null
  );
}

/**
 * Talking interviewing officer. The face is the gbar cartoon; the mouth
 * shape follows the line currently being spoken.
 */
export function VisemeOfficer({ text, voice, busy }: { text: string; voice: boolean; busy: boolean }) {
  const [viseme, setViseme] = useState(0);
  const [blink, setBlink] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    const tick = window.setInterval(() => {
      setBlink(true);
      window.setTimeout(() => setBlink(false), 180);
    }, 4200);
    return () => window.clearInterval(tick);
  }, []);

  useEffect(() => {
    if (!("speechSynthesis" in window)) return;
    const timers: number[] = [];
    let fallback: number | null = null;
    let stopped = false;
    const rest = () => {
      if (stopped) return;
      if (fallback !== null) window.clearInterval(fallback);
      fallback = null;
      setSpeaking(false);
      setViseme(0);
    };
    window.speechSynthesis.cancel();
    if (!voice || !text.trim()) {
      rest();
      return;
    }

    const start = () => {
      if (stopped) return;
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "en-IN";
      utterance.rate = 0.95;
      const chosen = pickVoice();
      if (chosen) utterance.voice = chosen;
      let heardBoundary = false;
      utterance.onstart = () => {
        setSpeaking(true);
        timers.push(window.setTimeout(() => {
          if (heardBoundary || stopped) return;
          let i = 0;
          fallback = window.setInterval(() => {
            while (i < text.length && !/[a-z]/i.test(text[i] ?? "")) i += 1;
            if (i >= text.length) {
              setViseme(0);
              return;
            }
            setViseme(visemeFor(text, i));
            i += 1;
          }, 75);
        }, 220));
      };
      utterance.onboundary = (event) => {
        heardBoundary = true;
        if (fallback !== null) {
          window.clearInterval(fallback);
          fallback = null;
        }
        setViseme(visemeFor(text, event.charIndex ?? 0));
      };
      utterance.onend = rest;
      utterance.onerror = rest;
      window.speechSynthesis.speak(utterance);
    };

    const voices = window.speechSynthesis.getVoices();
    if (voices.length) start();
    else window.speechSynthesis.addEventListener("voiceschanged", start, { once: true });

    return () => {
      stopped = true;
      timers.forEach((id) => window.clearTimeout(id));
      if (fallback !== null) window.clearInterval(fallback);
      window.speechSynthesis.cancel();
      setSpeaking(false);
      setViseme(0);
    };
  }, [text, voice]);

  const label = speaking ? "Speaking" : busy ? "Thinking" : "Your turn";

  return (
    <figure className="m-0">
      <div className="relative mx-auto aspect-square w-full max-w-[420px]">
        <img src="/interview/officer.png" alt="Interviewing officer" className="relative z-10 h-full w-full object-contain" />
        <img
          src="/interview/blink.gif"
          alt=""
          aria-hidden
          className={`absolute inset-0 z-20 h-full w-full object-contain transition-opacity duration-100 ${blink ? "opacity-100" : "opacity-0"}`}
        />
        <img
          src={`/interview/visemes/viseme_id_${viseme}.svg`}
          alt=""
          aria-hidden
          className="absolute left-[49%] top-[47%] z-30 h-auto w-[30%] -translate-x-1/2 -translate-y-1/2 sm:w-[28%] md:w-[25%] lg:w-[22%]"
        />
      </div>
      <figcaption className="mt-2 text-center text-sm text-muted-foreground" aria-live="polite">{label}</figcaption>
    </figure>
  );
}
