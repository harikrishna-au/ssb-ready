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
/** An OIR set can be answered for this long after it is issued (the test itself is 10 minutes). */
const SET_TTL_MS = 60 * 60 * 1000;
/** A ranked OIR test is exactly this many questions; the server decides, not the client. */
const OIR_FULL_SET_SIZE = Number(process.env.OIR_FULL_SET_SIZE || 25);
const OIR_QUICK_SET_SIZE = Number(process.env.OIR_QUICK_SET_SIZE || 10);
/** Sets of any kind a user may be issued in 24 hours. Issued-but-unsubmitted sets count as attempts. */
const OIR_DAILY_SET_CAP = Number(process.env.OIR_DAILY_SET_CAP || 12);
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
async function getRandomSet({ bank, count, userId, tags, mode }) {
  const def = BANKS[bank];
  if (!def) throw httpError(404, 'Unknown content bank');
  let n = Math.max(1, Math.min(def.max, Number.parseInt(count, 10) || 1));
  if (bank === 'oir') {
    await enforceDailyCap(userId);
    n = mode === 'full' ? OIR_FULL_SET_SIZE : Math.min(n, OIR_QUICK_SET_SIZE);
  }
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
  const out = { items, available: rows.length, repeated: Math.max(0, picked.length - unseen.length) };
  if (bank === 'oir') {
    // Ranked only if the set really is full size; a short bank or a quick request never is.
    const kind = mode === 'full' && picked.length === OIR_FULL_SET_SIZE ? 'full' : 'quick';
    out.setId = await issueSet({ userId, bank, itemIds: picked.map((r) => r.id), kind });
    out.kind = kind;
  }
  return out;
}

/** Records exactly which questions this user was served. Answers can only be checked against this. */
async function enforceDailyCap(userId) {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase.from('content_sets').select('set_id').eq('user_id', userId).eq('bank', 'oir').gte('issued_at', since);
  if (error) throw httpError(503, 'Could not start this set right now');
  if ((data || []).length >= OIR_DAILY_SET_CAP) throw httpError(429, `You have started the maximum of ${OIR_DAILY_SET_CAP} OIR sets today. Try again tomorrow.`);
}

async function issueSet({ userId, bank, itemIds, kind }) {
  const { data, error } = await supabase
    .from('content_sets')
    .insert({ user_id: userId, bank, kind, size: itemIds.length, item_ids: itemIds, expires_at: new Date(Date.now() + SET_TTL_MS).toISOString() })
    .select('set_id')
    .maybeSingle();
  if (error || !data) throw httpError(503, 'Could not start this set right now');
  return data.set_id;
}

async function loadSet({ userId, setId }) {
  if (typeof setId !== 'string' || !setId) throw httpError(400, 'setId is required');
  const { data, error } = await supabase.from('content_sets').select('*').eq('set_id', setId).eq('user_id', userId).eq('bank', 'oir').maybeSingle();
  if (error) throw httpError(503, 'Could not check that answer right now');
  // Same message whether it never existed or belongs to someone else, so ids cannot be probed.
  if (!data) throw httpError(404, 'That question set was not found');
  return data;
}

/**
 * Marks one OIR answer. Allowed only for a question in this user's own, unexpired set, once per question.
 * The correct index leaves the server only after the answer is recorded.
 */
async function checkOirAnswer({ userId, setId, questionId, index }) {
  const i = Number(index);
  if (typeof questionId !== 'string' || !Number.isInteger(i) || i < 0) throw httpError(400, 'setId, questionId and a valid option index are required');
  const set = await loadSet({ userId, setId });
  if (new Date(set.expires_at) <= new Date()) throw httpError(410, 'This question set has expired. Start a new one.');
  if (!set.item_ids.includes(questionId)) throw httpError(403, 'That question is not part of your set');
  if (set.answers && set.answers[questionId]) throw httpError(409, 'You already answered that question');

  const { data, error } = await supabase
    .from('content_oir_questions').select('correct_answer_index, explanation, options')
    .eq('id', questionId).eq('active', true).neq('review_status', 'rejected').maybeSingle();
  if (error) throw httpError(503, 'Could not check that answer right now');
  if (!data) throw httpError(404, 'That question is no longer available');
  if (i >= (data.options || []).length) throw httpError(400, 'Option out of range');

  const correct = i === data.correct_answer_index;
  const rec = await supabase.rpc('content_record_answer', { p_set: setId, p_user: userId, p_question: questionId, p_index: i, p_correct: correct });
  if (rec.error) throw httpError(503, 'Could not check that answer right now');
  if (rec.data !== true) throw httpError(409, 'You already answered that question');
  return { correct, correctIndex: data.correct_answer_index, explanation: data.explanation || null };
}

/** Server-computed OIR score for a set. Unanswered questions score zero. */
async function getOirSetScore({ userId, setId }) {
  const set = await loadSet({ userId, setId });
  const answers = set.answers || {};
  const score = Object.values(answers).filter((a) => a && a.correct === true).length;
  // total is the size fixed when the set was issued, so unanswered questions count against the score.
  const ranked = set.kind === 'full' && set.size === OIR_FULL_SET_SIZE;
  return { score, total: set.size, answered: Object.keys(answers).length, kind: set.kind, ranked };
}

module.exports = { BANKS, SET_TTL_MS, OIR_FULL_SET_SIZE, OIR_QUICK_SET_SIZE, OIR_DAILY_SET_CAP, getRandomSet, checkOirAnswer, getOirSetScore, _clearCache: () => cache.clear() };
