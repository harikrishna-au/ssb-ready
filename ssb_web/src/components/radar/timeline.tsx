import { fmtDate, type AnnotatedItem } from "@/data/radar";
import { Deadline } from "./deadline";

/** Last dates in date order, grouped by month. Entries with no last date are listed separately, never placed on a guessed date. */
export function Timeline({ items }: { items: AnnotatedItem[] }) {
  const dated = items.filter((i) => i.lastDate).sort((a, b) => a.lastDate!.localeCompare(b.lastDate!));
  const undated = items.filter((i) => !i.lastDate);
  const months = new Map<string, AnnotatedItem[]>();
  for (const i of dated) {
    const k = i.lastDate!.slice(0, 7);
    months.set(k, [...(months.get(k) ?? []), i]);
  }
  const monthName = (k: string) => new Date(k + "-01T00:00:00").toLocaleDateString("en-IN", { month: "long", year: "numeric" });
  return (
    <div className="space-y-8">
      {[...months].map(([k, list]) => (
        <section key={k} aria-label={monthName(k)}>
          <h2 className="font-display text-2xl font-black uppercase text-brass">{monthName(k)}</h2>
          <ol className="mt-3 border-l border-white/15">
            {list.map((i) => (
              <li key={i.id} className="relative ml-5 py-3">
                <span className={`absolute -left-[1.6rem] top-5 size-3 rounded-full ${i.status === "closed" ? "bg-white/30" : i.status === "open" ? "bg-green-400" : "bg-brass"}`} aria-hidden />
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm text-muted-foreground">Last date {fmtDate(i.lastDate)}</p>
                    <a href={`#${i.id}`} className="text-lg font-bold hover:underline">{i.title}</a>
                  </div>
                  <Deadline item={i} />
                </div>
              </li>
            ))}
          </ol>
        </section>
      ))}
      {undated.length > 0 && (
        <section aria-label="No last date yet">
          <h2 className="font-display text-2xl font-black uppercase text-muted-foreground">No last date announced</h2>
          <ul className="mt-3 space-y-1 text-muted-foreground">{undated.map((i) => <li key={i.id}>{i.title}</li>)}</ul>
        </section>
      )}
    </div>
  );
}
