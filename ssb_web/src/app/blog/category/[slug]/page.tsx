import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { CategoryNav, PostCard } from "@/components/site/blog-list";
import { SiteFooter, SiteHeader } from "@/components/site/header";
import { CATEGORIES, POSTS, slugify } from "@/lib/posts";

export function generateStaticParams() {
  return CATEGORIES.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: PageProps<"/blog/category/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const cat = CATEGORIES.find((c) => c.slug === slug);
  if (!cat) return {};
  return {
    title: `${cat.name}: SSB guides`,
    description: `All ReadyKadet guides in the ${cat.name} category: ${cat.count} ${cat.count === 1 ? "guide" : "guides"} for SSB aspirants.`,
    alternates: { canonical: `/blog/category/${cat.slug}` },
  };
}

export default async function CategoryPage({ params }: PageProps<"/blog/category/[slug]">) {
  const { slug } = await params;
  const cat = CATEGORIES.find((c) => c.slug === slug);
  if (!cat) notFound();
  const items = POSTS.filter((p) => slugify(p.category) === slug);
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-14">
        <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Blog", href: "/blog" }, { label: cat.name }]} className="mb-6" />
        <h1 className="text-5xl font-black uppercase leading-none sm:text-6xl">{cat.name}</h1>
        <p className="mt-4 text-muted-foreground">{cat.count} {cat.count === 1 ? "guide" : "guides"}</p>
        <CategoryNav active={slug} />
        <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">{items.map((p) => <PostCard key={p.slug} p={p} />)}</div>
      </main>
      <SiteFooter />
    </>
  );
}
