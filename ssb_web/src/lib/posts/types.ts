export type Block =
  | { type: "p"; text: string }
  | { type: "h2"; text: string }
  | { type: "h3"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] }
  | { type: "table"; head: string[]; rows: string[][] };

export type Source = { label: string; url: string };

export type Post = {
  slug: string;
  title: string;
  description: string;
  date: string; // ISO yyyy-mm-dd, first published
  /** ISO date of the last substantive change. Falls back to `date`. */
  updated?: string;
  category: string;
  /** Topic tags used for /blog/tag/[slug]. */
  tags?: string[];
  minutes: number;
  cta: { href: string; label: string };
  related: string[];
  /** Official or primary pages a reader can use to confirm the facts in this post. */
  sources?: Source[];
  /** ISO date a person last checked this post against its sources. Missing means it has not been through the fact-check process yet. */
  reviewedOn?: string;
  /** Claims we could not tie to a source. Rendered on the page so readers (and the human reviewer) can find them. */
  verify?: string[];
  body: Block[];
};
