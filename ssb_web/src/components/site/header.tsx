import { Show, UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { Suspense } from "react";
import { MobileMenu } from "./mobile-menu";

/** ReadyKadet mark: two stacked chevrons on a blue tile. Source of truth: public/brand/mark.svg */
export function LogoMark({ className = "size-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 128 128" className={className} aria-hidden="true" focusable="false">
      <rect width="128" height="128" rx="28" fill="#4b7bf5" />
      <path d="M26 64 L64 34 L102 64" fill="none" stroke="#f5a623" strokeWidth="13" />
      <path d="M26 94 L64 64 L102 94" fill="none" stroke="#fff" strokeWidth="13" />
    </svg>
  );
}

export function Logo({ className = "" }: { className?: string }) {
  return (
    <Link href="/" className={`flex items-center gap-2.5 ${className}`}>
      <LogoMark className="size-8" />
      <span className="font-display text-2xl font-black uppercase tracking-wide">ReadyKadet</span>
    </Link>
  );
}

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-5">
        <Logo />
        <nav className="hidden items-center gap-1 rounded-full border border-white/[0.08] bg-card/50 p-1 text-sm md:flex" aria-label="Main">
          {[["/radar", "Radar"], ["/#tests", "Tests"], ["/#pricing", "Pricing"], ["/blog", "Blog"], ["/#faq", "FAQ"]].map(([href, label]) => (
            <Link key={href} href={href} className="rounded-full px-4 py-1.5 text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground">{label}</Link>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <Suspense>
            <Show when="signed-out">
              <Link href="/sign-in" className="hidden text-sm text-muted-foreground transition-colors hover:text-foreground sm:block">Log in</Link>
              <Link href="/sign-up" className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground transition-transform hover:-translate-y-px">Start free</Link>
            </Show>
            <Show when="signed-in">
              <Link href="/dashboard" className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground transition-transform hover:-translate-y-px">Dashboard</Link>
              <UserButton />
            </Show>
          </Suspense>
          <MobileMenu />
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-white/5">
      <div className="mx-auto grid max-w-6xl gap-8 px-5 py-12 md:grid-cols-[1.4fr_1fr_1fr]">
        <div className="space-y-3">
          <Logo />
          <p className="max-w-xs text-sm text-muted-foreground">
            Practice for the Services Selection Board with timed tests and feedback on every attempt.
          </p>
          <p className="max-w-sm text-xs text-muted-foreground/70">
            ReadyKadet is an independent practice tool. It is not affiliated with the Indian Armed Forces, the Services Selection Board or any recruiting body.
          </p>
        </div>
        <nav aria-label="Product" className="space-y-2 text-sm text-muted-foreground">
          <p className="font-semibold text-foreground">Product</p>
          <Link className="block hover:text-foreground" href="/#tests">Tests</Link>
          <Link className="block hover:text-foreground" href="/radar">Radar</Link>
          <Link className="block hover:text-foreground" href="/#pricing">Pricing</Link>
          <Link className="block hover:text-foreground" href="/#faq">FAQ</Link>
          <Link className="block hover:text-foreground" href="/blog">Blog</Link>
        </nav>
        <nav aria-label="Legal" className="space-y-2 text-sm text-muted-foreground">
          <p className="font-semibold text-foreground">Legal</p>
          <Link className="block hover:text-foreground" href="/privacy">Privacy policy</Link>
          <Link className="block hover:text-foreground" href="/terms">Terms of use</Link>
          <Link className="block hover:text-foreground" href="/refunds">Refund policy</Link>
          <a className="block hover:text-foreground" href="mailto:support@readykadet.com">support@readykadet.com</a>
        </nav>
      </div>
    </footer>
  );
}
