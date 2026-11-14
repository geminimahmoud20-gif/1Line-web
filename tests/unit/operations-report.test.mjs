import test from 'node:test';
import assert from 'node:assert/strict';
import { portfolioReport, demandsReport, intakeReport } from '../../src/utils/operationsReport.js';

const NOW = Date.parse('2026-11-14T10:00:00Z');
const DAY = 86_400_000;
const iso = (d) => new Date(NOW - d * DAY).toISOString();
const week = { from: '2026-11-08', to: '2026-11-14', days: 7 };
const before = { from: '2026-11-01', to: '2026-11-07', days: 7 };
const prop = (o) => ({ id: Math.random().toString(36), status: 'published', type: 'apartment', price: 1_000_000, size: 100, areaKey: 'new_sohag', title_ar: 'شقة', images: ['https://x/1.jpg'], createdAt: iso(40), ...o });

test('portfolio: status counts, kinds with a median only from three priced listings, areas and what is missing', () => {
  const list = [
    prop({ createdAt: iso(2) }), prop({ price: 2_000_000 }), prop({ price: 3_000_000, updatedAt: iso(1) }),
    prop({ type: 'land', price: 500_000, size: 250, images: [] }), prop({ status: 'sold' }), prop({ status: 'hidden' }),
    prop({ isDeleted: true }), prop({ isDemo: true }), prop({ createdAt: iso(10) })
  ];
  const r = portfolioReport(list, { range: week, prevRange: before, now: NOW, staleDays: 30, areaNames: { new_sohag: 'سوهاج الجديدة' } });
  assert.equal(r.total, 7);
  assert.deepEqual([r.byStatus.published, r.byStatus.sold, r.byStatus.hidden], [5, 1, 1]);
  assert.equal(r.added.cur, 1);
  assert.equal(r.added.prev, 1); // the listing created 10 days ago
  const apts = r.kinds.find((k) => k.label === 'الشقق');
  assert.equal(apts.count, 4);
  assert.equal(apts.medianPpm, 15000);
  assert.equal(r.kinds.find((k) => k.label === 'أراضي المباني').medianPpm, 0); // one listing is not a "median"
  assert.equal(r.areas[0].label, 'سوهاج الجديدة');
  assert.equal(r.incomplete, 1);
  assert.equal(r.issues[0].id, 'photo');
  assert.equal(r.stale, 2); // published and untouched for over 30 days: the land and the 2M flat (the others are newer or updated)
});

test('demands: new in the period, status split, budgets of the published ones, where they ask', () => {
  const d = [
    { status: 'pending', createdAt: iso(1), budget: '2,000,000', areaKey: 'a' },
    { status: 'published', createdAt: iso(2), budget: 3_000_000, areaKey: 'a', type: 'apartment' },
    { createdAt: iso(3), budget: 1_000_000, areaKey: 'b', type: 'apartment' },
    { status: 'published', createdAt: iso(9), budget: 4_000_000, areaKey: 'a', type: 'villa' },
    { status: 'archived', createdAt: iso(30) }
  ];
  const r = demandsReport(d, { range: week, prevRange: before, areaNames: { a: 'سوهاج الجديدة' } });
  assert.deepEqual([r.total, r.pending, r.published, r.archived], [5, 1, 3, 1]);
  assert.deepEqual([r.added.cur, r.added.prev], [3, 1]);
  assert.equal(r.totalBudget, 8_000_000);
  assert.equal(r.medianBudget, 3_000_000);
  assert.equal(r.areas[0].label, 'سوهاج الجديدة');
  assert.equal(r.types[0].id, 'apartment');
});

test('intake: expat and trade-ins counted apart, with the open ones and the longest wait', () => {
  const reqs = [
    { _kind: 'remote_inspections', status: 'new', createdAt: iso(5) },
    { _kind: 'remote_inspections', status: 'closed', createdAt: iso(20) },
    { _kind: 'trade_ins', createdAt: iso(12) },
    { _kind: 'trade_ins', status: 'rejected', createdAt: iso(3) }
  ];
  const r = intakeReport(reqs, { range: week, prevRange: before, now: NOW });
  assert.deepEqual([r.expat.total, r.expat.open, r.expat.new, r.expat.oldestWaitDays, r.expat.added.cur], [2, 1, 1, 5, 1]);
  assert.deepEqual([r.tradeIns.total, r.tradeIns.open, r.tradeIns.oldestWaitDays], [2, 1, 12]);
});

test('empty lists do not produce NaN', () => {
  const p = portfolioReport([], { range: week, now: NOW });
  const d = demandsReport([], { range: week });
  const i = intakeReport([], { range: week, now: NOW });
  assert.ok(!/NaN|undefined/.test(JSON.stringify([p, d, i])));
  assert.equal(p.added.prev, null);
});
