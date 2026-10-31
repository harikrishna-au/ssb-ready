export type Block =
  | { type: "p"; text: string }
  | { type: "h2"; text: string }
  | { type: "h3"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] }
  | { type: "table"; head: string[]; rows: string[][] };

export type Post = {
  slug: string;
  title: string;
  description: string;
  date: string; // ISO yyyy-mm-dd
  category: string;
  minutes: number;
  cta: { href: string; label: string };
  related: string[];
  body: Block[];
};
