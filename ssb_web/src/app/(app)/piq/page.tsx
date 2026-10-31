"use client";

import { useUser } from "@clerk/nextjs";
import { Check, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useRef, useState } from "react";
import { ErrorView, PrimaryButton } from "@/components/exam/ui";
import { completeness, safeNext, SECTIONS, validateField, type Field, type PiqValues } from "@/lib/piq";
import { usePiq } from "@/lib/use-piq";

const inputCls = "mt-1.5 w-full rounded-xl border bg-card/60 px-4 outline-none transition-colors focus:border-primary";

function Input({ f, value, error, onChange }: { f: Field; value: string; error?: string; onChange: (v: string) => void }) {
  const id = `piq-${f.key}`;
  const common = {
    id, value, "aria-invalid": !!error || undefined, "aria-describedby": error ? `${id}-err` : f.hint ? `${id}-hint` : undefined,
    onChange: (e: React.ChangeEvent<HTMLInputElement & HTMLSelectElement & HTMLTextAreaElement>) => onChange(e.target.value),
    className: `${inputCls} ${error ? "border-destructive" : "border-white/10"}`,
  };
  return (
    <div className={f.wide || f.type === "textarea" ? "sm:col-span-2" : ""}>
      <label htmlFor={id} className="text-sm font-semibold">
        {f.label}{f.required && <span className="text-brass" aria-hidden> *</span>}
        {f.required && <span className="sr-only"> (required)</span>}
      </label>
      {f.type === "select" ? (
        <select {...common} className={`${common.className} h-12`}>
          <option value="">Select…</option>
          {f.options?.map((o) => <option key={o}>{o}</option>)}
        </select>
      ) : f.type === "textarea" ? (
        <textarea {...common} rows={4} className={`${common.className} resize-y py-3`} />
      ) : (
        <input {...common} type={f.type ?? "text"} inputMode={f.type === "tel" ? "tel" : undefined} className={`${common.className} h-12`} />
      )}
      {error ? <p id={`${id}-err`} role="alert" className="mt-1 text-xs text-destructive">{error}</p>
        : f.hint ? <p id={`${id}-hint`} className="mt-1 text-xs text-muted-foreground">{f.hint}</p> : null}
    </div>
  );
}

function Form({ initial }: { initial: PiqValues }) {
  const { save } = usePiq();
  const { user } = useUser();
  const router = useRouter();
  const next = safeNext(useSearchParams().get("next"));

  const [values, setValues] = useState<PiqValues>(() => ({
    ...initial,
    fullName: initial.fullName || user?.fullName || "",
    email: initial.email || user?.primaryEmailAddress?.emailAddress || "",
  }));
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [finished, setFinished] = useState<null | boolean>(null);
  const top = useRef<HTMLDivElement>(null);

  const section = SECTIONS[step];
  const status = completeness(values);
  const set = (k: string, v: string) => { setValues((p) => ({ ...p, [k]: v })); if (errors[k]) setErrors((e) => ({ ...e, [k]: "" })); };
  const fields = section.fields.filter((f) => !f.showIf || f.showIf(values));

  const check = () => {
    const errs: Record<string, string> = {};
    for (const f of fields) { const e = validateField(f, values[f.key], () => new Date()); if (e) errs[f.key] = e; }
    setErrors(errs);
    const first = Object.keys(errs)[0];
    if (first) document.getElementById(`piq-${first}`)?.focus();
    return !first;
  };

  const persist = async () => {
    setSaving(true); setSaveError("");
    try { return await save(values); }
    catch (e) { setSaveError(e instanceof Error ? e.message : "Could not save. Try again."); return null; }
    finally { setSaving(false); }
  };

  const goTo = (n: number) => { setStep(n); setErrors({}); top.current?.scrollIntoView({ behavior: "smooth", block: "start" }); };

  const onContinue = async () => {
    if (!check()) return;
    const done = await persist();
    if (done === null) return;
    if (step < SECTIONS.length - 1) goTo(step + 1);
    else setFinished(done);
  };

  const onDraft = async () => { await persist(); };

  if (finished !== null)
    return (
      <div className="rise max-w-xl">
        <span className="grid size-14 place-items-center rounded-full bg-green-500/15 text-green-400"><Check className="size-7" aria-hidden /></span>
        <h1 className="mt-5 font-display text-6xl font-black uppercase leading-none">{finished ? "PIQ complete" : "PIQ saved"}</h1>
        <p className="mt-3 text-muted-foreground">
          {finished ? "Everything required is filled in. You can edit it any time from the sidebar." : `Saved. ${status.total - status.done} required ${status.total - status.done === 1 ? "field is" : "fields are"} still missing.`}
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          {finished && next && <PrimaryButton onClick={() => router.push(next)}>{next === "/premium" ? "Continue to payment" : "Continue"}</PrimaryButton>}
          {finished && <Link href="/interview" className="inline-flex h-12 items-center rounded-full border border-white/20 px-7 font-semibold hover:border-white/40">Start mock interview</Link>}
          {!finished && <PrimaryButton onClick={() => { setFinished(null); goTo(SECTIONS.findIndex((s) => s.fields.some((f) => status.missing.includes(f)))); }}>Fill the missing fields</PrimaryButton>}
          <Link href="/dashboard" className="inline-flex h-12 items-center px-5 font-semibold text-muted-foreground hover:text-foreground">Home</Link>
        </div>
      </div>
    );

  return (
    <div className="rise" ref={top}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-6xl font-black uppercase leading-none">Your PIQ</h1>
          <p className="mt-3 max-w-xl text-muted-foreground">Your Personal Information Questionnaire. The mock interview questions you from it, so write only what you can talk about, and keep it honest.</p>
        </div>
        <div className="text-right" aria-live="polite">
          <p className="font-display text-5xl font-black leading-none text-primary">{status.percent}%</p>
          <p className="text-sm text-muted-foreground">{status.done} of {status.total} required</p>
        </div>
      </div>

      <ol className="mt-8 flex gap-2 overflow-x-auto pb-1" aria-label="PIQ sections">
        {SECTIONS.map((s, i) => {
          const sectionDone = s.fields.filter((f) => f.required).every((f) => !validateField(f, values[f.key], () => new Date()));
          return (
            <li key={s.id}>
              <button
                onClick={() => goTo(i)} aria-current={i === step ? "step" : undefined}
                className={`flex items-center gap-2 whitespace-nowrap rounded-full border px-4 py-2 text-sm font-medium transition-colors ${i === step ? "border-primary bg-primary/15 text-foreground" : "border-white/10 text-muted-foreground hover:border-white/30"}`}
              >
                <span className={`grid size-5 place-items-center rounded-full text-[10px] font-bold ${sectionDone ? "bg-green-500 text-black" : "bg-white/10"}`}>{sectionDone ? <Check className="size-3" aria-hidden /> : i + 1}</span>
                {s.title}
              </button>
            </li>
          );
        })}
      </ol>

      <section className="mt-8 rounded-3xl border border-white/[0.08] bg-card/40 p-6 md:p-8" aria-labelledby="sec-title">
        <h2 id="sec-title" className="text-3xl font-extrabold uppercase">{section.title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{section.blurb}</p>
        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          {fields.map((f) => <Input key={f.key} f={f} value={values[f.key] ?? ""} error={errors[f.key]} onChange={(v) => set(f.key, v)} />)}
        </div>
      </section>

      <p className="mt-5 flex items-start gap-2 text-xs text-muted-foreground">
        <ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden />
        <span>Your PIQ is stored against your account and sent to an AI service only when you use the mock interview. Optional fields can stay blank. See the <Link href="/privacy" className="text-primary underline">privacy policy</Link>.</span>
      </p>
      {saveError && <p role="alert" className="mt-4 text-sm text-destructive">{saveError}</p>}

      <div className="mt-6 flex flex-wrap items-center gap-3">
        {step > 0 && <button onClick={() => goTo(step - 1)} className="inline-flex h-12 items-center rounded-full border border-white/20 px-6 font-semibold transition-colors hover:border-white/40">Back</button>}
        <PrimaryButton onClick={onContinue} disabled={saving} className="px-9">{saving ? "Saving…" : step < SECTIONS.length - 1 ? "Save and continue" : "Save PIQ"}</PrimaryButton>
        <button onClick={onDraft} disabled={saving} className="px-3 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground disabled:opacity-60">Save draft</button>
      </div>
    </div>
  );
}

function PiqPage() {
  const { values, loading, failed, reload } = usePiq();
  if (failed) return <ErrorView message="Could not load your PIQ. Check your connection and try again." onRetry={() => void reload()} />;
  if (loading) return <div className="h-96 animate-pulse rounded-3xl bg-white/5" role="status" aria-label="Loading your PIQ" />;
  return <Form initial={values} />;
}

export default function Page() {
  return <Suspense fallback={<div className="h-96 animate-pulse rounded-3xl bg-white/5" />}><PiqPage /></Suspense>;
}
