import { api } from "./api";

export type Picture = { id: string; url: string; token?: string };
export type PictureSet = { data: Picture[]; premium: boolean; freeLimit: number; available: number };
export type Alignment = { score: number; matched: string[]; missed: string[]; notes: string };

/** Random pictures for a test. The server picks them, so free accounts can only ever get the preview set. */
export const fetchPictures = (test: "ppdt" | "tat", count: number) =>
  api.get<PictureSet>(`/api/images?test=${test}&count=${count}`);

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
