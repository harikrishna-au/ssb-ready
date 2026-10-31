import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { SiteFooter, SiteHeader } from "@/components/site/header";
import { POSTS } from "@/lib/posts";

export const metadata: Metadata = {
  title: "SSB preparation blog",
  description: "Guides to the SSB process, OLQs, PPDT, TAT, WAT, SRT, SDT, lecturette and the personal interview, with practical tips for NDA, CDS and AFCAT aspirants.",
  alternates: { canonical: "/blog" },
};

const fmt = (iso: string) => new Date(iso + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });

export default function BlogIndex() {
  const [featured, ...rest] = POSTS;
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-14">
        <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Blog" }]} className="mb-6" />
        <h1 className="text-5xl font-black uppercase leading-none sm:text-6xl lg:text-7xl">SSB preparation guides</h1>
        <p className="mt-4 max-w-xl text-lg text-muted-foreground">
          Plain-English guides to every round of the SSB, written for NDA, CDS and AFCAT aspirants.
        </p>

        <Link href={`/blog/${featured.slug}`} className="group mt-12 block rounded-2xl border border-white/10 bg-card/60 p-7 transition-colors hover:border-primary md:p-10">
          <p className="text-sm text-brass">{featured.category} · Latest</p>
          <h2 className="mt-2 max-w-3xl text-4xl font-extrabold leading-tight group-hover:text-primary sm:text-5xl">{featured.title}</h2>
          <p className="mt-3 max-w-2xl text-lg text-muted-foreground">{featured.description}</p>
          <p className="mt-4 text-sm text-muted-foreground/80">
            <time dateTime={featured.date}>{fmt(featured.date)}</time> · {featured.minutes} min read
          </p>
        </Link>

        <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {rest.map((p) => (
            <article key={p.slug}>
              <Link href={`/blog/${p.slug}`} className="group flex h-full flex-col rounded-2xl border border-white/10 p-6 transition-colors hover:border-primary">
                <p className="text-sm text-brass">{p.category}</p>
                <h2 className="mt-1 text-2xl font-extrabold leading-tight group-hover:text-primary">{p.title}</h2>
                <p className="mt-2 flex-1 text-sm text-muted-foreground">{p.description}</p>
                <p className="mt-4 text-sm text-muted-foreground/80">
                  <time dateTime={p.date}>{fmt(p.date)}</time> · {p.minutes} min read
                </p>
              </Link>
            </article>
          ))}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
