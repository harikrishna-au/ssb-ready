import { describe, expect, it } from "vitest";
import { ALL_FIELDS, SECTIONS, completeness, safeNext, validateField, type PiqValues } from "@/lib/piq";

const now = () => new Date("2026-10-31T00:00:00Z");
const field = (key: string) => ALL_FIELDS.find((f) => f.key === key)!;

/** A record that satisfies every required field. */
const full = (): PiqValues => {
  const v: PiqValues = {};
  for (const f of ALL_FIELDS) {
    if (!f.required) continue;
    v[f.key] = f.options ? f.options[0] : "Sample";
  }
  Object.assign(v, {
    dateOfBirth: "2006-05-01", phone: "9876543210", email: "a@b.co",
    tenthPercentage: "88", twelfthPercentage: "90", previousAttempts: "0",
    whyJoin: "I want to serve the country and lead people in difficult situations.",
  });
  return v;
};

describe("piq definition", () => {
  it("has unique field keys", () => {
    const keys = ALL_FIELDS.map((f) => f.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
  it("every select field has options", () => {
    for (const f of ALL_FIELDS) if (f.type === "select") expect(f.options?.length, f.key).toBeGreaterThan(0);
  });
  it("sections are non-empty", () => {
    for (const s of SECTIONS) expect(s.fields.length).toBeGreaterThan(0);
  });
});

describe("validateField", () => {
  it("requires required fields and allows empty optional ones", () => {
    expect(validateField(field("fullName"), "  ", now)).toBe("This is required.");
    expect(validateField(field("pincode"), "", now)).toBeNull();
  });
  it.each([
    ["9876543210", true], ["+91 98765-43210", true], ["09876543210", true],
    ["1234567890", false], ["98765", false], ["abc", false],
  ])("phone %s valid=%s", (v, ok) => {
    expect(validateField(field("phone"), v, now) === null).toBe(ok);
  });
  it("validates e-mail", () => {
    expect(validateField(field("email"), "a@b.co", now)).toBeNull();
    expect(validateField(field("email"), "a@b", now)).not.toBeNull();
    expect(validateField(field("email"), "a b@c.com", now)).not.toBeNull();
  });
  it("validates date of birth against age 14-45 using the injected clock", () => {
    expect(validateField(field("dateOfBirth"), "2006-05-01", now)).toBeNull();
    expect(validateField(field("dateOfBirth"), "2025-01-01", now)).not.toBeNull();
    expect(validateField(field("dateOfBirth"), "1960-01-01", now)).not.toBeNull();
    expect(validateField(field("dateOfBirth"), "nonsense", now)).toBe("Enter a valid date.");
  });
  it("validates PIN codes and percentages", () => {
    expect(validateField(field("pincode"), "500001", now)).toBeNull();
    expect(validateField(field("pincode"), "5000", now)).not.toBeNull();
    expect(validateField(field("tenthPercentage"), "88.5%", now)).toBeNull();
    expect(validateField(field("tenthPercentage"), "101", now)).not.toBeNull();
    expect(validateField(field("tenthPercentage"), "-1", now)).not.toBeNull();
  });
  it("requires at least 30 characters for whyJoin", () => {
    expect(validateField(field("whyJoin"), "too short", now)).not.toBeNull();
    expect(validateField(field("whyJoin"), "x".repeat(30), now)).toBeNull();
  });
  it("caps free text at 1,000 characters", () => {
    expect(validateField(field("hobbies"), "x".repeat(1001), now)).not.toBeNull();
  });
});

describe("completeness", () => {
  it("is empty for null and undefined", () => {
    expect(completeness(null, now).complete).toBe(false);
    expect(completeness(undefined, now).percent).toBe(0);
  });
  it("is complete for a full valid record", () => {
    const c = completeness(full(), now);
    expect(c.missing.map((m) => m.key)).toEqual([]);
    expect(c.complete).toBe(true);
    expect(c.percent).toBe(100);
  });
  it("counts an invalid value as missing", () => {
    const v = full(); v.phone = "123";
    const c = completeness(v, now);
    expect(c.complete).toBe(false);
    expect(c.missing.map((m) => m.key)).toContain("phone");
  });
  it("only requires previousAttemptDetails when there were earlier attempts", () => {
    const v = full();
    delete v.previousAttemptDetails;
    expect(completeness(v, now).missing.map((m) => m.key)).not.toContain("previousAttemptDetails");
    v.previousAttempts = "2";
    expect(completeness(v, now).missing.map((m) => m.key)).toContain("previousAttemptDetails");
    v.previousAttemptDetails = "SSB at Bhopal in 2025, screened out on day one.";
    expect(completeness(v, now).complete).toBe(true);
  });
});

describe("safeNext (open-redirect guard)", () => {
  it.each([
    ["/dashboard", "/dashboard"],
    ["/ppdt?x=1#top", "/ppdt?x=1#top"],
    [null, null], ["", null],
    ["https://evil.com", null], ["//evil.com", null], ["/\\evil.com", null],
    ["javascript:alert(1)", null], ["/\t/evil.com", null], ["evil.com", null],
  ])("%s -> %s", (input, out) => {
    expect(safeNext(input as string | null)).toBe(out);
  });
});
