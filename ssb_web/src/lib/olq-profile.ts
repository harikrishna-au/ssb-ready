import { OLQ_FACTORS, OLQS } from "./tests";
import { attemptDate } from "./use-history";
import type { Attempt, History } from "./store";

export type Olq = (typeof OLQS)[number];

/** The AI names qualities freely ("decisiveness", "teamwork"), so map them onto the board's 15. */
const ALIASES: [RegExp, Olq][] = [
  [/intelligen/, "Effective intelligence"],
  [/reasoning|logic|analytic/, "Reasoning ability"],
  [/organi[sz]/, "Organising ability"],
  [/expression|communicat|articul|clarity/, "Power of expression"],
  [/adapt|adjust/, "Social adaptability"],
  [/co-?operat|team|collaborat/, "Co-operation"],
  [/responsib|dependab|accountab/, "Sense of responsibility"],
  [/initiative|proactiv/, "Initiative"],
  [/confiden/, "Self-confidence"],
  [/decisi|decision/, "Speed of decision"],
  [/influence|leader/, "Ability to influence the group"],
  [/live|enthusias|humou?r|cheerful/, "Liveliness"],
  [/determin|perseveran|persist/, "Determination"],
  [/courage|brave|conviction|bold/, "Courage"],
  [/stamina|endurance|resilien/, "Stamina"],
];

export function toOlq(raw: string): Olq | null {
  const s = raw.toLowerCase();
  return ALIASES.find(([re]) => re.test(s))?.[1] ?? null;
}

/** WAT and SRT used to be saved as markdown only; their OLQs are the bullets under "Demonstrated OLQs". */
function fromMarkdown(md?: string): string[] {
  const block = md?.split(/#### Demonstrated OLQs/i)[1]?.split(/####/)[0];
  return block ? [...block.matchAll(/^- (.+)$/gm)].map((m) => m[1]) : [];
}

/** null when the attempt carries no OLQ data (old PPDT/TAT), so it does not count as "showed nothing". */
export function olqsOf(a: Attempt): Olq[] | null {
  const raw = a.evaluation?.identified_olqs ?? a.identifiedOlqs ?? (a.aiFeedback?.includes("Demonstrated OLQs") ? fromMarkdown(a.aiFeedback) : null);
  if (!raw) return null;
  return [...new Set(raw.map(toOlq).filter((q): q is Olq => !!q))];
}

export type OlqStat = {
  olq: Olq;
  factor: string;
  /** 0 to 1: how often this quality showed up, newer attempts counting more. */
  rate: number;
  hits: number;
  /** Change in rate, last 5 attempts against the ones before. null until there is enough to compare. */
  trend: number | null;
};

export type Profile = {
  attempts: number;
  stats: OlqStat[];
  factors: { factor: string; rate: number }[];
  strengths: OlqStat[];
  gaps: OlqStat[];
  archetype: { name: string; line: string };
  /** early: under 4 readable attempts, solid: 12 or more */
  confidence: "early" | "building" | "solid";
};

const FACTOR_OF = Object.fromEntries(OLQ_FACTORS.flatMap((f) => f.olqs.map((o) => [o, f.factor]))) as Record<Olq, string>;

const ARCHETYPES: Record<string, { name: string; line: string }> = {
  "Planning and organising": { name: "The Planner", line: "You think before you move. Boards read you as organised and clear-headed." },
  "Social adjustment": { name: "The Team Anchor", line: "People work well around you. You show responsibility and give way when the group needs it." },
  "Social effectiveness": { name: "The Natural Leader", line: "You take charge, decide fast and bring others along." },
  Dynamic: { name: "The Fighter", line: "You keep going when it gets hard. Courage and determination carry your answers." },
};

export function buildProfile(history: History | null): Profile | null {
  if (!history) return null;
  const readable = Object.values(history)
    .flat()
    .map((a) => ({ when: attemptDate(a.completedAt)?.getTime() ?? 0, olqs: olqsOf(a) }))
    .filter((a): a is { when: number; olqs: Olq[] } => a.olqs !== null)
    .sort((a, b) => b.when - a.when); // newest first
  if (!readable.length) return null;

  // Each older attempt counts a little less, so the profile follows who you are becoming.
  const weight = (i: number) => Math.pow(0.93, i);
  const totalW = readable.reduce((s, _, i) => s + weight(i), 0);
  const recent = readable.slice(0, 5);
  const earlier = readable.slice(5);

  const stats: OlqStat[] = OLQS.map((olq) => {
    const w = readable.reduce((s, a, i) => s + (a.olqs.includes(olq) ? weight(i) : 0), 0);
    const share = (xs: typeof readable) => (xs.length ? xs.filter((a) => a.olqs.includes(olq)).length / xs.length : 0);
    return {
      olq,
      factor: FACTOR_OF[olq],
      rate: w / totalW,
      hits: readable.filter((a) => a.olqs.includes(olq)).length,
      trend: earlier.length >= 3 ? share(recent) - share(earlier) : null,
    };
  });

  const factors = OLQ_FACTORS.map((f) => ({
    factor: f.factor,
    rate: f.olqs.reduce((s, o) => s + (stats.find((x) => x.olq === o)?.rate ?? 0), 0) / f.olqs.length,
  }));
  const top = [...factors].sort((a, b) => b.rate - a.rate)[0];
  const byRate = [...stats].sort((a, b) => b.rate - a.rate);

  return {
    attempts: readable.length,
    stats,
    factors,
    strengths: byRate.filter((s) => s.rate >= 0.35).slice(0, 4),
    gaps: [...byRate].reverse().filter((s) => s.rate < 0.3).slice(0, 4),
    archetype: ARCHETYPES[top.factor],
    confidence: readable.length < 4 ? "early" : readable.length < 12 ? "building" : "solid",
  };
}

/** What to practise for a missing quality. Written for the test that exposes it fastest. */
export const FIX: Record<Olq, { test: string; href: string; drill: string }> = {
  "Effective intelligence": { test: "SRT", href: "/srt", drill: "Answer each situation with the cause, the action and the result in one line." },
  "Reasoning ability": { test: "OIR", href: "/oir", drill: "Do a timed OIR set and review every wrong answer's reasoning, not just the key." },
  "Organising ability": { test: "SRT", href: "/srt", drill: "Start each answer with who you call, what you arrange and in what order." },
  "Power of expression": { test: "Lecturette", href: "/lecturette", drill: "Speak for three minutes with an opening line, two points and a closing line." },
  "Social adaptability": { test: "TAT", href: "/tat", drill: "Write a hero who joins a new group and fits in by helping first." },
  "Co-operation": { test: "TAT", href: "/tat", drill: "Make the hero succeed with others. Name the people who helped." },
  "Sense of responsibility": { test: "SRT", href: "/srt", drill: "Take ownership in each answer. Remove lines that blame someone else." },
  Initiative: { test: "PPDT", href: "/ppdt", drill: "Give the hero the first move, before anyone asks." },
  "Self-confidence": { test: "WAT", href: "/wat", drill: "Write sentences in the first person with no 'try' or 'hope'." },
  "Speed of decision": { test: "SRT", href: "/srt", drill: "Finish all ten situations. A fast, safe action beats a perfect unfinished one." },
  "Ability to influence the group": { test: "PPDT", href: "/ppdt", drill: "Write the hero persuading a group, not doing everything alone." },
  Liveliness: { test: "WAT", href: "/wat", drill: "Use words with energy and humour. Keep every sentence positive." },
  Determination: { test: "TAT", href: "/tat", drill: "Let the hero fail once and then continue until the goal is met." },
  Courage: { test: "SRT", href: "/srt", drill: "In risk situations, act for others' safety first and say so." },
  Stamina: { test: "TAT", href: "/tat", drill: "Show effort over time: hours, days or repeated attempts." },
};
