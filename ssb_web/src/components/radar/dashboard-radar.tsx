import { ArrowRight, Radar } from "lucide-react";
import Link from "next/link";
import { connection } from "next/server";
import { annotateNow, fmtDate } from "@/data/radar";
import { fetchRadar } from "@/data/radar-api";
import { Deadline } from "./deadline";

/** Dashboard panel: the next notification that is open or opening soon. Resolved per request. */
export async function DashboardRadar() {
  await connection();
  const { items, error } = await fetchRadar();
  const live = annotateNow(items).filter((i) => i.status !== "closed").slice(0, 2);
  return (
    <section className="flex flex-col rounded-3xl border border-white/[0.08] bg-card/40 p-6" aria-labelledby="dash-radar">
      <div className="flex items-center justify-between">
        <h2 id="dash-radar" className="flex items-center gap-2 text-2xl font-extrabold uppercase"><Radar className="size-5 text-brass" aria-hidden /> Next deadlines</h2>
        <Link href="/radar" className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-primary hover:underline">Radar <ArrowRight className="size-3.5" aria-hidden /></Link>
      </div>
      {error ? (
        <p role="alert" className="mt-4 text-sm text-muted-foreground">Could not load deadlines right now. Open Radar or check the official sites.</p>
      ) : live.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">Nothing is open right now. New notifications show up here as soon as they are announced.</p>
      ) : (
        <ul className="mt-4 flex-1 divide-y divide-white/[0.06]">
          {live.map((i) => (
            <li key={i.id} className="flex items-center justify-between gap-3 py-3.5 first:pt-0 last:pb-0">
              <div className="min-w-0">
                <p className="truncate font-semibold">{i.title}</p>
                <p className="text-sm text-muted-foreground">Last date {fmtDate(i.lastDate)}</p>
              </div>
              <Deadline item={i} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
