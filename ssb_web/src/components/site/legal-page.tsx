import { Breadcrumbs } from "../breadcrumbs";
import { SiteFooter, SiteHeader } from "./header";
import { LEGAL } from "@/lib/legal";

export function LegalPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-14">
        <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: title }]} className="mb-6" />
        <h1 className="text-5xl font-black uppercase leading-none">{title}</h1>
        <p className="mt-3 text-sm text-muted-foreground">Effective {LEGAL.effectiveDate}</p>
        <div className="mt-8 space-y-4 leading-relaxed text-muted-foreground [&_h2]:mt-10 [&_h2]:text-2xl [&_h2]:font-extrabold [&_h2]:uppercase [&_h2]:text-foreground [&_li]:ml-5 [&_li]:list-disc [&_a]:text-primary">
          {children}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
