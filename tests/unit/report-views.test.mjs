import test from 'node:test';
import assert from 'node:assert/strict';
import { loadViews, saveView, removeView, MAX_VIEWS } from '../../src/utils/reportViews.js';
import { teamComparison } from '../../src/utils/performanceReport.js';

const mem = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)) }; };

test('saved views: add, replace by name, cap, remove, survive bad storage', () => {
  const s = mem();
  saveView({ name: 'الشهر', tab: 'summary', preset: '30', mode: 'previous' }, s, 1);
  saveView({ name: 'الشهر', tab: 'team', preset: '7', mode: 'year' }, s, 2);
  let list = loadViews(s);
  assert.equal(list.length, 1);
  assert.equal(list[0].tab, 'team');
  for (let i = 0; i < 12; i += 1) saveView({ name: `v${i}`, tab: 'summary' }, s, 10 + i);
  assert.equal(loadViews(s).length, MAX_VIEWS);
  list = removeView(loadViews(s)[0].id, s);
  assert.equal(list.length, MAX_VIEWS - 1);
  assert.deepEqual(saveView({ name: '  ', tab: 'x' }, s).length, MAX_VIEWS - 1);
  const bad = { getItem: () => '{oops', setItem: () => { throw new Error('full'); } };
  assert.deepEqual(loadViews(bad), []);
  assert.doesNotThrow(() => saveView({ name: 'a', tab: 'summary' }, bad));
});

test('team comparison flags who needs help against the team average', () => {
  const sellers = [
    { key: 'a', name: 'أ', leads: 10, replied: 10, inTimePct: 90, medianReplyMs: 600000, closed: 3, tasksOverdue: 0, tasksOpen: 1, tasksDone: 4 },
    { key: 'b', name: 'ب', leads: 10, replied: 10, inTimePct: 40, medianReplyMs: 7200000, closed: 0, tasksOverdue: 4, tasksOpen: 6, tasksDone: 1 }
  ];
  const { avg, rows } = teamComparison(sellers);
  assert.equal(avg.inTimePct, 65);
  assert.equal(avg.closePct, 15);
  assert.deepEqual(rows[0].flags, []);
  assert.deepEqual(rows[1].flags, ['slow_reply', 'no_close', 'late_tasks']);
});
