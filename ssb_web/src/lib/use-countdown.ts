import { useEffect, useRef, useState } from "react";

/** Keep a ref pointing at the latest value, updated after each commit. */
export function useLatest<T>(value: T) {
  const ref = useRef(value);
  useEffect(() => {
    ref.current = value;
  });
  return ref;
}

/**
 * Ticks once a second while `running`; calls `onEnd` once when it reaches zero.
 * Change `resetKey` to restart the clock (e.g. per word); toggling `running` also restarts it.
 */
export function useCountdown(seconds: number, running: boolean, onEnd: () => void, resetKey = 0) {
  const [state, setState] = useState({ key: resetKey, left: seconds });
  const left = state.key === resetKey ? state.left : seconds;
  const onEndRef = useLatest(onEnd);

  useEffect(() => {
    if (!running) return;
    const t = setTimeout(() => {
      if (left <= 1) onEndRef.current();
      setState({ key: resetKey, left: Math.max(left - 1, 0) });
    }, 1000);
    return () => clearTimeout(t);
  }, [running, left, resetKey, onEndRef]);

  // Reset for the next run when the clock stops.
  useEffect(() => () => setState({ key: resetKey, left: seconds }), [running, seconds, resetKey]);

  return left;
}

export const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
