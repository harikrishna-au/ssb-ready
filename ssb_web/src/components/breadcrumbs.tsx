import { ChevronRight } from "lucide-react";
import Link from "next/link";

export type Crumb = { label: string; href?: string };

const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

/** Visible trail plus BreadcrumbList data for search engines. The last crumb is the current page. */
export function Breadcrumbs({ items, className = "" }: { items: Crumb[]; className?: string }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.label,
      ...(c.href ? { item: `${site}${c.href}` } : {}),
    })),
  };
  return (
    <>
      <nav aria-label="Breadcrumb" className={className}>
        <ol className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
          {items.map((c, i) => {
            const last = i === items.length - 1;
            return (
              <li key={c.label} className="flex min-w-0 items-center gap-1.5">
                {c.href && !last ? (
                  <Link href={c.href} className="rounded transition-colors hover:text-foreground">{c.label}</Link>
                ) : (
                  <span aria-current={last ? "page" : undefined} className={`truncate ${last ? "text-foreground" : ""}`}>{c.label}</span>
                )}
                {!last && <ChevronRight className="size-3.5 shrink-0 opacity-50" aria-hidden />}
              </li>
            );
          })}
        </ol>
      </nav>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </>
  );
}
