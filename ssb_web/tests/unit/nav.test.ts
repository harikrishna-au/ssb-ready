import { describe, expect, it } from "vitest";
import { appCrumbs, backTarget } from "@/lib/nav";
import { TESTS } from "@/lib/tests";

describe("appCrumbs", () => {
  it("shows only Home on the dashboard and on the root", () => {
    expect(appCrumbs("/dashboard")).toEqual([{ label: "Home" }]);
    expect(appCrumbs("/")).toEqual([{ label: "Home" }]);
  });
  it("nests every test page under Tests", () => {
    for (const slug of ["ppdt", "tat", "wat", "srt", "sdt", "oir", "lecturette"]) {
      const trail = appCrumbs(`/${slug}`);
      expect(trail.map((c) => c.label)).toEqual(["Home", "Tests", expect.any(String)]);
      expect(trail[1].href).toBe("/tests");
    }
  });
  it("nests the mock interview under the guide", () => {
    expect(appCrumbs("/interview")[1]).toEqual({ label: "Interview guide", href: "/interview-guide" });
  });
  it("falls back to the raw segment for unknown pages", () => {
    expect(appCrumbs("/mystery")[1].label).toBe("mystery");
  });
  it("ignores nested paths and query-free segments", () => {
    expect(appCrumbs("/ppdt/anything")[2].label).toBe("PPDT");
  });
  it("labels every test in the catalogue", () => {
    for (const t of TESTS.filter((x) => x.slug !== "interview-guide")) expect(appCrumbs(`/${t.slug}`).at(-1)!.label, t.slug).not.toBe(t.slug);
  });
});

describe("backTarget", () => {
  it("is null on top-level pages", () => {
    expect(backTarget("/dashboard")).toBeNull();
  });
  it("goes up one level", () => {
    expect(backTarget("/wat")).toEqual({ label: "Tests", href: "/tests" });
    expect(backTarget("/history")).toEqual({ label: "Home", href: "/dashboard" });
    expect(backTarget("/interview")).toEqual({ label: "Interview guide", href: "/interview-guide" });
  });
});
