"use client";

import CircularProgress from "@mui/material/CircularProgress";
import { LogoMark } from "@/components/site/header";

/** Brand loader: the logo mark inside a Material UI spinner. Reduced motion keeps the logo and slows the ring. */
export function Loader({ size = 56, label }: { size?: number; label?: string }) {
  return (
    <div role="status" aria-live="polite" aria-label={label ?? "Loading"} className="inline-flex flex-col items-center gap-3">
      <div className="relative grid place-items-center" style={{ width: size, height: size }}>
        <CircularProgress color="secondary" size={size} thickness={3} aria-hidden sx={{ position: "absolute", inset: 0 }} />
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
