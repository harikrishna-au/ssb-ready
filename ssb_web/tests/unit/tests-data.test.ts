import { describe, expect, it } from "vitest";
import { EXAMS, GROUPS, OLQS, OLQ_FACTORS, TESTS } from "@/lib/tests";

describe("test catalogue", () => {
  it("has unique slugs and every group is defined", () => {
    const slugs = TESTS.map((t) => t.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const t of TESTS) expect(GROUPS[t.group], t.slug).toBeDefined();
  });
  it("fills every descriptive field", () => {
    for (const t of TESTS) for (const k of ["name", "full", "minutes", "format", "measures"] as const) expect(t[k], `${t.slug}.${k}`).toBeTruthy();
  });
  it("lists the 15 Officer Like Qualities exactly once", () => {
    expect(OLQS).toHaveLength(15);
    expect(new Set(OLQS).size).toBe(15);
    expect(OLQ_FACTORS).toHaveLength(4);
  });
  it("offers the expected exams", () => {
    expect(EXAMS).toEqual(["NDA", "CDS", "AFCAT", "CAPF", "TA", "Other"]);
  });
});
