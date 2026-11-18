import test from 'node:test';
import assert from 'node:assert/strict';
import { dayOf, addDays, addMonths, spanDays, eachDay, resolveRange, comparisonRange, inRange } from '../../src/utils/reportPeriods.js';

const NOW = Date.parse('2026-11-14T10:00:00Z'); // 12:00 in Cairo, a Saturday

test('dayOf uses Egypt\'s calendar day, not UTC', () => {
  assert.equal(dayOf(Date.parse('2026-11-13T22:30:00Z')), '2026-11-14'); // 00:30 in Cairo
  assert.equal(dayOf(0), '');
});

test('day arithmetic and month shifts clamp to the month end', () => {
  assert.equal(addDays('2026-03-01', -1), '2026-02-28');
  assert.equal(spanDays('2026-11-01', '2026-11-14'), 14);
  assert.deepEqual(eachDay('2026-11-12', '2026-11-14'), ['2026-11-12', '2026-11-13', '2026-11-14']);
  assert.equal(addMonths('2026-03-31', -1), '2026-02-28');
  assert.equal(addMonths('2026-01-15', -1), '2025-12-15');
});

test('presets resolve to inclusive ranges', () => {
  assert.deepEqual(resolveRange('7', NOW), { from: '2026-11-08', to: '2026-11-14', days: 7 });
  assert.deepEqual(resolveRange('today', NOW), { from: '2026-11-14', to: '2026-11-14', days: 1 });
  assert.deepEqual(resolveRange('yesterday', NOW), { from: '2026-11-13', to: '2026-11-13', days: 1 });
  assert.deepEqual(resolveRange('month', NOW), { from: '2026-11-01', to: '2026-11-14', days: 14 });
  assert.deepEqual(resolveRange('lastMonth', NOW), { from: '2026-10-01', to: '2026-10-31', days: 31 });
});

test('a custom range is swapped when backwards, falls back when invalid, and is capped at a year', () => {
  assert.deepEqual(resolveRange('custom', NOW, { from: '2026-11-10', to: '2026-11-05' }), { from: '2026-11-05', to: '2026-11-10', days: 6 });
  assert.equal(resolveRange('custom', NOW, { from: 'x', to: '' }).days, 30);
  assert.equal(resolveRange('custom', NOW, { from: '2020-01-01', to: '2026-11-14' }).days, 366);
});

test('comparison: the same length right before, the same dates a month ago, or none', () => {
  const r = resolveRange('7', NOW);
  assert.deepEqual(comparisonRange(r, 'previous'), { from: '2026-11-01', to: '2026-11-07', days: 7 });
  assert.deepEqual(comparisonRange(r, 'lastMonth'), { from: '2026-10-08', to: '2026-10-14', days: 7 });
  assert.equal(comparisonRange(r, 'none'), null);
});

test('inRange counts a timestamp by its Cairo day, both ends included', () => {
  const r = { from: '2026-11-14', to: '2026-11-14' };
  assert.equal(inRange(Date.parse('2026-11-13T22:30:00Z'), r), true);
  assert.equal(inRange(Date.parse('2026-11-14T22:30:00Z'), r), false);
});
