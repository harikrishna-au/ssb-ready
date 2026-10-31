import type { AnnotatedItem } from "@/data/radar";

/** Plain-language countdown chip. Urgent when 7 days or fewer remain. */
export function Deadline({ item }: { item: AnnotatedItem }) {
  let text: string;
  let tone = "border-white/15 text-muted-foreground";

  if (item.status === "closed") {
    text = "Closed";
  } else if (item.status === "open") {
    const d = item.daysToLastDate ?? 0;
    text = d === 0 ? "Last day today" : d === 1 ? "Closes tomorrow" : `Closes in ${d} days`;
    tone = d <= 7 ? "border-destructive/60 bg-destructive/10 text-destructive" : "border-green-500/50 bg-green-500/10 text-green-400";
  } else if (item.daysToOpen !== undefined) {
    text = `Opens in ${item.daysToOpen} days`;
    tone = "border-brass/50 bg-brass/10 text-brass";
  } else {
    text = "Date to be announced";
    tone = "border-brass/50 bg-brass/10 text-brass";
  }

  return <span className={`inline-flex whitespace-nowrap rounded-full border px-3 py-1 text-xs font-semibold ${tone}`}>{text}</span>;
}
