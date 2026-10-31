const test = require('node:test');
const assert = require('node:assert/strict');
const c = require('../services/radarCore');

const base = { id: 'x', title: 'T', conductedBy: 'UPSC', sourceUrl: 'https://upsc.gov.in', officialApplyUrl: 'https://upsconline.nic.in', verifiedOn: '2026-10-31', confidence: 'tentative' };

test('istToday uses India time, not UTC', () => {
  // 2026-10-31 20:00 UTC is already 1 Nov 01:30 in India
  assert.equal(c.istToday(Date.UTC(2026, 9, 31, 20, 0)), '2026-11-01');
  assert.equal(c.istToday(Date.UTC(2026, 9, 31, 10, 0)), '2026-10-31');
});

test('annotate: open, upcoming, closed and no-last-date', () => {
  const t = '2026-12-10';
  assert.equal(c.annotate({ ...base, opens: '2026-12-02', lastDate: '2026-12-22' }, t).status, 'open');
  assert.equal(c.annotate({ ...base, opens: '2026-12-02', lastDate: '2026-12-22' }, t).daysToLastDate, 12);
  assert.equal(c.annotate({ ...base, opens: '2026-12-15', lastDate: '2026-12-22' }, t).status, 'upcoming');
  assert.equal(c.annotate({ ...base, opens: '2026-12-15', lastDate: '2026-12-22' }, t).daysToOpen, 5);
  assert.equal(c.annotate({ ...base, lastDate: '2026-12-09' }, t).status, 'closed');
  assert.equal(c.annotate({ ...base, lastDate: '2026-12-10' }, t).status, 'open'); // last day still open
  assert.equal(c.annotate({ ...base, opens: '2026-01-01' }, t).status, 'upcoming'); // never "open" without a last date
});

test('publishProblems forces a source link, apply link and checked date', () => {
  assert.deepEqual(c.publishProblems(base), []);
  assert.equal(c.publishProblems({ ...base, sourceUrl: undefined }).length, 1);
  assert.equal(c.publishProblems({ ...base, sourceUrl: 'http://insecure' }).length, 1);
  assert.equal(c.publishProblems({ ...base, verifiedOn: undefined }).length, 1);
  assert.equal(c.publishProblems({ ...base, officialApplyUrl: '' }).length, 1);
  assert.ok(c.publishProblems({ ...base, opens: '2026-02-30' }).length >= 1);
  assert.ok(c.publishProblems({ ...base, opens: '2026-12-30', lastDate: '2026-12-01' }).length >= 1);
  assert.ok(c.publishProblems({ ...base, confidence: 'official' }).length >= 1);
});

test('diffFields reports only changed tracked fields', () => {
  const d = c.diffFields({ ...base, lastDate: '2026-12-22' }, { ...base, lastDate: '2026-12-29', note: 'ignored' });
  assert.deepEqual(d, { lastDate: { from: '2026-12-22', to: '2026-12-29' } });
});

test('reminder windows fire at exactly 7, 3 and 1 days', () => {
  const last = '2026-12-22';
  assert.equal(c.dueOffset(last, '2026-12-15'), 7);
  assert.equal(c.dueOffset(last, '2026-12-19'), 3);
  assert.equal(c.dueOffset(last, '2026-12-21'), 1);
  for (const t of ['2026-12-14', '2026-12-16', '2026-12-20', '2026-12-22', '2026-12-23']) assert.equal(c.dueOffset(last, t), null);
  assert.equal(c.dueOffset(undefined, '2026-12-15'), null);
});

test('dedupe keys: a moved last date makes a new key, same inputs the same key', () => {
  const n = { id: 'a', lastDate: '2026-12-22', version: 2 };
  assert.equal(c.deadlineKey(n, 7, 'u1'), c.deadlineKey({ ...n }, 7, 'u1'));
  assert.notEqual(c.deadlineKey(n, 7, 'u1'), c.deadlineKey({ ...n, lastDate: '2026-12-29' }, 7, 'u1'));
  assert.notEqual(c.changeKey(n, 'u1'), c.changeKey({ ...n, version: 3 }, 'u1'));
});

test('legacy Clerk tracker merge: server wins, bad stages and long notes handled', () => {
  const server = [{ notificationId: 'a', status: 'applied' }];
  const legacy = {
    a: { status: 'saved', updatedAt: '2026-01-01T00:00:00Z' },
    b: { status: 'admit_card', note: 'x'.repeat(300), updatedAt: '2026-02-01T00:00:00Z' },
    c: { status: 'bogus' },
    d: null,
  };
  const out = c.mergeLegacyTracker(server, legacy);
  assert.equal(out.length, 1);
  assert.equal(out[0].notificationId, 'b');
  assert.equal(out[0].note.length, 160);
  assert.deepEqual(c.mergeLegacyTracker([], undefined), []);
});

test('ics has all-day events, escapes text and an alarm on the last date', () => {
  const ics = c.toIcs([{ ...base, title: 'A, B; C', opens: '2026-12-02', lastDate: '2026-12-22', examDate: '2027-04-11' }], '2026-10-31T10:00:00.000Z');
  assert.match(ics, /DTSTART;VALUE=DATE:20261222\r\nDTEND;VALUE=DATE:20261223/);
  assert.match(ics, /SUMMARY:Last date to apply: A\\, B\; C/);
  assert.equal((ics.match(/BEGIN:VEVENT/g) || []).length, 3);
  assert.match(ics, /TRIGGER:-P1D/);
  assert.match(ics, /DTSTAMP:20261031T100000Z/);
  assert.match(c.googleCalendarUrl({ ...base, lastDate: '2026-12-22' }), /dates=20261222%2F20261223/);
  assert.equal(c.googleCalendarUrl(base), null);
});

test('toPublic hides the admin id and status', () => {
  const p = c.toPublic({ ...base, body: 'b', status: 'published', verifiedBy: 'user_1', createdAt: 'x', version: 1, updatedAt: 'y' });
  assert.equal(p.verifiedBy, undefined);
  assert.equal(p.note, 'b');
});
