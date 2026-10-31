import { CONFIDENCE_LABEL, fmtDate, type AnnotatedItem } from "@/data/radar";
import { CalendarLinks } from "./calendar-links";
import { Deadline } from "./deadline";
import { TrackButton } from "./track-button";

export function NotificationCard({ item: i }: { item: AnnotatedItem }) {
  return (
    <article id={i.id} className={`scroll-mt-24 border-b border-white/10 py-7 ${i.status === "closed" ? "opacity-70" : ""}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-brass">{i.conductedBy} · {i.service}</p>
          <h2 className="mt-1 text-3xl font-extrabold leading-tight sm:text-4xl">{i.title}</h2>
        </div>
        <Deadline item={i} />
      </div>

      <dl className="mt-5 grid grid-cols-3 gap-4 text-sm sm:max-w-xl">
        {([["Opens", i.opens], ["Last date", i.lastDate], ["Exam", i.examDate]] as const).map(([label, d]) => (
          <div key={label}>
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="mt-0.5 font-display text-2xl font-black leading-tight">{fmtDate(d)}</dd>
          </div>
        ))}
      </dl>

      <p className="mt-4 max-w-2xl text-muted-foreground">{i.note}</p>
      <p className="mt-2 text-xs text-muted-foreground/80">
        {CONFIDENCE_LABEL[i.confidence]} · checked {fmtDate(i.verifiedOn)} ·{" "}
        <a href={i.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-foreground">official source</a>
      </p>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <a href={i.applyUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground">
          {i.status === "closed" ? "Official site" : i.applyLabel}
        </a>
        {i.status !== "closed" && <TrackButton id={i.id} />}
        <CalendarLinks item={i} />
      </div>
    </article>
  );
}
