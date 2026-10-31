import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { CategoryNav, Pagination, PostCard } from "@/components/site/blog-list";
import { SiteFooter, SiteHeader } from "@/components/site/header";
import { POSTS, POSTS_PER_PAGE } from "@/lib/posts";

const pages = Math.ceil(POSTS.length / POSTS_PER_PAGE);

export function generateStaticParams() {
  return Array.from({ length: Math.max(pages - 1, 0) }, (_, i) => ({ n: String(i + 2) }));
}

export async function generateMetadata({ params }: PageProps<"/blog/page/[n]">): Promise<Metadata> {
  const { n } = await params;
  return { title: `SSB preparation guides, page ${n}`, alternates: { canonical: `/blog/page/${n}` } };
}

export default async function BlogPage({ params }: PageProps<"/blog/page/[n]">) {
  const { n } = await params;
  const page = Number(n);
  if (!Number.isInteger(page) || page < 1 || page > pages) notFound();
  if (page === 1) redirect("/blog");
  const items = POSTS.slice((page - 1) * POSTS_PER_PAGE, page * POSTS_PER_PAGE);
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-14">
        <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Blog", href: "/blog" }, { label: `Page ${page}` }]} className="mb-6" />
        <h1 className="text-5xl font-black uppercase leading-none sm:text-6xl">SSB preparation guides, page {page}</h1>
        <CategoryNav />
        <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">{items.map((p) => <PostCard key={p.slug} p={p} />)}</div>
        <Pagination page={page} pages={pages} />
      </main>
      <SiteFooter />
    </>
  );
}
