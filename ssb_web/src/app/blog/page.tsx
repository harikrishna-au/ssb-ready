import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { CategoryNav, Pagination, PostCard } from "@/components/site/blog-list";
import { SiteFooter, SiteHeader } from "@/components/site/header";
import { NewsletterForm } from "@/components/site/newsletter-form";
import { POSTS, POSTS_PER_PAGE } from "@/lib/posts";
import { fmtDate } from "@/lib/site";

export const metadata: Metadata = {
  title: "SSB preparation blog",
  description: "Guides to the SSB process, OLQs, GTO tasks, PPDT, TAT, WAT, SRT, SDT, lecturette and the personal interview, for NDA, CDS, AFCAT and CAPF aspirants.",
  alternates: { canonical: "/blog", types: { "application/rss+xml": "/blog/rss.xml" } },
};

export default function BlogIndex() {
  const pages = Math.ceil(POSTS.length / POSTS_PER_PAGE);
  const [featured, ...rest] = POSTS.slice(0, POSTS_PER_PAGE);
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-14">
        <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Blog" }]} className="mb-6" />
        <h1 className="text-5xl font-black uppercase leading-none sm:text-6xl lg:text-7xl">SSB preparation guides</h1>
        <p className="mt-4 max-w-xl text-lg text-muted-foreground">
          Plain-English guides to every round of the SSB, written for NDA, CDS, AFCAT and CAPF aspirants. Each guide lists its sources and the date it was last reviewed.
        </p>
        <CategoryNav />

        <Link href={`/blog/${featured.slug}`} className="group mt-10 block rounded-2xl border border-white/10 bg-card/60 p-7 transition-colors hover:border-primary md:p-10">
          <p className="text-sm text-brass">{featured.category} · Latest</p>
          <h2 className="mt-2 max-w-3xl break-words text-3xl font-extrabold leading-tight group-hover:text-primary sm:text-5xl">{featured.title}</h2>
          <p className="mt-3 max-w-2xl text-lg text-muted-foreground">{featured.description}</p>
          <p className="mt-4 text-sm text-muted-foreground">
            <time dateTime={featured.date}>{fmtDate(featured.date)}</time> · {featured.minutes} min read
          </p>
        </Link>

        <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {rest.map((p) => <PostCard key={p.slug} p={p} />)}
        </div>
        <Pagination page={1} pages={pages} />

        <section aria-label="Weekly digest" className="mt-16 max-w-2xl rounded-2xl border border-white/10 bg-card/40 p-7">
          <h2 className="text-3xl font-extrabold uppercase">Radar digest</h2>
          <p className="mb-4 mt-2 text-muted-foreground">Open officer-entry dates and one prep guide each week. Free.</p>
          <NewsletterForm source="blog-index" />
        </section>
        <p className="mt-8 text-sm text-muted-foreground"><Link className="underline" href="/blog/rss.xml">RSS feed</Link></p>
      </main>
      <SiteFooter />
    </>
  );
}
