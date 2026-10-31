'use strict';
/**
 * Assistive source watcher. It never edits a notification: when a page changes it opens a
 * "needs review" item with a diff and a link, and a human decides.
 * Politeness: identified user agent, robots.txt honoured, one request at a time with a delay, size/time caps.
 */
const crypto = require('crypto');

const UA = () => process.env.WATCHER_USER_AGENT || 'ReadyKadetRadarWatcher/1.0 (+https://readykadet.com/radar; low-volume, checks official pages a few times a day)';
const MAX_BYTES = 2_000_000;

/** Visible text, one logical line per block, volatile bits (scripts, styles, comments) removed. */
function extractText(html) {
  return String(html)
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<(script|style|noscript|svg)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<\/(p|div|li|tr|h[1-6]|section|article|ul|ol|table|br)>|<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .split('\n').map((l) => l.replace(/\s+/g, ' ').trim()).filter(Boolean).join('\n');
}
const hashText = (t) => crypto.createHash('sha256').update(t).digest('hex');

/** Line-level set diff; ordering changes alone are not reported. Capped so one noisy page cannot flood the console. */
function diffText(before, after, cap = 40) {
  const a = new Set(before.split('\n'));
  const b = new Set(after.split('\n'));
  return {
    added: [...b].filter((l) => !a.has(l)).slice(0, cap),
    removed: [...a].filter((l) => !b.has(l)).slice(0, cap),
  };
}

/** Minimal robots.txt: Disallow/Allow for our agent or '*', longest match wins. */
function robotsAllows(robotsTxt, path, agent = 'readykadetradarwatcher') {
  const groups = [];
  let cur = null;
  for (const raw of String(robotsTxt).split(/\r?\n/)) {
    const line = raw.replace(/#.*/, '').trim();
    const m = /^([A-Za-z-]+)\s*:\s*(.*)$/.exec(line);
    if (!m) continue;
    const k = m[1].toLowerCase();
    if (k === 'user-agent') {
      if (!cur || cur.rules.length) { cur = { agents: [], rules: [] }; groups.push(cur); }
      cur.agents.push(m[2].toLowerCase());
    } else if (cur && (k === 'allow' || k === 'disallow')) cur.rules.push({ allow: k === 'allow', path: m[2] });
  }
  const pick = groups.find((g) => g.agents.some((x) => x !== '*' && agent.includes(x))) || groups.find((g) => g.agents.includes('*'));
  if (!pick) return true;
  let best = null;
  for (const r of pick.rules) {
    if (!r.path) continue;
    if (path.startsWith(r.path) && (!best || r.path.length > best.path.length)) best = r;
  }
  return best ? best.allow : true;
}

async function defaultFetch(url, { timeoutMs = 20_000 } = {}) {
  const res = await fetch(url, { headers: { 'User-Agent': UA(), Accept: 'text/html,text/plain' }, redirect: 'follow', signal: AbortSignal.timeout(timeoutMs) });
  const buf = Buffer.from(await res.arrayBuffer()).subarray(0, MAX_BYTES);
  return { ok: res.ok, status: res.status, text: buf.toString('utf8') };
}

/**
 * Checks each enabled source once, sequentially. `fetchImpl` and `sleep` are injected for tests.
 * First sight of a page stores a baseline and raises nothing.
 */
async function runWatcher({ store, nowIso, fetchImpl = defaultFetch, sleep = (ms) => new Promise((r) => setTimeout(r, ms)), delayMs = 3000, only }) {
  const sources = (await store.listSources()).filter((s) => s.enabled !== false && (!only || only.includes(s.url)));
  const robotsCache = new Map();
  const results = [];
  let first = true;

  for (const s of sources) {
    const u = new URL(s.url);
    if (!first) await sleep(delayMs);
    first = false;
    try {
      if (!robotsCache.has(u.origin)) {
        let txt = '';
        try { const r = await fetchImpl(`${u.origin}/robots.txt`); if (r.ok) txt = r.text; } catch { /* no robots.txt reachable: proceed politely */ }
        robotsCache.set(u.origin, txt);
        await sleep(delayMs);
      }
      if (!robotsAllows(robotsCache.get(u.origin), u.pathname)) {
        await store.saveSource({ url: s.url, lastCheckedAt: nowIso, lastError: 'blocked by robots.txt' });
        results.push({ url: s.url, outcome: 'robots-blocked' });
        continue;
      }
      const r = await fetchImpl(s.url);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const text = extractText(r.text);
      const hash = hashText(text);
      if (!s.contentHash) {
        await store.saveSource({ url: s.url, contentHash: hash, contentText: text, lastCheckedAt: nowIso, lastError: null });
        results.push({ url: s.url, outcome: 'baseline' });
      } else if (hash === s.contentHash) {
        await store.saveSource({ url: s.url, lastCheckedAt: nowIso, lastError: null });
        results.push({ url: s.url, outcome: 'unchanged' });
      } else {
        const diff = diffText(s.contentText || '', text);
        await store.saveSource({ url: s.url, contentHash: hash, contentText: text, lastCheckedAt: nowIso, lastChangedAt: nowIso, lastError: null });
        if (diff.added.length || diff.removed.length) {
          await store.addReview({ sourceUrl: s.url, label: s.label, notificationId: s.notificationId || undefined, diff, createdAt: nowIso });
          results.push({ url: s.url, outcome: 'changed', added: diff.added.length, removed: diff.removed.length });
        } else results.push({ url: s.url, outcome: 'reordered-only' });
      }
    } catch (e) {
      await store.saveSource({ url: s.url, lastCheckedAt: nowIso, lastError: String(e.message).slice(0, 200) });
      results.push({ url: s.url, outcome: 'error', error: String(e.message) });
    }
  }
  return results;
}

module.exports = { extractText, hashText, diffText, robotsAllows, runWatcher, UA };
