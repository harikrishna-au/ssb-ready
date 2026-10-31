import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter, SiteHeader } from "@/components/site/header";
import { POSTS } from "@/lib/posts";

export const metadata: Metadata = { title: "Page not found", robots: { index: false, follow: true } };

const LINKS = [
  ["/", "Home"], ["/blog", "SSB preparation guides"], ["/radar", "Radar: open officer entries"], ["/pricing", "Pricing"],
  ["/nda", "NDA"], ["/cds", "CDS"], ["/afcat", "AFCAT"], ["/capf", "CAPF"],
];

export default function NotFound() {
  const latest = POSTS.slice(0, 4);
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-20">
        <p className="font-display text-7xl font-black text-brass">404</p>
        <h1 className="mt-2 text-4xl font-black uppercase leading-none sm:text-5xl">We could not find that page</h1>
        <p className="mt-4 text-muted-foreground">The link may be old or mistyped. These pages may help.</p>
        <ul className="mt-8 grid gap-2 sm:grid-cols-2">
          {LINKS.map(([href, label]) => (
            <li key={href}><Link href={href} className="flex min-h-11 items-center rounded-lg border border-white/10 px-4 hover:border-primary">{label}</Link></li>
          ))}
        </ul>
        <h2 className="mt-12 text-2xl font-extrabold uppercase">Latest guides</h2>
        <ul className="mt-3">
          {latest.map((p) => <li key={p.slug}><Link href={`/blog/${p.slug}`} className="flex min-h-11 items-center border-b border-white/10 hover:text-primary">{p.title}</Link></li>)}
        </ul>
      </main>
      <SiteFooter />
    </>
  );
}
