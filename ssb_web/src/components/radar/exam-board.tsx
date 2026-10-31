import { fmtDate, type AnnotatedItem } from "@/data/radar";
import { NotificationCard } from "./notification-card";

export function ExamBoard({ items, exam }: { items: AnnotatedItem[]; exam: string }) {
  if (items.length === 0)
    return (
      <div className="rounded-2xl border border-white/10 p-8">
        <p className="text-xl font-semibold">No {exam} notification is published right now.</p>
        <p className="mt-1 text-muted-foreground">When one has been checked against the official source it appears here.</p>
      </div>
    );
  const updated = items.map((i) => i.updatedAt.slice(0, 10)).sort().at(-1);
  return (
    <div>
      <p className="text-sm text-muted-foreground">Last updated {fmtDate(updated)}</p>
      {items.map((i) => <NotificationCard key={i.id} item={i} />)}
    </div>
  );
}
