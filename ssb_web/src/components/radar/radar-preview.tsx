import Link from "next/link";
import { CONFIDENCE_LABEL, fmtDate, type AnnotatedItem } from "@/data/radar";
import { Deadline } from "./deadline";
import { TrackButton } from "./track-button";

/** Landing-page strip: what is open or opening next. */
export function RadarPreview({ items }: { items: AnnotatedItem[] }) {
  const live = items.filter((i) => i.status !== "closed").slice(0, 4);
  return (
    <div className="mt-10">
      {live.length === 0 && <p className="text-muted-foreground">Nothing is open right now. New notifications appear here as soon as they are announced.</p>}
      {live.map((i) => (
        <div key={i.id} className="grid items-center gap-x-8 gap-y-3 border-b border-white/10 py-5 md:grid-cols-[1.4fr_1fr_auto]">
          <div>
            <p className="text-sm text-brass">{i.conductedBy} · {CONFIDENCE_LABEL[i.confidence]}</p>
            <p className="text-2xl font-extrabold leading-tight">{i.title}</p>
          </div>
          <div className="text-sm">
            <p className="text-muted-foreground">Last date</p>
            <p className="font-display text-3xl font-black leading-none">{fmtDate(i.lastDate)}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3 md:justify-end">
            <Deadline item={i} />
            <TrackButton id={i.id} from="/" />
          </div>
        </div>
      ))}
      <Link href="/radar" className="mt-6 inline-flex rounded-lg border border-white/20 px-5 py-2.5 text-sm font-semibold hover:border-primary">See all dates on Radar</Link>
    </div>
  );
}
