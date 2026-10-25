import test from 'node:test';
import assert from 'node:assert/strict';
import { upcomingDays, isoDay } from '../../src/utils/dayChoices.js';

test('days start today, in local calendar order, across a month end', () => {
  const days = upcomingDays(5, new Date(2026, 9, 30, 23, 30));
  assert.deepEqual(days.map((d) => d.iso), ['2026-10-30', '2026-10-31', '2026-11-01', '2026-11-02', '2026-11-03']);
  assert.equal(days[0].top, 'النهارده');
  assert.equal(days[1].top, 'بكرة');
  assert.equal(days[2].top, 'الأحد');
  assert.match(days[2].bottom, /1/);
});

test('English labels and the ISO value', () => {
  const [today, tomorrow] = upcomingDays(2, new Date(2026, 0, 5), false);
  assert.equal(today.top, 'Today');
  assert.equal(tomorrow.top, 'Tomorrow');
  assert.equal(isoDay(new Date(2026, 0, 5)), '2026-01-05');
});
