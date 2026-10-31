/**
 * Radar types and pure helpers. The data itself lives in the database (see ssb_backend, GET /api/radar).
 * The old hand-edited list is now only a seed: ssb_backend/scripts/radar_seed.json.
 */
export type DateConfidence = "official" | "tentative" | "expected";
export type Service = "Army" | "Navy" | "Air Force" | "Tri-service" | "CAPF" | "State / other";

export type RadarItem = {
  id: string;
  title: string;
  conductedBy: string;
  service: Service;
  exam: string;
  /** ISO dates (yyyy-mm-dd). Any may be missing until announced. */
  opens?: string;
  lastDate?: string;
  examDate?: string;
  confidence: DateConfidence;
  note: string;
  applyUrl: string;
  applyLabel: string;
  /** Official page the dates come from, and the day a person last checked it. */
  sourceUrl: string;
  verifiedOn: string;
  updatedAt: string;
  googleCalendarUrl?: string | null;
};

/** Shape returned by the backend. */
export type ApiItem = Omit<RadarItem, "applyUrl" | "note"> & { body: string; officialApplyUrl: string };

export type Status = "open" | "upcoming" | "closed";
export type AnnotatedItem = RadarItem & { status: Status; daysToLastDate?: number; daysToOpen?: number };

export const fromApi = (a: ApiItem): RadarItem => {
  const { body, officialApplyUrl, ...rest } = a;
  return { ...rest, note: body, applyUrl: officialApplyUrl };
};

const DAY = 86_400_000;
const istToday = (now: number) => new Date(now + 5.5 * 3_600_000).toISOString().slice(0, 10);
const diffDays = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / DAY);

/** Adds status and day counts relative to today in India. Call on the server per request. */
export function annotate(items: RadarItem[], now: number): AnnotatedItem[] {
  const today = istToday(now);
  return items
    .map((r): AnnotatedItem => {
      const opened = !r.opens || r.opens <= today;
      const closed = r.lastDate ? r.lastDate < today : false;
      const status: Status = closed ? "closed" : opened && r.lastDate ? "open" : "upcoming";
      return {
        ...r,
        status,
        daysToLastDate: r.lastDate ? diffDays(today, r.lastDate) : undefined,
        daysToOpen: r.opens && r.opens > today ? diffDays(today, r.opens) : undefined,
      };
    })
    .sort((a, b) => {
      const rank = { open: 0, upcoming: 1, closed: 2 } as const;
      if (rank[a.status] !== rank[b.status]) return rank[a.status] - rank[b.status];
      const ad = a.lastDate ?? a.opens ?? "9999";
      const bd = b.lastDate ?? b.opens ?? "9999";
      return a.status === "closed" ? bd.localeCompare(ad) : ad.localeCompare(bd);
    });
}

/** Annotates against the current time. Call after `await connection()` so it runs per request. */
export const annotateNow = (items: RadarItem[]) => annotate(items, Date.now());

export const fmtDate = (iso?: string) =>
  iso ? new Date(iso + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "To be announced";

export const CONFIDENCE_LABEL: Record<DateConfidence, string> = {
  official: "Official dates",
  tentative: "Tentative dates",
  expected: "Expected, not announced",
};

/** Exam landing pages: /radar/nda etc. */
export const EXAM_PAGES = {
  nda: { exam: "NDA", name: "NDA & NA", blurb: "The National Defence Academy and Naval Academy Examination, run by UPSC twice a year for candidates after Class 12." },
  cds: { exam: "CDS", name: "CDS", blurb: "The Combined Defence Services Examination, run by UPSC twice a year for graduates, leading to IMA, INA, AFA and OTA." },
  afcat: { exam: "AFCAT", name: "AFCAT", blurb: "The Air Force Common Admission Test for flying and ground duty officer entries, held twice a year by the Indian Air Force." },
} as const;
export type ExamSlug = keyof typeof EXAM_PAGES;
export const matchesExam = (item: { exam: string }, exam: string) => item.exam.toUpperCase().split(/[^A-Z0-9+]+/).includes(exam.toUpperCase());
