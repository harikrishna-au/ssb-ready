const supabase = require('../config/supabase');
const { logger } = require('../utils/logger');

/** bank -> table, label column and the columns safe to send to a client. */
const BANKS = {
  wat: { table: 'content_wat_words', textCol: 'word', max: 60 },
  srt: { table: 'content_srt_situations', textCol: 'text', max: 60 },
  lecturette: { table: 'content_lecturette_topics', textCol: 'topic', max: 12 },
  oir: { table: 'content_oir_questions', textCol: 'text', max: 60, extra: ['options', 'type', 'image_url'] }
};
// Never listed in any public field set: correct_answer_index, explanation.
const INDEX_TTL_MS = 5 * 60 * 1000;
const cache = new Map();

const httpError = (status, message) => Object.assign(new Error(message), { statusCode: status });

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Active, non-rejected rows. Pending items are served until a reviewer rejects them. */
async function loadBank(bank) {
  const def = BANKS[bank];
  const hit = cache.get(bank);
  if (hit && Date.now() - hit.at < INDEX_TTL_MS) return hit.rows;
  const cols = ['id', def.textCol, 'tags', 'difficulty', ...(def.extra || [])].join(',');
  const { data, error } = await supabase.from(def.table).select(cols).eq('active', true).neq('review_status', 'rejected');
  if (error) throw httpError(503, `Content is unavailable right now (${error.message})`);
  cache.set(bank, { at: Date.now(), rows: data || [] });
  return data || [];
}

/**
 * Random set that avoids what this user saw most recently.
 * Unseen items first; if the bank is smaller than `count` plus history, the least recently seen fill the rest.
 */
async function getRandomSet({ bank, count, userId, tags }) {
  const def = BANKS[bank];
  if (!def) throw httpError(404, 'Unknown content bank');
  const n = Math.max(1, Math.min(def.max, Number.parseInt(count, 10) || 1));
  let rows = await loadBank(bank);
  if (Array.isArray(tags) && tags.length) rows = rows.filter((r) => (r.tags || []).some((t) => tags.includes(t)));
  if (rows.length === 0) throw httpError(503, 'No content is available yet');

  const seen = new Map();
  const { data: seenRows, error } = await supabase
    .from('content_seen').select('item_id, seen_at').eq('user_id', userId).eq('bank', bank);
  if (error) logger.warn(`content_seen unavailable (${error.message}); not de-duplicating`);
  for (const s of seenRows || []) seen.set(s.item_id, s.seen_at);

  const unseen = shuffle(rows.filter((r) => !seen.has(r.id)));
  const seenSorted = rows.filter((r) => seen.has(r.id)).sort((a, b) => String(seen.get(a.id)).localeCompare(String(seen.get(b.id))));
  const picked = [...unseen, ...seenSorted].slice(0, n);
  // If this serve exhausts the unseen pool, start the user's history fresh next time.
  const exhausted = unseen.length <= n;

  if (!error) {
    const ops = [];
    if (exhausted && seen.size) ops.push(supabase.from('content_seen').delete().eq('user_id', userId).eq('bank', bank));
    const now = new Date().toISOString();
    await Promise.all(ops);
    const up = await supabase.from('content_seen').upsert(picked.map((r) => ({ user_id: userId, bank, item_id: r.id, seen_at: now })));
    if (up?.error) logger.warn(`Could not record served items: ${up.error.message}`);
  }

  const items = picked.map((r) => {
    const out = { id: r.id, text: r[def.textCol], tags: r.tags || [], difficulty: r.difficulty };
    for (const k of def.extra || []) out[k] = r[k];
    return out;
  });
  return { items, available: rows.length, repeated: Math.max(0, picked.length - unseen.length) };
}

/** Marks one OIR answer. The only place the correct index leaves the server, and only after the user committed. */
async function checkOirAnswer({ questionId, index }) {
  const i = Number(index);
  if (typeof questionId !== 'string' || !Number.isInteger(i) || i < 0) throw httpError(400, 'questionId and a valid option index are required');
  const { data, error } = await supabase
    .from('content_oir_questions').select('correct_answer_index, explanation, options').eq('id', questionId).maybeSingle();
  if (error) throw httpError(503, 'Could not check that answer right now');
  if (!data) throw httpError(404, 'Question not found');
  if (i >= (data.options || []).length) throw httpError(400, 'Option out of range');
  return { correct: i === data.correct_answer_index, correctIndex: data.correct_answer_index, explanation: data.explanation || null };
}

module.exports = { BANKS, getRandomSet, checkOirAnswer, _clearCache: () => cache.clear() };
