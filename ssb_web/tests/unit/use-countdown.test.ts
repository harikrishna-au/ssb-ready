import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fmt, useCountdown } from "@/lib/use-countdown";

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

const tick = (n: number) => { for (let i = 0; i < n; i++) act(() => { vi.advanceTimersByTime(1000); }); };

describe("fmt", () => {
  it.each([[0, "0:00"], [5, "0:05"], [60, "1:00"], [75, "1:15"], [3599, "59:59"]])("%i -> %s", (s, out) => {
    expect(fmt(s)).toBe(out);
  });
});

describe("useCountdown", () => {
  it("does not tick while not running", () => {
    const { result } = renderHook(() => useCountdown(10, false, () => {}));
    tick(5);
    expect(result.current).toBe(10);
  });
  it("counts down once a second while running", () => {
    const { result } = renderHook(() => useCountdown(10, true, () => {}));
    tick(3);
    expect(result.current).toBe(7);
  });
  it("calls onEnd exactly once at zero and stays at zero", () => {
    const onEnd = vi.fn();
    const { result } = renderHook(() => useCountdown(3, true, onEnd));
    tick(3);
    expect(result.current).toBe(0);
    expect(onEnd).toHaveBeenCalledTimes(1);
    tick(3);
    expect(onEnd).toHaveBeenCalledTimes(1);
    expect(result.current).toBe(0);
  });
  it("restarts when resetKey changes", () => {
    const { result, rerender } = renderHook(({ k }) => useCountdown(5, true, () => {}, k), { initialProps: { k: 0 } });
    tick(3);
    expect(result.current).toBe(2);
    rerender({ k: 1 });
    expect(result.current).toBe(5);
  });
  it("uses the latest onEnd callback", () => {
    const first = vi.fn(); const second = vi.fn();
    const { rerender } = renderHook(({ cb }) => useCountdown(2, true, cb), { initialProps: { cb: first } });
    tick(1);
    rerender({ cb: second });
    tick(1);
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });
  it("resets to the full duration after being stopped", () => {
    const { result, rerender } = renderHook(({ run }) => useCountdown(5, run, () => {}), { initialProps: { run: true } });
    tick(2);
    rerender({ run: false });
    expect(result.current).toBe(5);
  });
});
