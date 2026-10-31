import type { Block, Source } from "./types";

/** Short constructors so long posts stay readable. */
export const p = (text: string): Block => ({ type: "p", text });
export const h2 = (text: string): Block => ({ type: "h2", text });
export const h3 = (text: string): Block => ({ type: "h3", text });
export const ul = (...items: string[]): Block => ({ type: "ul", items });
export const ol = (...items: string[]): Block => ({ type: "ol", items });
export const table = (head: string[], ...rows: string[][]): Block => ({ type: "table", head, rows });

/** Official or primary pages. These are home or index pages, so they do not go stale; always read the current notice. */
export const SRC = {
  upsc: { label: "UPSC, official site (examination notices)", url: "https://upsc.gov.in/" },
  army: { label: "Join Indian Army, official recruitment portal", url: "https://joinindianarmy.nic.in/" },
  navy: { label: "Join Indian Navy, official recruitment portal", url: "https://www.joinindiannavy.gov.in/" },
  iaf: { label: "Indian Air Force, official site", url: "https://indianairforce.nic.in/" },
  afcat: { label: "AFCAT, official portal (CDAC)", url: "https://afcat.cdac.in/" },
  mod: { label: "Ministry of Defence, official site", url: "https://mod.gov.in/" },
  pib: { label: "Press Information Bureau, official releases", url: "https://pib.gov.in/" },
  mha: { label: "Ministry of Home Affairs, official site", url: "https://www.mha.gov.in/" },
  ncc: { label: "National Cadet Corps, official site", url: "https://indiancc.nic.in/" },
  constitution: { label: "Constitution of India, Legislative Department", url: "https://legislative.gov.in/constitution-of-india/" },
} satisfies Record<string, Source>;

export const REVIEWED = "2026-10-31";
export const PUBLISHED = "2026-10-31";
