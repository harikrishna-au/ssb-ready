import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { SiteFooter, SiteHeader } from "@/components/site/header";
import { InviteLink } from "@/components/site/invite-link";

export const metadata: Metadata = {
  title: "Invite a friend",
  description: "Share ReadyKadet with a friend who is preparing for the SSB.",
  alternates: { canonical: "/invite" },
  robots: { index: false, follow: true },
};

export default function Invite() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-5 py-14">
        <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Invite a friend" }]} className="mb-6" />
        <h1 className="text-5xl font-black uppercase leading-none">Invite a friend</h1>
        <p className="mt-4 text-muted-foreground">Know someone preparing for the SSB? Send them the sign-up link. Practice is free.</p>
        <div className="mt-8"><InviteLink /></div>
        <p className="mt-8 rounded-xl border border-white/10 p-4 text-sm text-muted-foreground">There is no reward for inviting a friend yet, and invites are not tracked. If that changes, this page will say so.</p>
      </main>
      <SiteFooter />
    </>
  );
}
