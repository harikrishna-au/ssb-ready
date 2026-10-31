import { POSTS } from "@/lib/posts";
import { abs, SITE_NAME } from "@/lib/site";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");


export function GET() {
  const items = POSTS.map(
    (p) => `<item><title>${esc(p.title)}</title><link>${abs(`/blog/${p.slug}`)}</link><guid isPermaLink="true">${abs(`/blog/${p.slug}`)}</guid><pubDate>${new Date(`${p.date}T00:00:00Z`).toUTCString()}</pubDate><category>${esc(p.category)}</category><description>${esc(p.description)}</description></item>`,
  ).join("");
  const xml = `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel><title>${SITE_NAME} SSB preparation guides</title><link>${abs("/blog")}</link><description>Plain-English guides to the SSB for NDA, CDS, AFCAT and CAPF aspirants.</description><language>en-IN</language><atom:link href="${abs("/blog/rss.xml")}" rel="self" type="application/rss+xml"/>${items}</channel></rss>`;
  return new Response(xml, { headers: { "content-type": "application/rss+xml; charset=utf-8" } });
}
