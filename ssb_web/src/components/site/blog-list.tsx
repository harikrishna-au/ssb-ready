import Link from "next/link";
import { CATEGORIES, slugify, tagName, type Post } from "@/lib/posts";
import { fmtDate } from "@/lib/site";

export function PostCard({ p }: { p: Post }) {
  return (
    <article>
      <Link href={`/blog/${p.slug}`} className="group flex h-full flex-col rounded-2xl border border-white/10 p-6 transition-colors hover:border-primary">
        <p className="text-sm text-brass">{p.category}</p>
        <h2 className="mt-1 break-words text-2xl font-extrabold leading-tight group-hover:text-primary">{p.title}</h2>
        <p className="mt-2 flex-1 text-sm text-muted-foreground">{p.description}</p>
        <p className="mt-4 text-sm text-muted-foreground">
          <time dateTime={p.date}>{fmtDate(p.date)}</time> · {p.minutes} min read
        </p>
      </Link>
    </article>
  );
}

export function CategoryNav({ active }: { active?: string }) {
  return (
    <nav aria-label="Blog categories" className="mt-8">
      <ul className="flex flex-wrap gap-2">
        <li><Link href="/blog" aria-current={!active ? "page" : undefined} className={`inline-flex min-h-11 items-center rounded-full border px-4 text-sm ${!active ? "border-primary bg-primary/15" : "border-white/10 text-muted-foreground hover:text-foreground"}`}>All</Link></li>
        {CATEGORIES.map((c) => (
          <li key={c.slug}>
            <Link href={`/blog/category/${c.slug}`} aria-current={active === c.slug ? "page" : undefined} className={`inline-flex min-h-11 items-center rounded-full border px-4 text-sm ${active === c.slug ? "border-primary bg-primary/15" : "border-white/10 text-muted-foreground hover:text-foreground"}`}>
              {c.name} <span className="ml-1.5 text-xs text-muted-foreground">{c.count}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function Pagination({ page, pages }: { page: number; pages: number }) {
  if (pages <= 1) return null;
  const href = (n: number) => (n === 1 ? "/blog" : `/blog/page/${n}`);
  return (
    <nav aria-label="Pagination" className="mt-12 flex flex-wrap items-center justify-center gap-2">
      {page > 1 && <Link rel="prev" href={href(page - 1)} className="inline-flex min-h-11 items-center rounded-lg border border-white/10 px-4 text-sm">Previous</Link>}
      {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
        <Link key={n} href={href(n)} aria-current={n === page ? "page" : undefined} aria-label={`Page ${n}`} className={`inline-flex size-11 items-center justify-center rounded-lg border text-sm ${n === page ? "border-primary bg-primary/15 font-semibold" : "border-white/10 text-muted-foreground"}`}>{n}</Link>
      ))}
      {page < pages && <Link rel="next" href={href(page + 1)} className="inline-flex min-h-11 items-center rounded-lg border border-white/10 px-4 text-sm">Next</Link>}
    </nav>
  );
}

export { slugify, tagName };
