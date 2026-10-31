import { entryPosts } from "./entries";
import { forcesPosts } from "./forces";
import { gtoPosts } from "./gto";
import { prepPosts } from "./prep";
import { processPosts } from "./process";
import { psychologyPosts } from "./psychology";
import { speakingPosts } from "./speaking";
import type { Post } from "./types";

/** Tags for the original 15 posts, which were written before tags existed. */
const LEGACY_TAGS: Record<string, string[]> = {
  "ssb-lecturette-topics-format-how-to-speak": ["lecturette", "speaking", "gto"],
  "ssb-interview-questions-and-how-to-answer": ["interview", "piq"],
  "nda-vs-cds-vs-afcat-ssb": ["entries", "nda", "cds", "afcat"],
  "ssb-interview-process-5-day-procedure": ["ssb-basics", "process"],
  "15-officer-like-qualities-olqs-explained": ["olqs", "ssb-basics"],
  "ssb-screening-test-oir-ppdt-tips": ["oir", "ppdt", "screening"],
  "how-indian-army-navy-air-force-were-formed": ["armed-forces", "history"],
  "ranks-in-indian-army-navy-air-force": ["armed-forces", "ranks"],
  "wars-india-has-fought-since-1947": ["armed-forces", "history"],
  "major-indian-military-operations-since-1947": ["armed-forces", "history"],
  "how-to-write-ppdt-story-format-example": ["ppdt", "psychology-tests", "screening"],
  "tat-tips-write-stories-that-show-olqs": ["tat", "psychology-tests"],
  "wat-tips-positive-sentences-15-seconds": ["wat", "psychology-tests"],
  "srt-tips-situation-reaction-test-answers": ["srt", "psychology-tests"],
  "sdt-self-description-test-how-to-write": ["sdt", "psychology-tests"],
};

const all: Post[] = [
  ...processPosts,
  ...psychologyPosts,
  ...speakingPosts,
  ...forcesPosts,
  ...gtoPosts,
  ...prepPosts,
  ...entryPosts,
].map((p) => ({ ...p, tags: p.tags ?? LEGACY_TAGS[p.slug] ?? [] }));

export const POSTS: Post[] = all.sort((a, b) => b.date.localeCompare(a.date) || a.title.localeCompare(b.title));

export const getPost = (slug: string) => POSTS.find((p) => p.slug === slug);

export const slugify = (t: string) => t.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

export type Taxon = { slug: string; name: string; count: number };

/** Categories derived from the posts so the index never drifts from the content. */
export const CATEGORIES: Taxon[] = Object.values(
  POSTS.reduce<Record<string, Taxon>>((acc, p) => {
    const s = slugify(p.category);
    acc[s] = { slug: s, name: p.category, count: (acc[s]?.count ?? 0) + 1 };
    return acc;
  }, {}),
).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

const TAG_LABELS: Record<string, string> = {
  gto: "GTO", olqs: "OLQs", piq: "PIQ", oir: "OIR", ppdt: "PPDT", tat: "TAT", wat: "WAT", srt: "SRT", sdt: "SDT",
  nda: "NDA", cds: "CDS", afcat: "AFCAT", capf: "CAPF", ncc: "NCC", tes: "TES", gpe: "GPE", pgt: "PGT", hgt: "HGT", fgt: "FGT",
  "ssc-tech": "SSC Tech", "ssb-basics": "SSB basics",
};
export const tagName = (slug: string) => TAG_LABELS[slug] ?? slug.replace(/-/g, " ").replace(/^./, (c) => c.toUpperCase());

export const TAGS: Taxon[] = Object.values(
  POSTS.flatMap((p) => p.tags ?? []).reduce<Record<string, Taxon>>((acc, t) => {
    acc[t] = { slug: t, name: tagName(t), count: (acc[t]?.count ?? 0) + 1 };
    return acc;
  }, {}),
).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

export const POSTS_PER_PAGE = 12;

export type { Block, Post, Source } from "./types";
