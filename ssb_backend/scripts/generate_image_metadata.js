#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Generates reference metadata for PPDT / TAT pictures with the vision model.
 *
 *   # Describe pictures from a local folder (no Supabase access needed). Writes JSON + SQL to scripts/out/.
 *   node scripts/generate_image_metadata.js --local ../PPDT_IMAGES [--limit 5] [--force]
 *
 *   # Same, but reading the pictures from your Storage bucket.
 *   node scripts/generate_image_metadata.js --bucket [--limit 5]
 *
 * Then paste scripts/out/story_images.sql into the Supabase SQL editor (after running the
 * 20261101000000_story_images.sql migration). Rows are saved with reviewed = false:
 * read them, fix anything wrong, then set reviewed = true.
 */
const fs = require('fs');
const path = require('path');
const { getClient } = require('../services/aiService');
const { config, loadEnv } = require('../config');

loadEnv();

const args = process.argv.slice(2);
const flag = (n) => args.includes(`--${n}`);
const opt = (n) => {
  const i = args.indexOf(`--${n}`);
  return i >= 0 ? args[i + 1] : undefined;
};

const BUCKET = (process.env.PSYCHOLOGY_IMAGE_BUCKET || 'ppdt-tat-images').trim();
const OUT_DIR = path.resolve(__dirname, 'out');
const JSON_OUT = path.join(OUT_DIR, 'story_images.json');
const SQL_OUT = path.join(OUT_DIR, 'story_images.sql');
const limit = Number(opt('limit')) || Infinity;
const MIME = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' };

const PROMPT = `You are preparing reference notes for a Services Selection Board practice tool.
Describe this picture, which is used for the PPDT and TAT. These tests show deliberately hazy pictures, so describe only what is visible, neutrally, then suggest sensible story directions.

Return only valid JSON:
{
  "scene": "2-3 neutral sentences: what is visible",
  "characters": [{ "who": "role or description", "age": "child|teen|young adult|adult|elderly|unclear", "gender": "male|female|unclear", "doing": "what they appear to be doing" }],
  "mood": "one or two words",
  "setting": "place and time of day if visible",
  "key_elements": ["objects or details a story should notice, max 6"],
  "plausible_themes": ["3-5 reasonable story directions, each a short phrase"],
  "positive_resolutions": ["2-4 constructive outcomes a strong story could reach"],
  "olq_cues": ["Officer Like Qualities a good story could show through this scene, max 5"]
}
Rules: do not identify real people; do not invent details you cannot see; keep every item short.`;

const arr = (v, n = 8) => (Array.isArray(v) ? v.slice(0, n).map((x) => String(x).trim().slice(0, 160)).filter(Boolean) : []);

function clean(raw) {
  return {
    scene: String(raw.scene || '').trim().slice(0, 600),
    characters: (Array.isArray(raw.characters) ? raw.characters : []).slice(0, 8).map((c) => ({
      who: String(c.who || '').slice(0, 80),
      age: String(c.age || 'unclear').slice(0, 30),
      gender: String(c.gender || 'unclear').slice(0, 20),
      doing: String(c.doing || '').slice(0, 160)
    })),
    mood: String(raw.mood || '').slice(0, 60),
    setting: String(raw.setting || '').slice(0, 160),
    key_elements: arr(raw.key_elements, 6),
    plausible_themes: arr(raw.plausible_themes, 5),
    positive_resolutions: arr(raw.positive_resolutions, 4),
    olq_cues: arr(raw.olq_cues, 5)
  };
}

async function describe(imageUrl) {
  const completion = await getClient().chat.completions.create({
    model: config.openai.visionModel,
    response_format: { type: 'json_object' },
    temperature: 0.2,
    messages: [{ role: 'user', content: [{ type: 'text', text: PROMPT }, { type: 'image_url', image_url: { url: imageUrl } }] }]
  });
  const raw = JSON.parse(completion.choices[0].message.content);
  const out = clean(raw);
  if (!out.scene) throw new Error('model returned no scene');
  return out;
}

const natural = (a, b) => (Number((a.match(/\d+/) || [0])[0]) - Number((b.match(/\d+/) || [0])[0])) || a.localeCompare(b);
const q = (s) => `'${String(s).replace(/'/g, "''")}'`;
const pgArray = (a) => `array[${a.map(q).join(', ')}]::text[]`;

function toSql(rows) {
  const lines = rows.map((r) =>
    `insert into public.story_images (id, bucket, path, scene, characters, mood, setting, key_elements, plausible_themes, positive_resolutions, olq_cues, reviewed)
values (${q(r.id)}, ${q(BUCKET)}, ${q(r.id)}, ${q(r.scene)}, ${q(JSON.stringify(r.characters))}::jsonb, ${q(r.mood)}, ${q(r.setting)}, ${pgArray(r.key_elements)}, ${pgArray(r.plausible_themes)}, ${pgArray(r.positive_resolutions)}, ${pgArray(r.olq_cues)}, false)
on conflict (id) do update set scene = excluded.scene, characters = excluded.characters, mood = excluded.mood, setting = excluded.setting,
  key_elements = excluded.key_elements, plausible_themes = excluded.plausible_themes, positive_resolutions = excluded.positive_resolutions,
  olq_cues = excluded.olq_cues, updated_at = now();`);
  return `-- Generated ${new Date().toISOString()}. Review each row, then set reviewed = true.\n${lines.join('\n\n')}\n`;
}

async function sources() {
  if (opt('local')) {
    const dir = path.resolve(process.cwd(), opt('local'));
    return fs.readdirSync(dir).filter((f) => MIME[path.extname(f).toLowerCase()]).sort(natural).map((f) => ({
      id: `ppdt/${f}`,
      url: () => `data:${MIME[path.extname(f).toLowerCase()]};base64,${fs.readFileSync(path.join(dir, f)).toString('base64')}`
    }));
  }
  if (flag('bucket')) {
    const supabase = require('../config/supabase');
    const { data, error } = await supabase.storage.from(BUCKET).list('ppdt', { limit: 500 });
    if (error) throw new Error(`Cannot list bucket "${BUCKET}": ${error.message}`);
    const base = String(config.supabase.url).replace(/\/+$/, '');
    return data.filter((o) => MIME[path.extname(o.name).toLowerCase()]).map((o) => o.name).sort(natural).map((f) => ({
      id: `ppdt/${f}`,
      url: () => `${base}/storage/v1/object/public/${BUCKET}/ppdt/${f}`
    }));
  }
  throw new Error('Choose a source: --local <folder> or --bucket');
}

(async () => {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const existing = !flag('force') && fs.existsSync(JSON_OUT) ? JSON.parse(fs.readFileSync(JSON_OUT, 'utf8')) : [];
  const done = new Map(existing.map((r) => [r.id, r]));

  const todo = (await sources()).filter((s) => !done.has(s.id)).slice(0, limit);
  console.log(`${done.size} already described, ${todo.length} to do`);

  let failed = 0;
  for (const [i, s] of todo.entries()) {
    try {
      const meta = await describe(s.url());
      done.set(s.id, { id: s.id, ...meta });
      console.log(`[${i + 1}/${todo.length}] ${s.id}: ${meta.scene.slice(0, 90)}`);
      // Save after every picture so an interruption loses nothing.
      fs.writeFileSync(JSON_OUT, JSON.stringify([...done.values()], null, 2));
    } catch (e) {
      failed++;
      console.error(`[${i + 1}/${todo.length}] ${s.id} FAILED: ${e.message}`);
    }
  }

  const rows = [...done.values()].sort((a, b) => natural(a.id, b.id));
  fs.writeFileSync(JSON_OUT, JSON.stringify(rows, null, 2));
  fs.writeFileSync(SQL_OUT, toSql(rows));
  console.log(`\nWrote ${rows.length} rows (${failed} failed)\n  ${JSON_OUT}\n  ${SQL_OUT}`);
})().catch((e) => { console.error(e.message); process.exit(1); });
