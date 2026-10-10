import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sumDays, kpis, funnel, demand, visitorInterests, dayRange, formatSeconds, topEntries } from '../../src/utils/analyticsSummary.js';

const shards = [
  { id: '2026-10-09_0', date: '2026-10-09', sessions: 10, visitors: 8, pageViews: 40, propertyViews: 20, engagedViews: 5, engagedSeconds: 500,
    contacts: { whatsapp: 3 }, leads: 1, funnel: { viewed: 7, contacted: 3, lead: 1 }, viewAreas: { east: 10, tahta: 2 }, searchAreas: { tahta: 5 },
    viewBands: { m2_3: 4 }, calcBands: { m2_3: 1 }, batches: 30, anonymousBatches: 6, updatedAt: { toMillis: () => 0, seconds: 1 } },
  { id: '2026-10-10_3', date: '2026-10-10', sessions: 10, visitors: 9, contacts: { whatsapp: 1, phone: 1 }, leads: 1, funnel: { viewed: 5 }, batches: 10 },
];

test('sums shards per day and overall, ignoring timestamps', () => {
  const { totals, byDay } = sumDays(shards);
  assert.equal(totals.sessions, 20);
  assert.equal(totals.contacts.whatsapp, 4);
  assert.equal(totals.updatedAt, undefined);
  assert.equal(byDay['2026-10-10'].visitors, 9);
});

test('kpis, funnel and demand', () => {
  const { totals } = sumDays(shards);
  const k = kpis(totals);
  assert.equal(k.contacts, 5);
  assert.equal(k.conversionRate, 10);
  assert.equal(k.avgReadSeconds, 100);
  assert.equal(k.anonymousShare, 15);
  const f = funnel(totals);
  assert.deepEqual(f.map((s) => s.count), [20, 12, 0, 0, 3, 1]);
  const d = demand(totals);
  assert.deepEqual(d.areas[0], ['east', 10]);
  assert.deepEqual(d.areas[1], ['tahta', 7]);
  assert.deepEqual(d.bands.find(([id]) => id === 'm2_3'), ['m2_3', 5]);
});

test('visitor interests and helpers', () => {
  const v = visitorInterests({ intent: 30, areas: { girga: 6, east: 1 }, props: { 'prop-1': 2, 'prop-2': 1 }, propSecs: { 'prop-2': 300 }, contacts: { whatsapp: 2 } });
  assert.equal(v.level, 'hot');
  assert.equal(v.topProps[0].id, 'prop-2');
  assert.equal(v.contacts, 2);
  assert.deepEqual(dayRange(3, Date.UTC(2026, 9, 10, 12)), ['2026-10-08', '2026-10-09', '2026-10-10']);
  assert.equal(formatSeconds(200), '3د 20ث');
  assert.deepEqual(topEntries({ a: 0, b: 2 }), [['b', 2]]);
});
