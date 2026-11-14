import test from 'node:test';
import assert from 'node:assert/strict';
import { buildWeeklyReport, runWeeklyReport, weekWindow, splitMessage } from '../../api/_weekly-report-core.js';

const NOW = Date.parse('2026-11-14T05:00:00Z'); // Saturday morning in Cairo
const DAY = 86_400_000;
const iso = (daysAgo, extra = 0) => new Date(NOW - daysAgo * DAY + extra).toISOString();
const lead = (o) => ({ id: Math.random().toString(36).slice(2), status: 'new', createdAt: iso(3), source: 'ads', ...o });

const data = () => ({
  goals: { team: { closed: 4, leads: 5 }, people: { a: { closed: 3 } } },
  leads: [
    lead({ ownerName: 'Ali', ownerUid: 'a', firstContactedAt: iso(3, 600_000), status: 'closed', dealValue: 1_000_000, commissionPct: 2, stageHistory: [{ s: 'site_visit', at: iso(2) }, { s: 'closed', at: iso(1) }], name: 'زينب مرتضى', phone: '01011112222' }),
    lead({ ownerName: 'Ali', ownerUid: 'a', firstContactedAt: iso(4, 900_000), status: 'site_visit', stageHistory: [{ s: 'site_visit', at: iso(2) }] }),
    lead({ createdAt: iso(5) }),
    lead({ createdAt: iso(10) }),
    lead({ createdAt: iso(11) })
  ],
  tasks: [{ status: 'done', doneAt: iso(2), assigneeUid: 'a', assigneeName: 'Ali' }]
});

test('the window is the 7 days that ended yesterday in Cairo, and the 7 before', () => {
  const { range, prev } = weekWindow(NOW);
  assert.deepEqual([range.from, range.to], ['2026-11-07', '2026-11-13']);
  assert.deepEqual([prev.from, prev.to], ['2026-10-31', '2026-11-06']);
});

test('the report states the week against the one before, with no client name or phone', () => {
  const r = buildWeeklyReport(data(), { now: NOW, siteUrl: 'https://s' });
  assert.equal(r.week, '2026-11-13');
  assert.match(r.text, /تقرير الأسبوع \(7 نوفمبر – 13 نوفمبر\)/);
  assert.match(r.text, /عملاء جدد: 3 \(↑50%\)/);
  assert.match(r.text, /صفقات اتقفلت: 1 · عمولتها: 20,000 ج/);
  assert.match(r.text, /أكتر صفقات: Ali \(1\)/);
  assert.match(r.text, /https:\/\/s\/crm/);
  assert.ok(!/زينب|مرتضى|01011112222/.test(r.text));
  assert.ok(!/NaN|undefined/.test(r.text));
});

test('a quiet week still reads well', () => {
  const r = buildWeeklyReport({ leads: [], tasks: [] }, { now: NOW });
  assert.match(r.text, /عملاء جدد: 0/);
  assert.ok(!/NaN|undefined/.test(r.text));
});

const deps = (over = {}) => {
  const sent = [];
  return { sent, now: () => NOW, load: async () => data(), claimWeek: async () => true, releaseWeek: async () => {}, sendAll: async (t) => { sent.push(t); return 1; }, ...over };
};

test('preview sends nothing; a cron run sends once per week; a failed send gives the week back', async () => {
  const d = deps();
  assert.equal((await runWeeklyReport(d, { mode: 'preview' })).status, 200);
  assert.equal(d.sent.length, 0);
  assert.equal((await runWeeklyReport(d, { mode: 'cron' })).status, 200);
  assert.ok(d.sent.length >= 1);
  const taken = deps({ claimWeek: async () => false });
  assert.equal((await runWeeklyReport(taken, { mode: 'cron' })).body.skipped, 'already-sent');
  assert.equal(taken.sent.length, 0);
  let released = '';
  const failing = deps({ sendAll: async () => 0, releaseWeek: async (k) => { released = k; } });
  assert.equal((await runWeeklyReport(failing, { mode: 'cron' })).status, 502);
  assert.equal(released, 'week-2026-11-13');
});

test('a test send is labelled and does not claim the week', async () => {
  let claimed = false;
  const d = deps({ claimWeek: async () => { claimed = true; return true; } });
  await runWeeklyReport(d, { mode: 'test' });
  assert.equal(claimed, false);
  assert.match(d.sent[0], /نسخة تجربة/);
  assert.ok(splitMessage('x').length === 1);
});

test('the report shows the month\'s goals against the pace and who is behind', () => {
  const r = buildWeeklyReport(data(), { now: NOW });
  assert.match(r.text, /🎯 أهداف الشهر \(يوم 14 من 30\)/);
  assert.match(r.text, /صفقات: 1 من 4 \(25%\)/);
  assert.match(r.text, /متأخرين عن هدفهم: Ali/);
  assert.ok(!/🎯/.test(buildWeeklyReport({ leads: [], tasks: [] }, { now: NOW }).text)); // no goals set: no section
});
