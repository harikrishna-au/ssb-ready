import "server-only";
import { fromApi, type ApiItem, type RadarItem } from "./radar";

const BASE = (process.env.NEXT_PUBLIC_BACKEND_URL ?? "").replace(/\/$/, "");

export type RadarResult = { items: RadarItem[]; error: boolean; generatedAt?: string };

/** Published notifications from the backend. Never throws: pages show an honest error state instead of stale or invented dates. */
export async function fetchRadar(): Promise<RadarResult> {
  if (!BASE) return { items: [], error: true };
  try {
    const res = await fetch(`${BASE}/api/radar`, { next: { revalidate: 120 }, signal: AbortSignal.timeout(8000) });
    if (!res.ok) return { items: [], error: true };
    const data = (await res.json()) as { items: ApiItem[]; generatedAt?: string };
    return { items: data.items.map(fromApi), error: false, generatedAt: data.generatedAt };
  } catch {
    return { items: [], error: true };
  }
}
