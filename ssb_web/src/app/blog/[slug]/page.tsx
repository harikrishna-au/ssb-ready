import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { SiteFooter, SiteHeader } from "@/components/site/header";
import { getPost, POSTS, type Block } from "@/lib/posts";

const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
const fmt = (iso: string) => new Date(iso + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });

export function generateStaticParams() {
  return POSTS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps<"/blog/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) return {};
  return {
    title: post.title,
    description: post.description,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: { type: "article", title: post.title, description: post.description, publishedTime: post.date },
  };
}

const slugify = (t: string) => t.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

function render(b: Block, i: number) {
  switch (b.type) {
    case "h2": return <h2 key={i} id={slugify(b.text)} className="scroll-mt-24">{b.text}</h2>;
    case "h3": return <h3 key={i}>{b.text}</h3>;
    case "p": return <p key={i}>{b.text}</p>;
    case "ul": return <ul key={i}>{b.items.map((t) => <li key={t}>{t}</li>)}</ul>;
    case "ol": return <ol key={i}>{b.items.map((t) => <li key={t}>{t}</li>)}</ol>;
    case "table":
      return (
        <div key={i} className="not-prose my-8 overflow-x-auto rounded-2xl border border-white/10">
          <table className="w-full min-w-[34rem] text-left text-sm">
            <thead className="bg-white/[0.04] text-muted-foreground">
              <tr>{b.head.map((h) => <th key={h} scope="col" className="px-4 py-3 font-semibold">{h}</th>)}</tr>
            </thead>
            <tbody>
              {b.rows.map((r, ri) => (
                <tr key={ri} className="border-t border-white/10">
                  {r.map((c, ci) => <td key={ci} className={`px-4 py-3 ${ci === 0 ? "font-semibold" : "text-muted-foreground"}`}>{c}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
  }
}

async function Post({ params }: PageProps<"/blog/[slug]">) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) notFound();

  const related = post.related.map(getPost).filter((p): p is NonNullable<typeof p> => !!p);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    author: { "@type": "Organization", name: "ReadyKadet" },
    publisher: { "@type": "Organization", name: "ReadyKadet" },
    mainEntityOfPage: `${site}/blog/${post.slug}`,
  };

  const toc = post.body.filter((b): b is Extract<Block, { type: "h2" }> => b.type === "h2");

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-12">
        <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Blog", href: "/blog" }, { label: post.title }]} />
        <div className="mt-4 grid gap-12 lg:grid-cols-[minmax(0,1fr)_21rem]">
          <article className="min-w-0">
            <header>
              <p className="text-sm text-brass">{post.category}</p>
              <h1 className="mt-1 max-w-4xl text-5xl font-black leading-[1.02] sm:text-6xl lg:text-7xl">{post.title}</h1>
              <p className="mt-4 text-muted-foreground">{post.description}</p>
              <p className="mt-3 text-sm text-muted-foreground/80">
                <time dateTime={post.date}>{fmt(post.date)}</time> · {post.minutes} min read
              </p>
            </header>
            <div className="prose prose-invert prose-lg mt-10 max-w-[68ch] prose-headings:font-display prose-h2:text-4xl prose-h2:font-extrabold prose-h2:uppercase prose-h3:text-2xl prose-a:text-primary prose-p:leading-relaxed">
              {post.body.map(render)}
            </div>
          </article>

          <aside className="space-y-8 lg:sticky lg:top-24 lg:self-start">
            {toc.length > 2 && (
              <nav aria-label="In this guide" className="rounded-2xl border border-white/10 p-5">
                <p className="text-sm font-semibold">In this guide</p>
                <ul className="mt-3 space-y-2 text-sm">
                  {toc.map((h) => (
                    <li key={h.text}><a href={`#${slugify(h.text)}`} className="text-muted-foreground hover:text-foreground">{h.text}</a></li>
                  ))}
                </ul>
              </nav>
            )}
            <div className="rounded-2xl border border-primary/30 bg-primary/10 p-5">
              <p className="text-xl font-semibold">Put it into practice.</p>
              <p className="mt-1 text-sm text-muted-foreground">Timed tests with feedback on every written attempt.</p>
              <Link href={post.cta.href} className="mt-4 inline-flex rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground">{post.cta.label}</Link>
            </div>
            {related.length > 0 && (
              <section aria-label="Related guides">
                <p className="text-sm font-semibold">Keep reading</p>
                {related.map((r) => (
                  <Link key={r.slug} href={`/blog/${r.slug}`} className="block border-b border-white/10 py-3 text-sm hover:text-primary">
                    <span className="font-semibold">{r.title}</span>
                    <span className="block text-muted-foreground">{r.minutes} min read</span>
                  </Link>
                ))}
              </section>
            )}
          </aside>
        </div>
      </main>
      <SiteFooter />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </>
  );
}

export default function PostPage(props: PageProps<"/blog/[slug]">) {
  return (
    <Suspense fallback={<div className="mx-auto min-h-screen w-full max-w-6xl px-5 py-12"><div className="h-14 w-2/3 animate-pulse rounded-lg bg-white/5" /></div>}>
      <Post {...props} />
    </Suspense>
  );
}
