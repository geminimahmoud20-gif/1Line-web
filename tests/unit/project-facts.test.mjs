import test from 'node:test';
import assert from 'node:assert/strict';
import { planExample, projectUnits, projectStages, projectPath, arYears, siteProjects, projectOffer } from '../../src/utils/projectFacts.js';

test('the plan example takes the down payment, then spreads the rest over the years', () => {
  const ex = planExample({ startPrice: 2_200_000, downPaymentPercent: 15, installmentYears: 6 });
  assert.equal(ex.down, 330_000);
  assert.equal(ex.months, 72);
  assert.equal(ex.monthly, Math.ceil((2_200_000 - 330_000) / 72));
  assert.equal(planExample({ startPrice: 2_200_000 }), null);
});

test('only public units tied to the project are listed', () => {
  const list = [
    { id: 'a', projectId: 'p1', status: 'published' },
    { id: 'b', projectId: 'p1', status: 'sold' },
    { id: 'c', projectId: 'p2' },
    { id: 'd' }
  ];
  assert.deepEqual(projectUnits({ id: 'p1' }, list).map((u) => u.id), ['a']);
});

test('stages keep build order and skip the ones never filled in', () => {
  const st = projectStages({ progressBreakdown: { finishing: 60, concrete: 100 } });
  assert.deepEqual(st.map((s) => `${s.key}:${s.value}`), ['concrete:100', 'finishing:60']);
});

test('paths and Arabic year counts', () => {
  assert.equal(projectPath({ id: 'proj 1' }), '/projects/proj%201');
  assert.deepEqual([1, 2, 6, 15].map(arYears), ['سنة', 'سنتين', '6 سنوات', '15 سنة']);
});

test('hidden projects stay off the site', () => {
  const list = [{ id: 'a' }, { id: 'b', isHidden: true }, { id: 'c', status: 'hidden' }, null, { id: 'd', isHidden: false }];
  assert.deepEqual(siteProjects(list).map((p) => p.id), ['a', 'd']);
  assert.deepEqual(siteProjects(undefined), []);
});

test('a project offer runs against the starting price and ends on its last day', () => {
  const now = new Date(2026, 9, 10, 12).getTime();
  const project = { id: 'p', startPrice: 2_000_000, offer: { type: 'cash_discount', price: 1_800_000, from: '2026-10-01', until: '2026-10-15' } };
  const offer = projectOffer(project, now);
  assert.equal(offer.basePrice, 2_000_000);
  assert.equal(offer.savings, 200_000);
  assert.equal(offer.pct, 10);
  assert.equal(projectOffer(project, new Date(2026, 9, 16, 1).getTime()), null);
  assert.equal(projectOffer({ ...project, isDemo: true }, now), null);
  assert.equal(projectOffer({ id: 'x', startPrice: 1 }, now), null);
});
