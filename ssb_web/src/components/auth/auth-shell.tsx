import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/site/header";

/** Shared frame for sign-in and sign-up: logo, a way back, and room to breathe. */
export function AuthShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between px-5 py-4">
        <Logo />
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
          <ArrowLeft className="size-4" aria-hidden /> Back to home
        </Link>
      </header>
      <main className="flex flex-1 flex-col items-center justify-center gap-6 px-4 pb-16">
        <h1 className="sr-only">{title}</h1>
        {children}
      </main>
    </div>
  );
}
