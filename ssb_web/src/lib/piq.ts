/**
 * PIQ (Personal Information Questionnaire): one definition used by the form, the completeness
 * check, payment gating and the mock interview. Field keys match the mobile app's PiqModel
 * where they overlap, so both apps read the same record.
 */
export type FieldType = "text" | "tel" | "email" | "date" | "select" | "textarea";

export type Field = {
  key: string;
  label: string;
  type?: FieldType;
  options?: string[];
  required?: boolean;
  hint?: string;
  wide?: boolean;
  /** Only shown (and required) when this returns true. */
  showIf?: (v: PiqValues) => boolean;
};
export type Section = { id: string; title: string; blurb: string; fields: Field[] };
export type PiqValues = Record<string, string>;

export const SECTIONS: Section[] = [
  {
    id: "personal", title: "About you", blurb: "The basics the board has on file for you.",
    fields: [
      { key: "fullName", label: "Full name", required: true, hint: "As on your ID" },
      { key: "dateOfBirth", label: "Date of birth", type: "date", required: true },
      { key: "gender", label: "Gender", type: "select", options: ["Male", "Female", "Other"], required: true },
      { key: "phone", label: "Mobile number", type: "tel", required: true, hint: "10-digit Indian number" },
      { key: "email", label: "Email", type: "email", required: true },
      { key: "placeOfResidence", label: "City or town", required: true },
      { key: "district", label: "District", required: true },
      { key: "state", label: "State", required: true },
      { key: "pincode", label: "PIN code", hint: "Optional" },
      { key: "motherTongue", label: "Mother tongue", required: true },
      { key: "maritalStatus", label: "Marital status", type: "select", options: ["Unmarried", "Married", "Other"], required: true },
      { key: "religion", label: "Religion", hint: "Optional" },
      { key: "scStObc", label: "Category", type: "select", options: ["General", "OBC", "SC", "ST", "Prefer not to say"], hint: "Optional" },
    ],
  },
  {
    id: "education", title: "Education", blurb: "Your schooling and studies so far.",
    fields: [
      { key: "currentStatus", label: "Where are you now?", type: "select", options: ["Studying in Class 12", "Studying for a degree", "Graduate", "Working", "Other"], required: true, wide: true },
      { key: "tenthPercentage", label: "Class 10 percentage", required: true },
      { key: "tenthSchool", label: "Class 10 school", hint: "Optional" },
      { key: "twelfthPercentage", label: "Class 12 percentage", required: true, hint: "Or expected, if you have not finished" },
      { key: "twelfthStream", label: "Class 12 stream", type: "select", options: ["Science", "Commerce", "Arts", "Other"], required: true },
      { key: "twelfthSchool", label: "Class 12 school", hint: "Optional" },
      { key: "graduationDegree", label: "Degree", hint: "If you are in or past college" },
      { key: "graduationCollege", label: "College", hint: "Optional" },
      { key: "graduationPercentage", label: "Degree percentage so far", hint: "Optional" },
      { key: "achievements", label: "Academic and other achievements", type: "textarea", wide: true, hint: "Prizes, ranks, certificates" },
    ],
  },
  {
    id: "family", title: "Family", blurb: "The interviewing officer often starts here.",
    fields: [
      { key: "fatherOccupation", label: "Father's occupation", required: true },
      { key: "fatherEducation", label: "Father's education", hint: "Optional" },
      { key: "fatherIncome", label: "Family annual income", hint: "Optional" },
      { key: "motherOccupation", label: "Mother's occupation", required: true, hint: "Write 'Homemaker' if that applies" },
      { key: "motherEducation", label: "Mother's education", hint: "Optional" },
      { key: "siblings", label: "Brothers and sisters", type: "textarea", wide: true, hint: "How many, their ages, and what they do" },
    ],
  },
  {
    id: "activities", title: "Activities", blurb: "What you do outside the classroom.",
    fields: [
      { key: "gamesSports", label: "Games and sports", type: "textarea", required: true, wide: true, hint: "Which ones, your level, any teams" },
      { key: "hobbies", label: "Hobbies", type: "textarea", required: true, wide: true },
      { key: "nccTraining", label: "NCC or other training", type: "textarea", wide: true, hint: "Optional" },
      { key: "responsibilitiesHeld", label: "Positions of responsibility", type: "textarea", wide: true, hint: "Captain, monitor, club head, event organiser" },
    ],
  },
  {
    id: "selection", title: "Your selection", blurb: "Which route you are taking and why.",
    fields: [
      { key: "examApplying", label: "Exam you are preparing for", type: "select", options: ["NDA", "CDS", "AFCAT", "CAPF", "TA", "Other"], required: true },
      { key: "servicePreference", label: "Service preference", type: "select", options: ["Army", "Navy", "Air Force", "No preference"], required: true },
      { key: "previousAttempts", label: "Earlier SSB attempts", type: "select", options: ["0", "1", "2", "3", "4 or more"], required: true },
      { key: "previousAttemptDetails", label: "Tell us about them", type: "textarea", required: true, wide: true, hint: "Which board, which year, how far you got", showIf: (v) => !!v.previousAttempts && v.previousAttempts !== "0" },
      { key: "whyJoin", label: "Why do you want to join the armed forces?", type: "textarea", required: true, wide: true, hint: "In your own words. At least a few sentences." },
    ],
  },
];

export const ALL_FIELDS = SECTIONS.flatMap((s) => s.fields);
const visible = (f: Field, v: PiqValues) => !f.showIf || f.showIf(v);

/** Returns an error message for a value, or null when it is fine. Empty optional fields are fine. */
export function validateField(f: Field, raw: string | undefined, now: () => Date): string | null {
  const v = (raw ?? "").trim();
  if (!v) return f.required ? "This is required." : null;
  switch (f.key) {
    case "phone": {
      const digits = v.replace(/[\s-]/g, "").replace(/^(\+91|91|0)/, "");
      return /^[6-9]\d{9}$/.test(digits) ? null : "Enter a 10-digit mobile number.";
    }
    case "email":
      return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) ? null : "Enter a valid email address.";
    case "dateOfBirth": {
      const d = new Date(v);
      if (Number.isNaN(d.getTime())) return "Enter a valid date.";
      const age = (now().getTime() - d.getTime()) / 31_557_600_000;
      return age >= 14 && age <= 45 ? null : "Check the date. Candidates are usually between 14 and 45.";
    }
    case "pincode":
      return /^\d{6}$/.test(v) ? null : "A PIN code has 6 digits.";
    case "tenthPercentage": case "twelfthPercentage": case "graduationPercentage": {
      const n = Number(v.replace("%", ""));
      return Number.isFinite(n) && n >= 0 && n <= 100 ? null : "Enter a percentage between 0 and 100.";
    }
    case "whyJoin":
      return v.length >= 30 ? null : "Write at least a couple of sentences (30 characters).";
    default:
      return v.length <= 1000 ? null : "Please keep this under 1,000 characters.";
  }
}

export type Completeness = { done: number; total: number; percent: number; complete: boolean; missing: Field[] };

/** How much of the required PIQ is filled in and valid. */
export function completeness(v: PiqValues | null | undefined, now: () => Date = () => new Date()): Completeness {
  const values = v ?? {};
  const required = ALL_FIELDS.filter((f) => f.required && visible(f, values));
  const missing = required.filter((f) => validateField(f, values[f.key], now) !== null);
  const done = required.length - missing.length;
  return { done, total: required.length, percent: Math.round((done / required.length) * 100), complete: missing.length === 0, missing };
}

/** Only allow redirects to pages inside this app. */
export const safeNext = (n: string | null) => {
  // Backslashes and control characters are normalised to "/" by browsers, so "/\evil.com" would leave the app.
  if (!n || !n.startsWith("/") || n.startsWith("//") || /[\\\x00-\x1f]/.test(n)) return null;
  try {
    const u = new URL(n, "https://app.invalid");
    return u.origin === "https://app.invalid" ? u.pathname + u.search + u.hash : null;
  } catch {
    return null;
  }
};
