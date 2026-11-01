/** Instant skeleton while a signed-in page streams in, so navigation never shows a blank screen. */
export default function Loading() {
  return (
    <div role="status" aria-label="Loading" className="space-y-6">
      <div className="h-12 w-2/3 animate-pulse rounded-xl bg-white/5" />
      <div className="h-40 animate-pulse rounded-2xl bg-white/5" />
      <div className="space-y-3">
        {[0, 1, 2].map((i) => <div key={i} className="h-14 animate-pulse rounded-xl bg-white/5" />)}
      </div>
    </div>
  );
}
