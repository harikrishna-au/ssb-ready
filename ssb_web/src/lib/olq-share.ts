import type { Profile } from "./olq-profile";

const W = 1080;
const H = 1350;
const BRASS = "#f5a623";

/** Draws the shareable card. Plain canvas, so it works offline and needs no image service. */
export async function makeShareCard(p: Profile, name: string): Promise<Blob> {
  const cv = document.createElement("canvas");
  cv.width = W; cv.height = H;
  const g = cv.getContext("2d")!;
  g.fillStyle = "#0b0f14"; g.fillRect(0, 0, W, H);

  g.fillStyle = BRASS; g.font = "600 34px system-ui, sans-serif";
  g.fillText("MY SSB PROFILE", 70, 110);
  g.fillStyle = "#fff"; g.font = "900 96px system-ui, sans-serif";
  g.fillText(p.archetype.name.toUpperCase(), 70, 220);
  g.fillStyle = "#9aa4b2"; g.font = "400 32px system-ui, sans-serif";
  wrap(g, p.archetype.line, 70, 282, W - 140, 44);

  const cx = W / 2, cy = 760, R = 330, n = p.stats.length;
  const pt = (i: number, r: number): [number, number] => {
    const a = (Math.PI * 2 * i) / n - Math.PI / 2;
    return [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
  };
  g.strokeStyle = "rgba(255,255,255,0.12)"; g.lineWidth = 2;
  for (const k of [0.25, 0.5, 0.75, 1]) {
    g.beginPath();
    p.stats.forEach((_, i) => { const [x, y] = pt(i, R * k); if (i) g.lineTo(x, y); else g.moveTo(x, y); });
    g.closePath(); g.stroke();
  }
  g.beginPath();
  p.stats.forEach((s, i) => { const [x, y] = pt(i, R * Math.max(s.rate, 0.03)); if (i) g.lineTo(x, y); else g.moveTo(x, y); });
  g.closePath();
  g.fillStyle = "rgba(245,166,35,0.28)"; g.fill();
  g.strokeStyle = BRASS; g.lineWidth = 5; g.stroke();

  g.fillStyle = "#9aa4b2"; g.font = "500 24px system-ui, sans-serif";
  p.stats.forEach((s, i) => {
    const [x, y] = pt(i, R + 38);
    g.textAlign = x < cx - 10 ? "right" : x > cx + 10 ? "left" : "center";
    g.fillText(s.olq.split(" ")[0], x, y + 8);
  });
  g.textAlign = "left";

  g.fillStyle = "#fff"; g.font = "700 38px system-ui, sans-serif";
  g.fillText(`Strongest: ${p.strengths.slice(0, 3).map((s) => s.olq).join(", ") || "still forming"}`.slice(0, 60), 70, 1190);
  g.fillStyle = "#9aa4b2"; g.font = "400 30px system-ui, sans-serif";
  g.fillText(`${name} · ${p.attempts} scored attempts`, 70, 1240);
  g.fillStyle = BRASS; g.font = "700 34px system-ui, sans-serif";
  g.fillText("readykadet.com", 70, 1300);

  return new Promise((res, rej) => cv.toBlob((b) => (b ? res(b) : rej(new Error("Could not draw the card"))), "image/png"));
}

function wrap(g: CanvasRenderingContext2D, text: string, x: number, y: number, max: number, lh: number) {
  let line = "";
  for (const word of text.split(" ")) {
    const t = line ? `${line} ${word}` : word;
    if (g.measureText(t).width > max && line) { g.fillText(line, x, y); line = word; y += lh; } else line = t;
  }
  g.fillText(line, x, y);
}

export async function shareCard(p: Profile, name: string) {
  const blob = await makeShareCard(p, name);
  const file = new File([blob], "my-ssb-profile.png", { type: "image/png" });
  if (navigator.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file], title: "My SSB profile", text: `I am ${p.archetype.name} on ReadyKadet. What are you?` });
    return;
  }
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = file.name;
  a.click();
  URL.revokeObjectURL(a.href);
}
