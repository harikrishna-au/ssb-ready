import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { SiteFooter, SiteHeader } from "@/components/site/header";
import { NewsletterForm } from "@/components/site/newsletter-form";
import { ReadingProgress } from "@/components/site/reading-progress";
import { abs, fmtDate, SITE_NAME } from "@/lib/site";
import { getPost, POSTS, slugify, tagName, type Block, type Post } from "@/lib/posts";

export function generateStaticParams() {
  return POSTS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps<"/blog/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) return {};
  const url = `/blog/${post.slug}`;
  return {
    title: post.title,
    description: post.description,
    alternates: { canonical: url },
    keywords: post.tags?.map(tagName),
    openGraph: { type: "article", url, title: post.title, description: post.description, publishedTime: post.date, modifiedTime: post.updated ?? post.date, section: post.category, tags: post.tags?.map(tagName) },
    twitter: { card: "summary_large_image", title: post.title, description: post.description },
  };
}

function render(b: Block, i: number) {
  switch (b.type) {
    case "h2": return <h2 key={i} id={slugify(b.text)} className="scroll-mt-24">{b.text}</h2>;
    case "h3": return <h3 key={i}>{b.text}</h3>;
    case "p": return <p key={i}>{b.text}</p>;
    case "ul": return <ul key={i}>{b.items.map((t) => <li key={t}>{t}</li>)}</ul>;
    case "ol": return <ol key={i}>{b.items.map((t) => <li key={t}>{t}</li>)}</ol>;
    case "table":
      return (
        <div key={i} className="not-prose my-8 overflow-x-auto rounded-2xl border border-white/10" tabIndex={0} role="region" aria-label="Table, scrolls sideways on small screens">
          <table className="w-full min-w-[34rem] text-left text-sm">
            <thead className="bg-white/[0.04] text-muted-foreground">
              <tr>{b.head.map((h, hi) => <th key={hi} scope="col" className="px-4 py-3 font-semibold">{h}</th>)}</tr>
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

/** Explicit related posts first, then posts that share the most tags. */
function relatedFor(post: Post): Post[] {
  const picked = post.related.map(getPost).filter((p): p is Post => !!p);
  if (picked.length >= 3) return picked.slice(0, 4);
  const tags = new Set(post.tags ?? []);
  const extra = POSTS.filter((p) => p.slug !== post.slug && !picked.includes(p))
    .map((p) => ({ p, score: (p.tags ?? []).filter((t) => tags.has(t)).length }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((x) => x.p);
  return [...picked, ...extra].slice(0, 4);
}

async function PostView({ params }: PageProps<"/blog/[slug]">) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) notFound();

  const related = relatedFor(post);
  const modified = post.updated ?? post.date;
  const catSlug = slugify(post.category);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    dateModified: modified,
    articleSection: post.category,
    keywords: post.tags?.map(tagName).join(", "),
    image: [abs(`/blog/${post.slug}/opengraph-image`)],
    author: { "@type": "Organization", name: SITE_NAME, url: abs("/") },
    publisher: { "@type": "Organization", name: SITE_NAME, logo: { "@type": "ImageObject", url: abs("/icon-512.png") } },
    mainEntityOfPage: abs(`/blog/${post.slug}`),
    ...(post.sources?.length ? { citation: post.sources.map((x) => x.url) } : {}),
  };
  const toc = post.body.filter((b): b is Extract<Block, { type: "h2" }> => b.type === "h2");

  return (
    <>
      <SiteHeader />
      <ReadingProgress targetId="article-body" />
      <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-12">
        <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Blog", href: "/blog" }, { label: post.category, href: `/blog/category/${catSlug}` }, { label: post.title }]} />
        <div className="mt-4 grid gap-12 lg:grid-cols-[minmax(0,1fr)_21rem]">
          <article className="min-w-0">
            <header>
              <p className="text-sm"><Link href={`/blog/category/${catSlug}`} className="text-brass hover:underline">{post.category}</Link></p>
              <h1 className="mt-1 max-w-4xl text-4xl font-black leading-[1.05] sm:text-6xl lg:text-7xl">{post.title}</h1>
              <p className="mt-4 text-muted-foreground">{post.description}</p>
              <p className="mt-3 text-sm text-muted-foreground">
                Published <time dateTime={post.date}>{fmtDate(post.date)}</time>
                {modified !== post.date && <> · Updated <time dateTime={modified}>{fmtDate(modified)}</time></>} · {post.minutes} min read
              </p>
            </header>
            <div id="article-body">
              <div className="prose prose-invert prose-lg mt-10 max-w-[68ch] prose-headings:font-display prose-h2:text-3xl prose-h2:font-extrabold prose-h2:uppercase sm:prose-h2:text-4xl prose-h3:text-2xl prose-a:text-primary prose-p:leading-relaxed">
                {post.body.map(render)}
              </div>

              {post.verify && post.verify.length > 0 && (
                <aside aria-label="Confirm before relying on this" className="mt-10 max-w-[68ch] rounded-2xl border border-brass/40 bg-brass/10 p-5">
                  <p className="font-semibold text-brass">Confirm before relying on this</p>
                  <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">{post.verify.map((v) => <li key={v}>{v}</li>)}</ul>
                </aside>
              )}

              <section aria-label="Sources and review" className="mt-8 max-w-[68ch] rounded-2xl border border-white/10 p-5 text-sm">
                {post.sources && post.reviewedOn ? (
                  <>
                    <p className="font-semibold">Sources and where to confirm</p>
                    <ul className="mt-2 list-disc space-y-1 pl-5">
                      {post.sources.map((src) => <li key={src.url}><a className="text-primary underline underline-offset-2" href={src.url} rel="noopener noreferrer" target="_blank">{src.label}</a></li>)}
                    </ul>
                    <p className="mt-3 text-muted-foreground">Last reviewed <time dateTime={post.reviewedOn}>{fmtDate(post.reviewedOn)}</time>. ReadyKadet is independent and not affiliated with any recruiting body. Dates, age limits and eligibility change with each notice, so always check the current official notice.</p>
                  </>
                ) : (
                  <p className="text-muted-foreground">This guide has not yet been through our source review. Treat it as background reading and check facts, dates and eligibility on the official recruitment sites before relying on them.</p>
                )}
              </section>
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
              <Link href={post.cta.href} className="mt-4 inline-flex min-h-11 items-center rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground">{post.cta.label}</Link>
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
            {post.tags && post.tags.length > 0 && (
              <section aria-label="Topics">
                <p className="text-sm font-semibold">Topics</p>
                <ul className="mt-2 flex flex-wrap gap-2">
                  {post.tags.map((t) => <li key={t}><Link href={`/blog/tag/${t}`} className="inline-flex min-h-11 items-center rounded-full border border-white/10 px-3 text-xs text-muted-foreground hover:text-foreground">{tagName(t)}</Link></li>)}
                </ul>
              </section>
            )}
            <section aria-label="Weekly digest" className="rounded-2xl border border-white/10 p-5">
              <p className="font-semibold">Radar digest</p>
              <p className="mb-3 mt-1 text-sm text-muted-foreground">Open officer-entry dates and one prep guide, in your inbox.</p>
              <NewsletterForm source="blog-post" compact />
            </section>
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
    <Suspense fallback={<div className="mx-auto min-h-screen w-full max-w-6xl px-5 py-12"><div className="h-14 w-2/3 animate-pulse rounded-lg bg-white/5 motion-reduce:animate-none" /></div>}>
      <PostView {...props} />
    </Suspense>
  );
}
