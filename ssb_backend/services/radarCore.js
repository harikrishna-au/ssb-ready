'use strict';
/** Pure Radar logic: no I/O, no clock reads. Every function takes `today` / `now` explicitly. */

const STAGES = ['saved', 'applied', 'admit_card', 'exam_done', 'result', 'ssb_call', 'final'];
const SERVICES = ['Army', 'Navy', 'Air Force', 'Tri-service', 'CAPF', 'State / other'];
const CONFIDENCE = ['official', 'tentative', 'expected'];
const REMINDER_OFFSETS = [7, 3, 1];
const DAY = 86_400_000;
const ISO = /^\d{4}-\d{2}-\d{2}$/;

const isIsoDate = (s) => typeof s === 'string' && ISO.test(s) && !Number.isNaN(Date.parse(`${s}T00:00:00Z`)) && new Date(`${s}T00:00:00Z`).toISOString().slice(0, 10) === s;

/** yyyy-mm-dd for the given instant in India (UTC+5:30, no DST). */
const istToday = (nowMs) => new Date(nowMs + 5.5 * 3_600_000).toISOString().slice(0, 10);
const diffDays = (a, b) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / DAY);

/** Status + countdown. An entry with no last date is never "open": we do not know when it closes. */
function annotate(item, today) {
  const opened = !item.opens || item.opens <= today;
  const closed = item.lastDate ? item.lastDate < today : false;
  const status = closed ? 'closed' : opened && item.lastDate ? 'open' : 'upcoming';
  return {
    ...item,
    status,
    daysToLastDate: item.lastDate ? diffDays(today, item.lastDate) : undefined,
    daysToOpen: item.opens && item.opens > today ? diffDays(today, item.opens) : undefined,
  };
}

/** Fields that need a human before a row may go public. Returns a list of plain-language problems. */
function publishProblems(n) {
  const p = [];
  if (!n.title || !n.title.trim()) p.push('Add a title.');
  if (!n.conductedBy) p.push('Say who conducts it.');
  if (!n.sourceUrl || !/^https:\/\//.test(n.sourceUrl)) p.push('Add the https link of the official notice or page the dates come from.');
  if (!n.officialApplyUrl || !/^https:\/\//.test(n.officialApplyUrl)) p.push('Add the official apply link.');
  if (!isIsoDate(n.verifiedOn)) p.push('Stamp the date you checked the official source.');
  for (const k of ['opens', 'lastDate', 'examDate']) if (n[k] && !isIsoDate(n[k])) p.push(`${k} is not a valid yyyy-mm-dd date.`);
  if (n.opens && n.lastDate && n.opens > n.lastDate) p.push('Opening date is after the last date.');
  if (n.confidence === 'official' && !n.lastDate && !n.examDate && !n.opens) p.push('An official entry needs at least one date.');
  return p;
}

const TRACKED = ['title', 'body', 'conductedBy', 'service', 'exam', 'opens', 'lastDate', 'examDate', 'confidence', 'sourceUrl', 'officialApplyUrl', 'applyLabel', 'status', 'verifiedOn'];
/** { field: {from,to} } for every tracked field that differs. */
function diffFields(before, after) {
  const out = {};
  for (const k of TRACKED) {
    const a = before?.[k] ?? null;
    const b = after?.[k] ?? null;
    if (a !== b) out[k] = { from: a, to: b };
  }
  return out;
}

/** Which reminder (if any) is due today for a deadline: exactly 7, 3 or 1 days out. */
function dueOffset(lastDate, today) {
  if (!lastDate) return null;
  const d = diffDays(today, lastDate);
  return REMINDER_OFFSETS.includes(d) ? d : null;
}

/** Same key => same email. The last date is part of the key, so a moved deadline is a fresh reminder. */
const deadlineKey = (n, offset, userId) => `deadline:${n.id}:${n.lastDate}:${offset}:${userId}`;
const changeKey = (n, userId) => `change:${n.id}:v${n.version}:${userId}`;
const digestKey = (today, userId) => `digest:${today}:${userId}`;

/**
 * Merges the old Clerk-metadata tracker into the server tracker. Server rows win on conflict
 * (they are newer by construction); unknown stage ids and oversized notes are dropped.
 * Returns the rows to insert.
 */
function mergeLegacyTracker(serverRows, legacy) {
  const have = new Set(serverRows.map((r) => r.notificationId));
  const out = [];
  if (!legacy || typeof legacy !== 'object') return out;
  for (const [id, v] of Object.entries(legacy)) {
    if (!id || have.has(id) || !v || typeof v !== 'object') continue;
    if (!STAGES.includes(v.status)) continue;
    const note = typeof v.note === 'string' ? v.note.slice(0, 160) : undefined;
    const updatedAt = typeof v.updatedAt === 'string' && !Number.isNaN(Date.parse(v.updatedAt)) ? v.updatedAt : null;
    out.push({ notificationId: id, status: v.status, note, updatedAt });
  }
  return out;
}

// ---- Calendar -------------------------------------------------------------

const icsEscape = (s) => String(s).replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
const compact = (iso) => iso.replace(/-/g, '');
const nextDay = (iso) => new Date(Date.parse(`${iso}T00:00:00Z`) + DAY).toISOString().slice(0, 10);

/** All-day events for each known date. `stamp` is an ISO instant passed by the caller. */
function dateEvents(n) {
  const ev = [];
  if (n.opens) ev.push({ key: 'opens', date: n.opens, title: `Opens: ${n.title}` });
  if (n.lastDate) ev.push({ key: 'last', date: n.lastDate, title: `Last date to apply: ${n.title}` });
  if (n.examDate) ev.push({ key: 'exam', date: n.examDate, title: `Exam: ${n.title}` });
  return ev;
}
function eventDescription(n) {
  return `${n.confidence === 'official' ? 'Official dates' : n.confidence === 'tentative' ? 'Tentative dates' : 'Expected, not announced'}. Confirm on the official site before you act: ${n.officialApplyUrl || n.sourceUrl || ''}`;
}

function toIcs(items, stamp) {
  const dtstamp = stamp.replace(/[-:]/g, '').replace(/\.\d+/, '');
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//ReadyKadet//Radar//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH'];
  for (const n of items) {
    for (const e of dateEvents(n)) {
      lines.push(
        'BEGIN:VEVENT',
        `UID:${n.id}-${e.key}@readykadet.com`,
        `DTSTAMP:${dtstamp}`,
        `DTSTART;VALUE=DATE:${compact(e.date)}`,
        `DTEND;VALUE=DATE:${compact(nextDay(e.date))}`,
        `SUMMARY:${icsEscape(e.title)}`,
        `DESCRIPTION:${icsEscape(eventDescription(n))}`,
        ...(e.key === 'last' ? ['BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:Last date is tomorrow', 'TRIGGER:-P1D', 'END:VALARM'] : []),
        'END:VEVENT',
      );
    }
  }
  lines.push('END:VCALENDAR');
  return lines.join('\r\n') + '\r\n';
}

/** Google Calendar "add event" link for the most useful date (last date, else exam, else opens). */
function googleCalendarUrl(n) {
  const e = dateEvents(n).find((x) => x.key === 'last') || dateEvents(n).find((x) => x.key === 'exam') || dateEvents(n)[0];
  if (!e) return null;
  const q = new URLSearchParams({ action: 'TEMPLATE', text: e.title, dates: `${compact(e.date)}/${compact(nextDay(e.date))}`, details: eventDescription(n) });
  return `https://calendar.google.com/calendar/render?${q}`;
}

// ---- Feeds ----------------------------------------------------------------

const xmlEscape = (s) => String(s).replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[c]);

function toRss(items, { siteUrl, title, buildDate }) {
  const rows = items.map((n) => {
    const link = `${siteUrl}/radar#${n.id}`;
    const d = [n.opens && `Opens ${n.opens}`, n.lastDate && `Last date ${n.lastDate}`, n.examDate && `Exam ${n.examDate}`].filter(Boolean).join(' · ') || 'Dates not announced';
    return `<item><title>${xmlEscape(n.title)}</title><link>${xmlEscape(link)}</link><guid isPermaLink="false">${xmlEscape(`${n.id}-v${n.version}`)}</guid><pubDate>${new Date(n.updatedAt).toUTCString()}</pubDate><description>${xmlEscape(`${d}. ${n.body}`)}</description></item>`;
  });
  return `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>${xmlEscape(title)}</title><link>${xmlEscape(siteUrl + '/radar')}</link><description>Defence recruitment dates. Always confirm on the official site.</description><lastBuildDate>${new Date(buildDate).toUTCString()}</lastBuildDate>${rows.join('')}</channel></rss>`;
}

// ---- Row mapping ----------------------------------------------------------

const toRow = (n) => ({
  id: n.id, title: n.title, body: n.body ?? '', conducted_by: n.conductedBy, service: n.service, exam: n.exam,
  opens: n.opens || null, last_date: n.lastDate || null, exam_date: n.examDate || null, confidence: n.confidence,
  source_url: n.sourceUrl || null, official_apply_url: n.officialApplyUrl || null, apply_label: n.applyLabel || 'Official site',
  status: n.status, verified_by: n.verifiedBy || null, verified_on: n.verifiedOn || null, version: n.version ?? 1,
  created_at: n.createdAt, updated_at: n.updatedAt,
});
const fromRow = (r) => ({
  id: r.id, title: r.title, body: r.body ?? '', conductedBy: r.conducted_by, service: r.service, exam: r.exam,
  opens: r.opens || undefined, lastDate: r.last_date || undefined, examDate: r.exam_date || undefined, confidence: r.confidence,
  sourceUrl: r.source_url || undefined, officialApplyUrl: r.official_apply_url || undefined, applyLabel: r.apply_label,
  status: r.status, verifiedBy: r.verified_by || undefined, verifiedOn: r.verified_on || undefined, version: r.version,
  createdAt: r.created_at, updatedAt: r.updated_at,
});

/** What the public API returns. Strips the admin id. */
const toPublic = (n) => {
  const { verifiedBy, status, createdAt, ...rest } = n; // eslint-disable-line no-unused-vars
  return { ...rest, note: n.body };
};

module.exports = {
  STAGES, SERVICES, CONFIDENCE, REMINDER_OFFSETS, isIsoDate, istToday, diffDays, annotate, publishProblems, diffFields,
  dueOffset, deadlineKey, changeKey, digestKey, mergeLegacyTracker, toIcs, googleCalendarUrl, toRss, toRow, fromRow, toPublic, TRACKED,
};
