"use client";

import { useEffect, useRef, useState } from "react";

/** Mouth shapes that sit on this face. Closed is 0. */
const TALKING = [4, 6, 2, 15, 11, 19, 8, 1];

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
 * Talking interviewing officer from the gbar interview.
 * The mouth stays one size on the face and moves for as long as she is speaking.
 */
export function VisemeOfficer({ text, voice, busy }: { text: string; voice: boolean; busy: boolean }) {
  const [viseme, setViseme] = useState(0);
  const [blink, setBlink] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [needsTap, setNeedsTap] = useState(false);
  const textRef = useRef(text);
  const talk = useRef<number | null>(null);
  textRef.current = text;

  useEffect(() => {
    const tick = window.setInterval(() => {
      setBlink(true);
      window.setTimeout(() => setBlink(false), 180);
    }, 4200);
    return () => window.clearInterval(tick);
  }, []);

  const stopMouth = () => {
    if (talk.current !== null) window.clearInterval(talk.current);
    talk.current = null;
    setSpeaking(false);
    setViseme(0);
  };

  const speakNow = (fromTap: boolean) => {
    if (!("speechSynthesis" in window)) return;
    const line = textRef.current.trim();
    const synth = window.speechSynthesis;
    if (!line) {
      synth.cancel();
      stopMouth();
      return;
    }
    const say = () => {
      const spoken = new SpeechSynthesisUtterance(line);
      spoken.lang = "en-IN";
      spoken.rate = 0.95;
      const chosen = pickVoice();
      if (chosen) spoken.voice = chosen;
      spoken.onstart = () => {
        setNeedsTap(false);
        setSpeaking(true);
        let n = 0;
        if (talk.current !== null) window.clearInterval(talk.current);
        talk.current = window.setInterval(() => {
          setViseme(TALKING[n % TALKING.length]);
          n += 1;
        }, 120);
      };
      spoken.onend = stopMouth;
      spoken.onerror = () => {
        stopMouth();
        if (!fromTap) setNeedsTap(true);
      };
      if (synth.paused) synth.resume();
      synth.speak(spoken);
    };
    say();
  };

  useEffect(() => {
    if (!("speechSynthesis" in window)) return;
    const synth = window.speechSynthesis;
    if (!voice || !text.trim()) {
      synth.cancel();
      stopMouth();
      return;
    }
    // Give Safari a turn between cancel and speak, or the line never starts.
    synth.cancel();
    const timer = window.setTimeout(() => speakNow(false), 80);
    const watch = window.setTimeout(() => {
      if (!synth.speaking) setNeedsTap(true);
    }, 1000);
    return () => {
      window.clearTimeout(timer);
      window.clearTimeout(watch);
      synth.cancel();
      stopMouth();
    };
    // speakNow reads the current line from textRef.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, voice]);

  const label = needsTap && voice ? "Tap her to speak" : speaking ? "Speaking" : busy ? "Thinking" : "Your turn";

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
          className="absolute left-[49%] top-[47%] z-30 h-auto w-[30%] -translate-x-1/2 -translate-y-1/2"
        />
        {needsTap && voice && (
          <button
            type="button"
            onClick={() => { setNeedsTap(false); speakNow(true); }}
            className="absolute inset-0 z-40 grid place-items-center rounded-full bg-black/25 text-sm font-semibold text-white"
          >
            Tap to speak
          </button>
        )}
      </div>
      <figcaption className="mt-2 text-center text-sm text-muted-foreground" aria-live="polite">{label}</figcaption>
    </figure>
  );
}
