export type Group = "screening" | "psychology" | "speaking";

export type TestInfo = {
  slug: string;
  name: string;
  full: string;
  minutes: string;
  format: string;
  measures: string;
  group: Group;
};

export const GROUPS: Record<Group, { title: string; blurb: string }> = {
  screening: { title: "Screening round", blurb: "Day 1. Fail either test and you go home, so this is where most candidates are cut." },
  psychology: { title: "Psychology tests", blurb: "Four tests that read how you think. Practise them until your first instinct is a good one." },
  speaking: { title: "Speaking and interview", blurb: "Lecturette practice and a short guide to the personal interview." },
};

/** Single source for the landing page, dashboard and tests hub. */
export const TESTS: TestInfo[] = [
  { slug: "oir", name: "OIR", full: "Officer Intelligence Rating", minutes: "10 min", format: "Verbal and non-verbal reasoning, multiple choice", measures: "Reasoning ability, speed under pressure", group: "screening" },
  { slug: "ppdt", name: "PPDT", full: "Picture Perception & Discussion Test", minutes: "6 min", format: "30s look, 1 min notes, 4 min story", measures: "Perception, imagination, positive outlook", group: "screening" },
  { slug: "tat", name: "TAT", full: "Thematic Apperception Test", minutes: "5 stories", format: "30s look, 4 min story per picture", measures: "Motives, attitudes, how you handle problems", group: "psychology" },
  { slug: "wat", name: "WAT", full: "Word Association Test", minutes: "4 min", format: "15 words, 15 seconds each", measures: "Spontaneous thought pattern", group: "psychology" },
  { slug: "srt", name: "SRT", full: "Situation Reaction Test", minutes: "5 min", format: "10 situations, one shared clock", measures: "Decisiveness, responsibility, initiative", group: "psychology" },
  { slug: "sdt", name: "SDT", full: "Self Description Test", minutes: "60 min", format: "5 perspectives, 12 min each", measures: "Self-awareness and consistency", group: "psychology" },
  { slug: "lecturette", name: "Lecturette", full: "Lecturette practice", minutes: "3 min", format: "Pick one of four topics, then speak for three minutes", measures: "Structure, fluency, confidence", group: "speaking" },
  { slug: "interview-guide", name: "Interview", full: "Interview guide and AI mock interview", minutes: "Open", format: "Read the guide, then practise with questions drawn from your PIQ", measures: "Clarity, honesty, consistency with your PIQ", group: "speaking" },
];

/** The 15 Officer Like Qualities, grouped in the four factors the board uses. */
export const OLQ_FACTORS = [
  { factor: "Planning and organising", olqs: ["Effective intelligence", "Reasoning ability", "Organising ability", "Power of expression"] },
  { factor: "Social adjustment", olqs: ["Social adaptability", "Co-operation", "Sense of responsibility"] },
  { factor: "Social effectiveness", olqs: ["Initiative", "Self-confidence", "Speed of decision", "Ability to influence the group", "Liveliness"] },
  { factor: "Dynamic", olqs: ["Determination", "Courage", "Stamina"] },
];
export const OLQS = OLQ_FACTORS.flatMap((f) => f.olqs);

export const EXAMS = ["NDA", "CDS", "AFCAT", "CAPF", "TA", "Other"] as const;
