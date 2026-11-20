import test from 'node:test';
import assert from 'node:assert/strict';
import { dashboardView, sourceSlices, MIN_FOR_CHARTS } from '../../src/utils/dashboardView.js';

const NOW = Date.parse('2026-11-20T12:00:00Z');
const daysAgo = (n, h = 10) => new Date(NOW - n * 86400000 + (h - 12) * 3600000).toISOString();
const lead = (id, ago, o = {}) => ({ id, name: id, status: 'new', createdAt: daysAgo(ago), assignedTo: 'Sales Team A', source: 'موقع', ...o });

test('counts this window against the one before, with the change in percent', () => {
  const leads = [
    ...Array.from({ length: 6 }, (_, i) => lead('c' + i, i + 1)),       // 6 in the last 30 days
    ...Array.from({ length: 3 }, (_, i) => lead('p' + i, 35 + i))       // 3 in the 30 days before
  ];
  const v = dashboardView(leads, { now: NOW });
  assert.equal(v.metrics.newLeads, 6);
  assert.equal(v.change.newLeads.prev, 3);
  assert.equal(v.change.newLeads.change, 100);
});

test('the daily series covers the trend window, oldest first, and adds up', () => {
  const leads = [lead('a', 0), lead('b', 0), lead('c', 3), lead('old', 20)];
  const v = dashboardView(leads, { now: NOW, trendDays: 14 });
  assert.equal(v.series.length, 14);
  assert.equal(v.trend.newLeads.length, 14);
  assert.equal(v.trend.newLeads.at(-1), 2);          // today
  assert.equal(v.trend.newLeads.at(-4), 1);          // three days ago
  assert.equal(v.trend.newLeads.reduce((a, b) => a + b, 0), 3); // the 20-day-old one is outside
});

test('funnel: every stage in order, the first holds everyone who arrived', () => {
  const leads = [lead('a', 1), lead('b', 2, { status: 'contacted' }), lead('c', 3, { status: 'negotiating' }), lead('d', 4, { status: 'closed', closedAt: daysAgo(1) }), lead('e', 5), lead('f', 6, { status: 'lost' })];
  const v = dashboardView(leads, { now: NOW });
  assert.deepEqual(v.funnel.rows.map((r) => r.id), ['new', 'contacted', 'site_visit', 'negotiating', 'closing', 'closed']);
  assert.equal(v.funnel.rows[0].value, 6);
  assert.ok(v.funnel.rows.every((r, i, a) => i === 0 || r.value <= a[i - 1].value), 'a later stage never holds more than the one before');
  assert.equal(v.funnel.lost, 1);
  assert.equal(v.enough, true);
});

test('too few clients: the charts are told there is not enough to draw', () => {
  const v = dashboardView([lead('a', 1), lead('b', 2)], { now: NOW });
  assert.equal(v.enough, false);
  assert.ok(MIN_FOR_CHARTS > 2);
  const none = dashboardView([], { now: NOW });
  assert.equal(none.metrics.newLeads, 0);
  assert.deepEqual(none.sources, []);
  assert.equal(none.series.length, 14);
});

test('sources: top four plus «أخرى», shares add to about 100 and use the CRM labels', () => {
  const mk = (id, n) => ({ id, label: id, leads: n });
  const slices = sourceSlices([mk('website', 10), mk('ads', 8), mk('whatsapp', 6), mk('broker', 4), mk('referral', 2), mk('import', 1)]);
  assert.equal(slices.length, 5);
  assert.equal(slices.at(-1).id, 'other');
  assert.equal(slices.at(-1).value, 3);
  assert.equal(slices[0].label, 'الموقع');
  const sum = slices.reduce((s, x) => s + x.pct, 0);
  assert.ok(sum >= 98 && sum <= 102, `shares add up to ${sum}`);
  assert.deepEqual(sourceSlices([]), []);
});

test('a desk agent sees only their desk and no league table', () => {
  const leads = [lead('a', 1), lead('b', 2, { assignedTo: 'Sales Team B' }), lead('c', 3, { assignedTo: 'Sales Team B' })];
  const mine = dashboardView(leads, { now: NOW, scopeDesk: 'Sales Team A' });
  assert.equal(mine.metrics.newLeads, 1);
  assert.deepEqual(mine.sellers, []);
  assert.equal(dashboardView(leads, { now: NOW }).metrics.newLeads, 3);
});
