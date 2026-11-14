import test from 'node:test';
import assert from 'node:assert/strict';
import { enteredAt, periodMetrics, compareMetrics, dailySeries, cohortReports, sellerPerformance, insights } from '../../src/utils/performanceReport.js';
import { campaignReport } from '../../src/utils/campaignReport.js';

const NOW = Date.parse('2026-11-14T10:00:00Z');
const DAY = 86_400_000;
const iso = (daysAgo, extraMs = 0) => new Date(NOW - daysAgo * DAY + extraMs).toISOString();
let n = 0;
const lead = (o) => ({ id: `l${n += 1}`, status: 'new', createdAt: iso(3), ...o });
const week = { from: '2026-11-08', to: '2026-11-14', days: 7 };
const before = { from: '2026-11-01', to: '2026-11-07', days: 7 };

test('enteredAt takes the first time a lead reached any of the stages, falling back to closedAt / lostAt', () => {
  const l = lead({ stageHistory: [{ s: 'site_visit', at: iso(2) }, { s: 'closed', at: iso(1) }] });
  assert.equal(enteredAt(l, ['site_visit', 'closed']), Date.parse(iso(2)));
  assert.equal(enteredAt(lead({}), ['closed']), 0);
  assert.equal(enteredAt(lead({ status: 'closed', closedAt: iso(1) }), ['closed']), Date.parse(iso(1)));
  assert.equal(enteredAt(lead({ status: 'lost', lostAt: iso(1) }), ['lost']), Date.parse(iso(1)));
});

test('periodMetrics counts each event on its own day, with reply speed and commission', () => {
  const won = lead({ status: 'closed', createdAt: iso(20), dealValue: 1_000_000, commissionPct: 2, stageHistory: [{ s: 'closed', at: iso(2) }] });
  const replied = lead({ createdAt: iso(3), firstContactedAt: iso(3, 600_000) }); // 10 minutes
  const slow = lead({ createdAt: iso(3), firstContactedAt: iso(3, 3 * 3600_000) });
  const lost = lead({ status: 'lost', createdAt: iso(20), stageHistory: [{ s: 'lost', at: iso(1) }] });
  const old = lead({ createdAt: iso(10) });
  const m = periodMetrics([won, replied, slow, lost, old], [{ status: 'done', doneAt: iso(1) }], week);
  assert.equal(m.newLeads, 2);
  assert.equal(m.replied, 2);
  assert.equal(m.inTimePct, 50);
  assert.equal(m.medianReplyMs, Math.round((600_000 + 3 * 3600_000) / 2));
  assert.equal(m.closed, 1);
  assert.equal(m.commission, 20000);
  assert.equal(m.lost, 1);
  assert.equal(m.tasksDone, 1);
});

test('compareMetrics gives the change in % and null when there was nothing before', () => {
  const c = compareMetrics({ a: 6, b: 3, c: 2 }, { a: 3, b: 0, c: 4 });
  assert.deepEqual(c.a, { cur: 6, prev: 3, change: 100 });
  assert.equal(c.b.change, null);
  assert.equal(c.c.change, -50);
  assert.equal(compareMetrics({ a: 1 }, null).a.prev, null);
});

test('dailySeries buckets new clients and closed deals per day', () => {
  const leads = [lead({ createdAt: iso(1) }), lead({ createdAt: iso(1) }), lead({ createdAt: iso(2), stageHistory: [{ s: 'closed', at: iso(1) }], status: 'closed' })];
  const { step, buckets } = dailySeries(leads, week);
  assert.equal(step, 1);
  assert.equal(buckets.length, 7);
  const d = buckets.find((b) => b.day === '2026-11-13');
  assert.deepEqual([d.newLeads, d.closed], [2, 1]);
  assert.equal(dailySeries([], { from: '2026-01-01', to: '2026-06-30', days: 181 }).step, 7);
});

test('cohortReports: the funnel and the sources of the clients that arrived in the range', () => {
  const leads = [
    lead({ status: 'closed', source: 'ads', stageHistory: [{ s: 'contacted', at: iso(2) }, { s: 'site_visit', at: iso(1) }, { s: 'closed', at: iso(0) }] }),
    lead({ status: 'contacted', source: 'ads', stageHistory: [{ s: 'contacted', at: iso(2) }] }),
    lead({ status: 'lost', lostReason: 'price', source: 'manual' }),
    lead({ source: 'manual' }),
    lead({ createdAt: iso(30) })
  ];
  const { funnel, sources } = cohortReports(leads, week);
  const by = Object.fromEntries(funnel.rows.map((r) => [r.id, r]));
  assert.equal(funnel.total, 4);
  assert.equal(by.contacted.reached, 2);
  assert.equal(by.contacted.ofPrevious, 50);
  assert.equal(by.closed.reached, 1);
  assert.equal(funnel.topLostReason.id, 'price');
  const ads = sources.find((s) => s.leads === 2 && s.closed === 1);
  assert.ok(ads);
  assert.equal(ads.visitPct, 50);
});

test('sellerPerformance groups by owner, with reply speed, closings and task activity', () => {
  const leads = [
    lead({ ownerUid: 'a', ownerName: 'Ali', createdAt: iso(3), firstContactedAt: iso(3, 300_000), status: 'closed', dealValue: 1e6, commissionPct: 2, stageHistory: [{ s: 'closed', at: iso(1) }] }),
    lead({ ownerUid: 'a', ownerName: 'Ali', createdAt: iso(3) }),
    lead({ ownerUid: 'b', ownerName: 'Mona', createdAt: iso(3) })
  ];
  const tasks = [{ assigneeUid: 'a', status: 'done', doneAt: iso(1) }, { assigneeUid: 'b', assigneeName: 'Mona', status: 'open', dueAt: '2020-01-01' }];
  const rows = sellerPerformance(leads, tasks, week, NOW);
  const ali = rows.find((r) => r.uid === 'a');
  assert.deepEqual([ali.leads, ali.replied, ali.closed, ali.commission, ali.tasksDone], [2, 1, 1, 20000, 1]);
  assert.equal(rows[0].uid, 'a');
  assert.equal(rows.find((r) => r.uid === 'b').tasksOverdue, 1);
});

test('insights stay quiet on a handful of leads and speak up on real problems', () => {
  assert.deepEqual(insights({ metrics: { replied: 1, inTimePct: 0, newLeads: 1 }, leads: [], tasks: [], range: week, now: NOW }), []);
  const metrics = { replied: 10, inTimePct: 40, newLeads: 4, closed: 0 };
  const prev = { newLeads: 10, closed: 3 };
  const sources = [{ id: 'ads', label: 'إعلانات', leads: 6, visits: 0, visitPct: 0 }];
  const sellers = [{ name: 'Ali', replied: 5, inTimePct: 20 }];
  const text = insights({ metrics, prev, sources, sellers, leads: [lead({ createdAt: iso(5) })], tasks: [], range: week, now: NOW }).map((i) => i.text).join('\n');
  assert.match(text, /40%/);
  assert.match(text, /قلّوا 60%/);
  assert.match(text, /إعلانات/);
  assert.match(text, /Ali/);
  assert.match(text, /لسه محدش كلّمهم/);
});

test('campaign report adds won / expected commission and the return per pound spent', () => {
  const won = lead({ status: 'closed', utmCampaign: 'x', dealValue: 1_000_000, commissionPct: 2, stageHistory: [{ s: 'closed', at: iso(1) }] });
  const open = lead({ status: 'negotiating', utmCampaign: 'x', dealValue: 1_000_000, commissionPct: 2 });
  const [row] = campaignReport([won, open], { spend: { x: 10000 } });
  assert.equal(row.wonCommission, 20000);
  assert.equal(row.expectedCommission, 10000);
  assert.equal(row.returnPerEgp, 2);
});
