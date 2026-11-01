import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata, Viewport } from "next";
import { Big_Shoulders, Public_Sans } from "next/font/google";
import { dark } from "@clerk/ui/themes";
import { SessionWatcher } from "@/components/session-watcher";
import "./globals.css";

const sans = Public_Sans({ variable: "--font-sans", subsets: ["latin"] });
const display = Big_Shoulders({ variable: "--font-display", subsets: ["latin"] });

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "ReadyKadet — Practice the SSB with instant AI feedback", template: "%s · ReadyKadet" },
  description:
    "Clear the SSB screening round and fix your TAT, WAT, SRT and SDT. Timed practice with AI feedback, lecturette practice and an interview guide for NDA, CDS, AFCAT and CAPF aspirants.",
  icons: {
    icon: [
      { url: "/brand/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  alternates: { canonical: "/" },
  twitter: { card: "summary_large_image", title: "ReadyKadet — Practice the SSB with instant AI feedback", description: "Timed psychology tests and an AI mock interview, scored against Officer Like Qualities." },
  openGraph: {
    type: "website",
    siteName: "ReadyKadet",
    title: "ReadyKadet — Practice the SSB with instant AI feedback",
    description: "Timed psychology tests and an AI mock interview, scored against Officer Like Qualities.",
    images: [{ url: "/og-default.png", width: 1200, height: 630, alt: "ReadyKadet: timed SSB practice" }],
  },
};

/** viewport-fit=cover lets the bottom bar sit above the iPhone home indicator via env(safe-area-inset-*). */
export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#0a0b0f" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${sans.variable} ${display.variable} dark h-full antialiased`}>
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <ClerkProvider
          appearance={{ theme: dark, variables: { colorPrimary: "#4b7bf5", colorBackground: "#1c1e2a", borderRadius: "0.75rem" } }}
          afterSignOutUrl="/" signInFallbackRedirectUrl="/dashboard" signUpFallbackRedirectUrl="/dashboard">
          <SessionWatcher />
          {children}
        </ClerkProvider>
      </body>
    </html>
  );
}