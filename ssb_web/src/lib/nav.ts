import type { Crumb } from "@/components/breadcrumbs";

const LABELS: Record<string, string> = {
  dashboard: "Home",
  tests: "Tests",
  ppdt: "PPDT", tat: "TAT", wat: "WAT", srt: "SRT", sdt: "SDT", oir: "OIR",
  lecturette: "Lecturette",
  "interview-guide": "Interview guide",
  interview: "Mock interview",
  applications: "Applications",
  history: "Progress",
  "olq-profile": "OLQ Profile",
  premium: "Lifetime access",
  radar: "Radar",
  piq: "PIQ",
  profile: "Account",
  onboarding: "Welcome",
};
const TESTS = ["ppdt", "tat", "wat", "srt", "sdt", "oir", "lecturette"];

/** Breadcrumb trail for an in-app path. Always starts at Home. */
export function appCrumbs(path: string): Crumb[] {
  const seg = path.split("/").filter(Boolean)[0] ?? "dashboard";
  const home: Crumb = { label: "Home", href: "/dashboard" };
  if (seg === "dashboard") return [{ label: "Home" }];
  const here: Crumb = { label: LABELS[seg] ?? seg };
  if (TESTS.includes(seg)) return [home, { label: "Tests", href: "/tests" }, here];
  if (seg === "interview") return [home, { label: "Interview guide", href: "/interview-guide" }, here];
  return [home, here];
}

/** Where the back button goes: one level up in the trail, or null on top-level pages. */
export function backTarget(path: string): Crumb | null {
  const trail = appCrumbs(path);
  return trail.length > 1 ? (trail[trail.length - 2] as Crumb) : null;
}
