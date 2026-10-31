import { beforeEach, describe, expect, it } from "vitest";
import { HISTORY_TESTS, useStore } from "@/lib/store";

const s = () => useStore.getState();
beforeEach(() => s().reset());

describe("store", () => {
  it("starts empty", () => {
    expect(s().userId).toBeNull();
    expect(s().apps).toEqual({});
    expect(s().history.status).toBe("idle");
  });
  it("hydrates for a user", () => {
    s().hydrate("u1", { prefs: { exam: "NDA" }, apps: { a: { status: "saved", updatedAt: "t" } } });
    expect(s().userId).toBe("u1");
    expect(s().prefs.exam).toBe("NDA");
    expect(Object.keys(s().apps)).toEqual(["a"]);
  });
  it("never clobbers optimistic changes when hydrated again for the same user", () => {
    s().hydrate("u1", { apps: {} });
    s().setApps((c) => ({ ...c, x: { status: "applied", updatedAt: "t" } }));
    s().hydrate("u1", { apps: {} });
    expect(s().apps.x?.status).toBe("applied");
  });
  it("drops everything when a different user signs in (no data leaks between accounts)", () => {
    s().hydrate("u1", { prefs: { exam: "CDS" }, apps: { a: { status: "saved", updatedAt: "t" } } });
    s().setPiq({ data: { fullName: "Alice" }, status: "ready" });
    s().setHistory({ data: { ppdt: [], tat: [], wat: [], srt: [], oir: [] }, status: "ready" });
    s().hydrate("u2", {});
    expect(s().userId).toBe("u2");
    expect(s().apps).toEqual({});
    expect(s().prefs).toEqual({});
    expect(s().piq.data).toBeNull();
    expect(s().history.data).toBeNull();
  });
  it("reset clears the user", () => {
    s().hydrate("u1", {});
    s().reset();
    expect(s().userId).toBeNull();
  });
  it("merges prefs", () => {
    s().setPrefs({ exam: "NDA" });
    s().setPrefs({ stage: "ssb" });
    expect(s().prefs).toEqual({ exam: "NDA", stage: "ssb" });
  });
  it("setHistory clears the stale flag and invalidateHistory sets it", () => {
    s().invalidateHistory();
    expect(s().historyStale).toBe(true);
    s().setHistory({ data: null, status: "loading" });
    expect(s().historyStale).toBe(false);
  });
  it("tracks the five history tests", () => {
    expect([...HISTORY_TESTS]).toEqual(["ppdt", "tat", "wat", "srt", "oir"]);
  });
});
