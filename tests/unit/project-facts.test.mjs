import test from 'node:test';
import assert from 'node:assert/strict';
import { planExample, projectUnits, projectStages, projectPath, arYears } from '../../src/utils/projectFacts.js';

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
