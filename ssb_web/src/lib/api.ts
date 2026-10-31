import { useStore } from "./store";

declare global {
  interface Window {
    Clerk?: {
      loaded?: boolean;
      load?: () => Promise<void>;
      session?: { getToken(opts?: { skipCache?: boolean }): Promise<string | null> } | null;
      redirectToSignIn?: (opts?: { redirectUrl?: string }) => void;
    };
  }
}

const BASE_URL = (process.env.NEXT_PUBLIC_BACKEND_URL ?? "").replace(/\/$/, "");

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

/** Waits (briefly) for Clerk to finish loading so calls never go out unauthenticated. */
async function clerkReady(): Promise<NonNullable<Window["Clerk"]>> {
  for (let i = 0; i < 50; i++) {
    if (window.Clerk?.loaded) return window.Clerk;
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new ApiError("Sign-in is still loading. Refresh the page and try again.", 0);
}

async function send(method: string, path: string, body: unknown, token: string | null) {
  return fetch(`${BASE_URL}${path}`, {
    method,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  if (!BASE_URL) throw new ApiError("The server address is not configured.", 0);
  const clerk = await clerkReady();

  let res: Response;
  try {
    res = await send(method, path, body, (await clerk.session?.getToken()) ?? null);
    // A 401 usually means a cached token just expired: fetch a fresh one and retry once.
    if (res.status === 401 && clerk.session) {
      res = await send(method, path, body, await clerk.session.getToken({ skipCache: true }));
    }
  } catch {
    throw new ApiError("Could not reach the server. Check your connection.", 0);
  }

  if (res.status === 401) {
    useStore.getState().reset();
    clerk.redirectToSignIn?.({ redirectUrl: window.location.href });
    throw new ApiError("Your session has ended. Please sign in again.", 401);
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data?.error?.message ?? `Server error (${res.status})`, res.status);

  // Anything that records a result makes cached history out of date.
  if (method !== "GET" && /^\/api\/(evaluat|ppdt|tat|firestore)/.test(path)) useStore.getState().invalidateHistory();
  return data as T;
}

export const api = {
  get: <T>(path: string) => request<T>("GET", path),
  post: <T>(path: string, body: unknown) => request<T>("POST", path, body),
  patch: <T>(path: string, body: unknown) => request<T>("PATCH", path, body),
};
