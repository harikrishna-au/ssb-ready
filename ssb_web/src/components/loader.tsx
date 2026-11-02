import { LogoMark } from "@/components/site/header";

/** Brand loader: the logo mark with a ring orbiting it. Respects reduced motion (ring stops, logo stays). */
export function Loader({ size = 56, label }: { size?: number; label?: string }) {
  return (
    <div role="status" aria-live="polite" aria-label={label ?? "Loading"} className="inline-flex flex-col items-center gap-3">
      <div className="relative grid place-items-center" style={{ width: size, height: size }}>
        <svg viewBox="0 0 100 100" className="loader-ring absolute inset-0" aria-hidden>
          <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" strokeOpacity="0.12" strokeWidth="4" />
          <circle cx="50" cy="50" r="46" fill="none" stroke="var(--brass)" strokeWidth="4" strokeLinecap="round" strokeDasharray="72 217" />
        </svg>
        <LogoMark className="loader-logo" />
      </div>
      {label && <p className="text-sm text-muted-foreground">{label}</p>}
    </div>
  );
}

/** Centered loader for a whole page or panel. */
export function PageLoader({ label, className = "min-h-[50vh]" }: { label?: string; className?: string }) {
  return (
    <div className={`grid place-items-center ${className}`}>
      <Loader size={64} label={label} />
    </div>
  );
}
