"use client";

import { useEffect, useRef } from "react";

/** Thin bar under the header that fills as the reader scrolls the article. Updates a CSS transform directly, so it never re-renders. */
export function ReadingProgress({ targetId }: { targetId: string }) {
  const bar = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = document.getElementById(targetId);
    if (!el) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const r = el.getBoundingClientRect();
      const total = r.height - window.innerHeight * 0.6;
      const done = Math.min(1, Math.max(0, (-r.top + 80) / Math.max(total, 1)));
      if (bar.current) bar.current.style.transform = `scaleX(${done})`;
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [targetId]);
  return (
    <div className="fixed inset-x-0 top-16 z-30 h-0.5 bg-transparent" role="presentation" aria-hidden>
      <div ref={bar} className="h-full origin-left bg-brass" style={{ transform: "scaleX(0)" }} />
    </div>
  );
}
