import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { CategoryNav, PostCard } from "@/components/site/blog-list";
import { SiteFooter, SiteHeader } from "@/components/site/header";
import { POSTS, TAGS, tagName } from "@/lib/posts";

export function generateStaticParams() {
  return TAGS.map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({ params }: PageProps<"/blog/tag/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const tag = TAGS.find((t) => t.slug === slug);
  if (!tag) return {};
  return {
    title: `${tag.name}: SSB guides`,
    description: `ReadyKadet guides tagged ${tag.name}.`,
    alternates: { canonical: `/blog/tag/${tag.slug}` },
    // A tag with a single guide is thin content; keep it out of search results but let crawlers follow links.
    robots: tag.count < 2 ? { index: false, follow: true } : undefined,
  };
}

export default async function TagPage({ params }: PageProps<"/blog/tag/[slug]">) {
  const { slug } = await params;
  const tag = TAGS.find((t) => t.slug === slug);
  if (!tag) notFound();
  const items = POSTS.filter((p) => p.tags?.includes(slug));
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-14">
        <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Blog", href: "/blog" }, { label: tagName(slug) }]} className="mb-6" />
        <h1 className="text-5xl font-black uppercase leading-none sm:text-6xl">{tagName(slug)}</h1>
        <p className="mt-4 text-muted-foreground">{tag.count} {tag.count === 1 ? "guide" : "guides"} on this topic</p>
        <CategoryNav />
        <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">{items.map((p) => <PostCard key={p.slug} p={p} />)}</div>
      </main>
      <SiteFooter />
    </>
  );
}
