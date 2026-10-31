import type { MetadataRoute } from "next";
import { POSTS } from "@/lib/posts";

const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = ["", "/blog", "/radar", "/privacy", "/terms", "/refunds"].map((p) => ({ url: `${base}${p}` }));
  const posts = POSTS.map((p) => ({ url: `${base}/blog/${p.slug}`, lastModified: p.date }));
  return [...pages, ...posts];
}
