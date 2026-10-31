import type { OlqStat } from "@/lib/olq-profile";

const SIZE = 440;
const C = SIZE / 2;
const R = 140;
const RINGS = [0.25, 0.5, 0.75, 1];

const point = (i: number, n: number, r: number): [number, number] => {
  const a = (Math.PI * 2 * i) / n - Math.PI / 2;
  return [C + Math.cos(a) * r, C + Math.sin(a) * r];
};

const SHORT: Record<string, string> = {
  "Effective intelligence": "Intelligence",
  "Organising ability": "Organising",
  "Power of expression": "Expression",
  "Social adaptability": "Adaptability",
  "Sense of responsibility": "Responsibility",
  "Speed of decision": "Decision",
  "Ability to influence the group": "Influence",
  "Reasoning ability": "Reasoning",
};

export function RadarChart({ stats }: { stats: OlqStat[] }) {
  const n = stats.length;
  const shape = stats.map((s, i) => point(i, n, R * Math.max(s.rate, 0.03)).join(",")).join(" ");
  return (
    <svg viewBox={`0 0 ${SIZE} ${SIZE}`} role="img" aria-label={`Radar of how often each of the ${n} Officer Like Qualities showed in your answers`} className="mx-auto w-full max-w-md">
      {RINGS.map((r) => (
        <polygon key={r} points={stats.map((_, i) => point(i, n, R * r).join(",")).join(" ")} fill="none" stroke="currentColor" className="text-white/10" />
      ))}
      {stats.map((_, i) => {
        const [x, y] = point(i, n, R);
        return <line key={i} x1={C} y1={C} x2={x} y2={y} stroke="currentColor" className="text-white/10" />;
      })}
      <polygon points={shape} className="fill-primary/25 stroke-primary" strokeWidth={2} strokeLinejoin="round" />
      {stats.map((s, i) => {
        const [x, y] = point(i, n, R * Math.max(s.rate, 0.03));
        return <circle key={s.olq} cx={x} cy={y} r={3.5} className="fill-primary" />;
      })}
      {stats.map((s, i) => {
        const [x, y] = point(i, n, R + 22);
        const anchor = x < C - 8 ? "end" : x > C + 8 ? "start" : "middle";
        return (
          <text key={s.olq} x={x} y={y} textAnchor={anchor} dominantBaseline="middle" className="fill-muted-foreground text-[11px]">
            {SHORT[s.olq] ?? s.olq}
          </text>
        );
      })}
    </svg>
  );
}
