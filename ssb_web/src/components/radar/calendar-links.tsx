import { CalendarPlus } from "lucide-react";
import type { AnnotatedItem } from "@/data/radar";

const BACKEND = (process.env.NEXT_PUBLIC_BACKEND_URL ?? "").replace(/\/$/, "");

/** Download an .ics file or open Google Calendar. Hidden when there is no date to put in a calendar. */
export function CalendarLinks({ item }: { item: AnnotatedItem }) {
  if (!item.opens && !item.lastDate && !item.examDate) return null;
  const cls = "inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-sm text-muted-foreground hover:text-foreground";
  return (
    <span className="inline-flex flex-wrap items-center">
      <a href={`${BACKEND}/api/radar/${item.id}/calendar.ics`} className={cls} download>
        <CalendarPlus className="size-4" aria-hidden /> Add to calendar (.ics)
      </a>
      {item.googleCalendarUrl && (
        <a href={item.googleCalendarUrl} target="_blank" rel="noopener noreferrer" className={cls}>Google Calendar</a>
      )}
    </span>
  );
}
