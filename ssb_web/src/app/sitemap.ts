import type { MetadataRoute } from "next";
import { CATEGORIES, POSTS, POSTS_PER_PAGE, TAGS } from "@/lib/posts";
import { abs } from "@/lib/site";

// lastModified values come from content dates, never from "now", so the sitemap only changes when content does.
const LAUNCH = "2026-10-31";
const latest = POSTS.reduce((m, p) => ((p.updated ?? p.date) > m ? (p.updated ?? p.date) : m), LAUNCH);

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = Math.ceil(POSTS.length / POSTS_PER_PAGE);
  const fixed: [string, string, number][] = [
    ["", LAUNCH, 1], ["/pricing", LAUNCH, 0.9], ["/nda", LAUNCH, 0.9], ["/cds", LAUNCH, 0.9], ["/afcat", LAUNCH, 0.9], ["/capf", LAUNCH, 0.8],
    ["/blog", latest, 0.8], ["/radar", LAUNCH, 0.7], ["/radar/nda", LAUNCH, 0.6], ["/radar/cds", LAUNCH, 0.6], ["/radar/afcat", LAUNCH, 0.6], ["/privacy", LAUNCH, 0.3], ["/terms", LAUNCH, 0.3], ["/refunds", LAUNCH, 0.3],
  ];
  const paged = Array.from({ length: Math.max(pages - 1, 0) }, (_, i) => `/blog/page/${i + 2}`);
  return [
    ...fixed.map(([p, d, priority]) => ({ url: abs(p || "/"), lastModified: d, priority })),
    ...paged.map((p) => ({ url: abs(p), lastModified: latest, priority: 0.4 })),
    ...CATEGORIES.map((c) => ({
      url: abs(`/blog/category/${c.slug}`), priority: 0.5,
      lastModified: POSTS.filter((p) => p.category === c.name).reduce((m, p) => ((p.updated ?? p.date) > m ? (p.updated ?? p.date) : m), LAUNCH),
    })),
    // Single-post tags are noindex, so keep them out of the sitemap.
    ...TAGS.filter((t) => t.count >= 2).map((t) => ({ url: abs(`/blog/tag/${t.slug}`), lastModified: latest, priority: 0.4 })),
    ...POSTS.map((p) => ({ url: abs(`/blog/${p.slug}`), lastModified: p.updated ?? p.date, priority: 0.7 })),
  ];
}
