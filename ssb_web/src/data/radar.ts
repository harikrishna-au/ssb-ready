/**
 * Radar: defence recruitment openings.
 * Update this file when a notification is published or a date changes, and bump `verifiedOn`.
 * Always send aspirants to the official site; these dates summarise it, they do not replace it.
 */
export type DateConfidence = "official" | "tentative" | "expected";

export type RadarItem = {
  id: string;
  title: string;
  conductedBy: string;
  service: "Army" | "Navy" | "Air Force" | "Tri-service";
  exam: string;
  /** ISO dates (yyyy-mm-dd). Any may be missing until announced. */
  opens?: string;
  lastDate?: string;
  examDate?: string;
  confidence: DateConfidence;
  note: string;
  applyUrl: string;
  applyLabel: string;
  verifiedOn: string;
};

export const RADAR: RadarItem[] = [
  {
    id: "nda-1-2027",
    title: "NDA & NA Examination (I), 2027",
    conductedBy: "UPSC",
    service: "Tri-service",
    exam: "NDA",
    opens: "2026-12-02",
    lastDate: "2026-12-22",
    examDate: "2027-04-11",
    confidence: "tentative",
    note: "For candidates after Class 12. Dates are from the UPSC 2027 exam calendar and can change when the notification is published.",
    applyUrl: "https://upsconline.nic.in",
    applyLabel: "UPSC online application",
    verifiedOn: "2026-10-31",
  },
  {
    id: "cds-1-2027",
    title: "Combined Defence Services Examination (I), 2027",
    conductedBy: "UPSC",
    service: "Tri-service",
    exam: "CDS",
    opens: "2026-12-02",
    lastDate: "2026-12-22",
    examDate: "2027-04-11",
    confidence: "tentative",
    note: "For graduates. Leads to IMA, INA, AFA and OTA depending on vacancy. Dates are from the UPSC 2027 calendar and can change.",
    applyUrl: "https://upsconline.nic.in",
    applyLabel: "UPSC online application",
    verifiedOn: "2026-10-31",
  },
  {
    id: "afcat-1-2027",
    title: "AFCAT 1, 2027",
    conductedBy: "Indian Air Force",
    service: "Air Force",
    exam: "AFCAT",
    opens: "2026-11-10",
    confidence: "expected",
    note: "Not yet announced. Based on last year's cycle, the notification is expected in November 2026. Treat every date as a guess until the Air Force publishes it.",
    applyUrl: "https://afcat.cdac.in",
    applyLabel: "AFCAT portal",
    verifiedOn: "2026-10-31",
  },
  {
    id: "nda-2-2027",
    title: "NDA & NA Examination (II), 2027",
    conductedBy: "UPSC",
    service: "Tri-service",
    exam: "NDA",
    opens: "2027-05-12",
    lastDate: "2027-06-01",
    examDate: "2027-09-19",
    confidence: "tentative",
    note: "Second NDA cycle of the year. From the UPSC 2027 calendar.",
    applyUrl: "https://upsconline.nic.in",
    applyLabel: "UPSC online application",
    verifiedOn: "2026-10-31",
  },
  {
    id: "cds-2-2027",
    title: "Combined Defence Services Examination (II), 2027",
    conductedBy: "UPSC",
    service: "Tri-service",
    exam: "CDS",
    opens: "2027-05-12",
    lastDate: "2027-06-01",
    examDate: "2027-09-19",
    confidence: "tentative",
    note: "Second CDS cycle of the year. From the UPSC 2027 calendar.",
    applyUrl: "https://upsconline.nic.in",
    applyLabel: "UPSC online application",
    verifiedOn: "2026-10-31",
  },
  {
    id: "nda-cds-2-2026",
    title: "NDA & NA (II) and CDS (II), 2026",
    conductedBy: "UPSC",
    service: "Tri-service",
    exam: "NDA / CDS",
    opens: "2026-05-20",
    lastDate: "2026-06-11",
    examDate: "2026-09-13",
    confidence: "official",
    note: "Applications closed on 11 June 2026 after an extension. Written exam was on 13 September 2026.",
    applyUrl: "https://upsc.gov.in",
    applyLabel: "UPSC website",
    verifiedOn: "2026-10-31",
  },
  {
    id: "afcat-2-2026",
    title: "AFCAT 2, 2026",
    conductedBy: "Indian Air Force",
    service: "Air Force",
    exam: "AFCAT",
    lastDate: "2026-06-21",
    confidence: "official",
    note: "Applications closed on 21 June 2026 after an extension.",
    applyUrl: "https://afcat.cdac.in",
    applyLabel: "AFCAT portal",
    verifiedOn: "2026-10-31",
  },
];

export type Status = "open" | "upcoming" | "closed";
export type AnnotatedItem = RadarItem & { status: Status; daysToLastDate?: number; daysToOpen?: number };

const DAY = 86_400_000;
const istToday = (now: number) => new Date(now + 5.5 * 3_600_000).toISOString().slice(0, 10);
const diffDays = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / DAY);

/** Adds status and day counts relative to today in India. Call on the server per request. */
export function annotate(now: number): AnnotatedItem[] {
  const today = istToday(now);
  return RADAR.map((r) => {
    const opened = !r.opens || r.opens <= today;
    const closed = r.lastDate ? r.lastDate < today : false;
    const status: Status = closed ? "closed" : opened && r.lastDate ? "open" : "upcoming";
    return {
      ...r,
      status,
      daysToLastDate: r.lastDate ? diffDays(today, r.lastDate) : undefined,
      daysToOpen: r.opens && r.opens > today ? diffDays(today, r.opens) : undefined,
    };
  }).sort((a, b) => {
    const rank = { open: 0, upcoming: 1, closed: 2 } as const;
    if (rank[a.status] !== rank[b.status]) return rank[a.status] - rank[b.status];
    const ad = a.lastDate ?? a.opens ?? "9999";
    const bd = b.lastDate ?? b.opens ?? "9999";
    return a.status === "closed" ? bd.localeCompare(ad) : ad.localeCompare(bd);
  });
}

/** Annotates against the current time. Call after `await connection()` so it runs per request. */
export const annotateNow = () => annotate(Date.now());

export const fmtDate = (iso?: string) =>
  iso ? new Date(iso + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "To be announced";

export const CONFIDENCE_LABEL: Record<DateConfidence, string> = {
  official: "Official dates",
  tentative: "Tentative dates",
  expected: "Expected, not announced",
};
