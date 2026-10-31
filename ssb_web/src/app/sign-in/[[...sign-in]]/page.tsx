import { SignIn } from "@clerk/nextjs";
import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthShell } from "@/components/auth/auth-shell";

export const metadata: Metadata = { title: "Log in" };

export default function SignInPage() {
  return (
    <AuthShell title="Log in to ReadyKadet">
      <Suspense><SignIn /></Suspense>
    </AuthShell>
  );
}
