export type LeaderboardRow = { id?: string; score: number; storyPreview: string; feedbackSummary: string };

export function Leaderboard({ rows }: { rows: LeaderboardRow[] }) {
  if (!rows?.length) return null;
  return (
    <section className="rounded-3xl border border-white/[0.08] p-7 md:p-10">
      <h2 className="text-3xl font-extrabold uppercase">Top scores so far</h2>
      <p className="mt-1 text-sm text-muted-foreground">Anonymous. Shown so you can see what strong answers look like.</p>
      <ol className="mt-5">
        {rows.map((r, i) => (
          <li key={r.id ?? i} className="grid grid-cols-[2rem_3.5rem_1fr] items-baseline gap-3 border-b border-white/10 py-3.5 text-sm last:border-0">
            <span className="text-muted-foreground">{i + 1}</span>
            <span className="font-display text-2xl font-black text-primary">{r.score}/10</span>
            <span className="line-clamp-2 text-muted-foreground">{r.storyPreview}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
