import { ImageResponse } from "next/og";

export const OG_SIZE = { width: 1200, height: 630 };

/** Branded 1200x630 share card. Used by blog posts and exam pages. */
export function ogCard({ eyebrow, title, footer }: { eyebrow: string; title: string; footer?: string }) {
  const fontSize = title.length > 70 ? 56 : title.length > 45 ? 68 : 80;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "#0f1220", color: "#e8eaf2", padding: "64px 72px", borderBottom: "14px solid #f5a623" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <svg width="76" height="76" viewBox="0 0 128 128">
            <rect width="128" height="128" rx="28" fill="#4b7bf5" />
            <path d="M26 64 L64 34 L102 64" fill="none" stroke="#f5a623" strokeWidth="13" />
            <path d="M26 94 L64 64 L102 94" fill="none" stroke="#ffffff" strokeWidth="13" />
          </svg>
          <div style={{ fontSize: 40, fontWeight: 800, letterSpacing: 4 }}>READYKADET</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ fontSize: 30, color: "#f5a623", fontWeight: 700 }}>{eyebrow}</div>
          <div style={{ fontSize, fontWeight: 800, lineHeight: 1.08, letterSpacing: -1 }}>{title}</div>
        </div>
        <div style={{ fontSize: 26, color: "#9aa3bd" }}>{footer ?? "Timed SSB practice with feedback on every attempt"}</div>
      </div>
    ),
    OG_SIZE,
  );
}
