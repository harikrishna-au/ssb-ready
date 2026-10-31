import { api } from "./api";

export type ContentItem = { id: string; text: string; tags: string[]; difficulty: number };
export type OirItem = ContentItem & { options: string[]; type?: string | null; image_url?: string | null };
export type ContentSet<T> = { items: T[]; available: number; repeated: number; setId?: string };

/** Random set from a server-side bank. The server avoids what this user saw recently. */
export const fetchContent = <T = ContentItem>(bank: "wat" | "srt" | "lecturette" | "oir", count: number, mode?: "quick" | "full") =>
  api.get<ContentSet<T>>(`/api/content/${bank}?count=${count}${mode ? `&mode=${mode}` : ""}`);

/**
 * OIR answers never reach the browser until the user has committed to one, and only for questions in the set
 * the server issued to them (once per question). The score is computed by the server from these checks.
 */
export const checkOirAnswer = (setId: string, questionId: string, index: number) =>
  api.post<{ correct: boolean; correctIndex: number; explanation: string | null }>("/api/content/oir/check", { setId, questionId, index });
