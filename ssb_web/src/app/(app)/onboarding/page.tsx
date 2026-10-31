"use client";

import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store";
import { EXAMS } from "@/lib/tests";

const STAGES = [
  { id: "starting", label: "Just starting", hint: "I want to learn the format." },
  { id: "practising", label: "Practising regularly", hint: "I need timed practice and feedback." },
  { id: "called", label: "Call letter received", hint: "My SSB date is fixed." },
];

export default function Onboarding() {
  const { user } = useUser();
  const router = useRouter();
  const [exam, setExam] = useState<string>("");
  const [stage, setStage] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const save = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await user.update({ unsafeMetadata: { ...user.unsafeMetadata, exam, stage } });
      useStore.getState().setPrefs({ exam, stage });
      router.replace("/dashboard");
    } catch {
      setError("Could not save your answers. Check your connection and try again.");
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="text-5xl font-black uppercase leading-none">Two quick questions</h1>
      <p className="mt-3 text-muted-foreground">So your dashboard starts in the right place. You can change these later in your account.</p>

      <fieldset className="mt-10">
        <legend className="text-lg font-semibold">Which exam are you preparing for?</legend>
        <div className="mt-3 flex flex-wrap gap-2.5">
          {EXAMS.map((e) => (
            <button
              key={e} type="button" onClick={() => setExam(e)} aria-pressed={exam === e}
              className={`rounded-full border px-5 py-2 text-sm font-semibold transition-colors ${exam === e ? "border-primary bg-primary text-primary-foreground" : "border-white/15 hover:border-white/40"}`}
            >
              {e}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="mt-10">
        <legend className="text-lg font-semibold">Where are you now?</legend>
        <div className="mt-3 grid gap-2.5">
          {STAGES.map((s) => (
            <button
              key={s.id} type="button" onClick={() => setStage(s.id)} aria-pressed={stage === s.id}
              className={`rounded-xl border p-4 text-left transition-colors ${stage === s.id ? "border-primary bg-primary/10" : "border-white/15 hover:border-white/40"}`}
            >
              <span className="block font-semibold">{s.label}</span>
              <span className="text-sm text-muted-foreground">{s.hint}</span>
            </button>
          ))}
        </div>
      </fieldset>

      {error && <p role="alert" className="mt-6 text-sm text-destructive">{error}</p>}
      <Button className="mt-10" size="lg" disabled={!exam || !stage || saving} onClick={save}>
        {saving ? "Saving…" : "Go to my dashboard"}
      </Button>
    </div>
  );
}
