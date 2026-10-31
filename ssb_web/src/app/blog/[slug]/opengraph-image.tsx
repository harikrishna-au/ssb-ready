import { ogCard, OG_SIZE } from "@/components/site/og";
import { getPost, POSTS } from "@/lib/posts";

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "ReadyKadet guide";

export function generateStaticParams() {
  return POSTS.map((p) => ({ slug: p.slug }));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getPost(slug);
  return ogCard({ eyebrow: post?.category ?? "Guide", title: post?.title ?? "SSB preparation guide" });
}
