"use client";

import { UserButton, useUser } from "@clerk/nextjs";
import { ArrowLeft, BarChart3, ClipboardList, Crown, FileUser, Home, ListChecks, MessagesSquare, Radar, Target } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useStore } from "@/lib/store";
import { usePiq } from "@/lib/use-piq";
import { usePremium } from "@/lib/use-premium";
import { appCrumbs, backTarget } from "@/lib/nav";
import { Breadcrumbs } from "./breadcrumbs";
import { Logo } from "./site/header";

type Item = { href: string; label: string; icon: typeof Home };

const PRACTISE: Item[] = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/tests", label: "Tests", icon: ClipboardList },
  { href: "/interview-guide", label: "Interview", icon: MessagesSquare },
];
const TRACK: Item[] = [
  { href: "/applications", label: "Applications", icon: ListChecks },
  { href: "/olq-profile", label: "OLQ Profile", icon: Target },
  { href: "/history", label: "Progress", icon: BarChart3 },
  { href: "/radar", label: "Radar", icon: Radar },
];
const PROFILE: Item[] = [{ href: "/piq", label: "PIQ", icon: FileUser }];
const MOBILE: Item[] = [PRACTISE[0], PRACTISE[1], PRACTISE[2], TRACK[0], PROFILE[0]];

const isActive = (path: string, href: string) =>
  path === href ||
  (href === "/tests" && /^\/(ppdt|tat|wat|srt|sdt|oir|lecturette)/.test(path)) ||
  (href === "/interview-guide" && path === "/interview");

function NavLink({ item, path, badge }: { item: Item; path: string; badge?: boolean }) {
  const on = isActive(path, item.href);
  const Icon = item.icon;
  return (
    <Link
      href={item.href} aria-current={on ? "page" : undefined}
      className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${on ? "bg-primary/12 text-foreground" : "text-muted-foreground hover:bg-white/5 hover:text-foreground"}`}
    >
      {on && <span className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-primary" aria-hidden />}
      <Icon className={`size-[18px] transition-colors ${on ? "text-primary" : "group-hover:text-foreground"}`} aria-hidden />
      {item.label}
      {badge && <span className="ml-auto rounded-full bg-brass/20 px-2 py-0.5 text-[10px] font-semibold text-brass">Incomplete</span>}
    </Link>
  );
}

export function Sidebar() {
  const path = usePathname();
  const { user } = useUser();
  const exam = useStore((s) => s.prefs.exam);
  const piq = usePiq();
  const piqIncomplete = piq.ready && !piq.completeness.complete;
  const premium = usePremium();
  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-white/[0.06] bg-card/30 p-4 md:flex">
      <div className="px-2 pt-1"><Logo /></div>
      <nav aria-label="App" className="mt-8 flex flex-1 flex-col gap-6">
        <div className="space-y-1">
          <p className="px-3 pb-1 text-xs font-medium text-muted-foreground/70">Practise</p>
          {PRACTISE.map((i) => <NavLink key={i.href} item={i} path={path} />)}
        </div>
        <div className="space-y-1">
          <p className="px-3 pb-1 text-xs font-medium text-muted-foreground/70">Track</p>
          {TRACK.map((i) => <NavLink key={i.href} item={i} path={path} />)}
        </div>
        <div className="space-y-1">
          <p className="px-3 pb-1 text-xs font-medium text-muted-foreground/70">Profile</p>
          {PROFILE.map((i) => <NavLink key={i.href} item={i} path={path} badge={piqIncomplete} />)}
        </div>
      </nav>

      {!premium.loading && !premium.premium && (
        <Link href="/premium" className="mb-3 block rounded-2xl border border-brass/30 bg-brass/10 p-4 transition-colors hover:bg-brass/15">
          <span className="flex items-center gap-2 font-semibold text-brass"><Crown className="size-4" aria-hidden /> Lifetime access</span>
          <span className="mt-1 block text-xs text-muted-foreground">Unlock all 45 pictures for PPDT and TAT.</span>
        </Link>
      )}

      <div className="flex items-center gap-3 rounded-xl border border-white/[0.06] p-2.5">
        <UserButton />
        <Link href="/profile" className="min-w-0 flex-1 leading-tight">
          <span className="block truncate text-sm font-semibold">{user?.firstName ?? "Your account"}</span>
          <span className="block truncate text-xs text-muted-foreground">{exam ? `${exam} aspirant` : "Account settings"}</span>
        </Link>
      </div>
    </aside>
  );
}

/** Sticky top bar: back button on nested pages, breadcrumbs everywhere. */
export function TopBar() {
  const path = usePathname();
  const premium = usePremium();
  const back = backTarget(path);
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-white/[0.06] bg-background/80 px-4 backdrop-blur-md md:px-8">
      {back?.href && (
        <Link
          href={back.href} aria-label={`Back to ${back.label}`}
          className="grid size-9 shrink-0 place-items-center rounded-full border border-white/10 text-muted-foreground transition-colors hover:border-white/30 hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden />
        </Link>
      )}
      <Breadcrumbs items={appCrumbs(path)} className="min-w-0 flex-1" />
      {!premium.loading && !premium.premium && (
        <Link href="/premium" className="hidden shrink-0 items-center gap-1.5 rounded-full border border-brass/40 px-3 py-1.5 text-xs font-semibold text-brass transition-colors hover:bg-brass/10 sm:inline-flex md:hidden">
          <Crown className="size-3.5" aria-hidden /> Lifetime
        </Link>
      )}
      <div className="md:hidden"><UserButton /></div>
    </header>
  );
}

export function BottomNav() {
  const path = usePathname();
  const piq = usePiq();
  const piqIncomplete = piq.ready && !piq.completeness.complete;
  return (
    <nav aria-label="App" className="fixed inset-x-0 bottom-0 z-40 border-t border-white/[0.08] bg-background/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden">
      <ul className="mx-auto grid max-w-lg grid-cols-5">
        {MOBILE.map(({ href, label, icon: Icon }) => {
          const on = isActive(path, href);
          return (
            <li key={href}>
              <Link href={href} aria-current={on ? "page" : undefined} className={`flex min-h-14 flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors ${on ? "text-primary" : "text-muted-foreground"}`}>
                <span className={`relative grid h-7 w-12 place-items-center rounded-full transition-colors ${on ? "bg-primary/15" : ""}`}>
                  <Icon className="size-5" aria-hidden />
                  {href === "/piq" && piqIncomplete && <span className="absolute right-2.5 top-0.5 size-2 rounded-full bg-brass" aria-label="PIQ incomplete" />}
                </span>
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
