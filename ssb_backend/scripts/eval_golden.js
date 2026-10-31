#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Golden-set eval. Runs hand-written attempts through the real scoring pipeline and checks each score is inside its
 * expected band, then compares with the last saved baseline to report drift (prompt version, model, per-case score moves).
 *
 *   npm run eval                  mock model (deterministic heuristics: checks the pipeline, NOT real model quality)
 *   npm run eval -- --live        real model (needs a valid OPENAI_API_KEY; costs money)
 *   npm run eval -- --only wat,srt
 *   npm run eval -- --update-baseline   save this run as the baseline for the mode
 * Exit code 1 when the in-band rate is below --min (default 0.8) or drift is flagged with --strict.
 */
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const flag = (n) => args.includes(`--${n}`);
const opt = (n, d) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : d; };
const live = flag('live');
if (!live) process.env.OPENAI_API_KEY = 'mock-key';
for (const k of ['SUPABASE_URL', 'SUPABASE_KEY', 'JWT_SECRET']) process.env[k] ||= 'eval-placeholder';

const ai = require('../services/aiService');
const { createMockClient } = require('../eval/mockClient');
if (!live) ai._setClient(createMockClient());

const ROOT = path.resolve(__dirname, '..', 'eval');
const PIC = (p) => ({ metadata: { ...p, reviewed: true } });
const RUNNERS = {
  wat: async (c) => (await ai.evaluateWat(c.input.responses)),
  srt: async (c) => (await ai.evaluateSrt(c.input.responses)),
  sdt: async (c) => { const r = await ai.evaluateSdt(c.input.responses); return { score: r.consistencyScore, meta: r.meta }; },
  ppdt: async (c) => (await ai.evaluatePpdtPipeline({ storyText: c.input.storyText, perception: {}, topStories: [], image: PIC(c.input.picture) })),
  tat: async (c) => (await ai.evaluateTatPipeline({ storyText: c.input.storyText, imageIndex: 0, perception: {}, topStories: [], image: PIC(c.input.picture) })),
  lecturette: async (c) => (await ai.evaluateLecturette(c.input))
};

async function main() {
  const only = (opt('only', '') || '').split(',').filter(Boolean);
  const mode = live ? 'live' : 'mock';
  const basePath = path.join(ROOT, `baseline.${mode}.json`);
  const baseline = fs.existsSync(basePath) ? JSON.parse(fs.readFileSync(basePath, 'utf8')) : null;
  const min = Number(opt('min', 0.8));

  const report = { mode, at: new Date().toISOString(), prompts: {}, models: new Set(), rounds: {}, scores: {} };
  let total = 0; let inBand = 0;

  for (const round of Object.keys(RUNNERS).filter((r) => !only.length || only.includes(r))) {
    const cases = JSON.parse(fs.readFileSync(path.join(ROOT, 'golden', `${round}.json`), 'utf8'));
    const rows = [];
    report.scores[round] = {};
    for (const c of cases) {
      let score = null; let err = null;
      try {
        const r = await RUNNERS[round](c);
        score = r.score;
        if (r.meta) { report.prompts[round] = r.meta.promptVersion; report.models.add(r.meta.model); }
      } catch (e) { err = e.message; }
      const ok = score !== null && score >= c.band[0] && score <= c.band[1];
      total++; if (ok) inBand++;
      report.scores[round][c.id] = score;
      rows.push({ id: c.id, band: c.band, score, ok, err });
    }
    report.rounds[round] = rows;
  }

  // ---- print ----
  console.log(`\nGolden-set eval (${mode} model${live ? '' : ': heuristic stand-in, NOT the real model'})`);
  for (const [round, rows] of Object.entries(report.rounds)) {
    const good = rows.filter((r) => r.ok).length;
    console.log(`\n${round.toUpperCase()}  prompt ${report.prompts[round] || '?'}  ${good}/${rows.length} in band`);
    for (const r of rows.filter((x) => !x.ok)) console.log(`  OUT  ${r.id}: score ${r.score} expected ${r.band[0]}-${r.band[1]}${r.err ? ` (error: ${r.err})` : ''}`);
  }
  const rate = total ? inBand / total : 0;
  console.log(`\nOverall: ${inBand}/${total} in band (${(rate * 100).toFixed(0)}%), threshold ${(min * 100).toFixed(0)}%`);

  // ---- drift ----
  let drift = false;
  if (!baseline) {
    console.log('Drift: no baseline yet. Run with --update-baseline to save one.');
  } else {
    const notes = [];
    for (const [r, v] of Object.entries(report.prompts)) if (baseline.prompts[r] && baseline.prompts[r] !== v) notes.push(`prompt ${r}: ${baseline.prompts[r]} -> ${v}`);
    const models = [...report.models].sort().join(',');
    if (baseline.models && baseline.models.join(',') !== models) notes.push(`model: ${baseline.models.join(',')} -> ${models}`);
    let moved = 0; let sumAbs = 0; let n = 0;
    for (const [r, byId] of Object.entries(report.scores)) for (const [id, sc] of Object.entries(byId)) {
      const was = baseline.scores?.[r]?.[id];
      if (was == null || sc == null) continue;
      n++; sumAbs += Math.abs(sc - was);
      if (Math.abs(sc - was) >= 2) { moved++; notes.push(`  ${r}/${id}: ${was} -> ${sc}`); }
    }
    drift = notes.length > 0;
    console.log(`Drift vs baseline (${baseline.at}): mean abs change ${(n ? sumAbs / n : 0).toFixed(2)}, ${moved} case(s) moved by 2 or more`);
    for (const x of notes) console.log(`  ${x}`);
    if (!drift) console.log('  none');
  }

  const out = { ...report, models: [...report.models] };
  fs.mkdirSync(path.join(ROOT, 'out'), { recursive: true });
  fs.writeFileSync(path.join(ROOT, 'out', `last.${mode}.json`), JSON.stringify(out, null, 1));
  if (flag('update-baseline')) {
    fs.writeFileSync(basePath, JSON.stringify({ at: out.at, prompts: out.prompts, models: out.models, scores: out.scores }, null, 1));
    console.log(`Baseline saved: ${path.relative(process.cwd(), basePath)}`);
  }
  process.exit(rate < min || (flag('strict') && drift) ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
