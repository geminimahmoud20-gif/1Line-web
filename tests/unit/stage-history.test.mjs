import test from 'node:test';
import assert from 'node:assert/strict';
import { stageHistoryAfter, initialStageHistory, reachedAny, msToReach, avgDays, MAX_STAGE_HISTORY } from '../../src/utils/stageHistory.js';

const T0 = '2026-11-10T10:00:00.000Z';
const T1 = '2026-11-12T10:00:00.000Z';

test('a new lead starts with its first stage', () => {
  assert.deepEqual(initialStageHistory(T0), [{ s: 'new', at: T0 }]);
});

test('moving to another stage appends it; the same stage writes nothing', () => {
  const lead = { status: 'new', createdAt: T0, stageHistory: initialStageHistory(T0) };
  assert.deepEqual(stageHistoryAfter(lead, 'contacted', T1), [{ s: 'new', at: T0 }, { s: 'contacted', at: T1 }]);
  assert.equal(stageHistoryAfter(lead, 'new', T1), null);
  assert.equal(stageHistoryAfter(lead, undefined, T1), null);
});

test('a lead saved before the history existed is seeded from its creation time', () => {
  const old = { status: 'contacted', createdAt: T0 };
  assert.deepEqual(stageHistoryAfter(old, 'site_visit', T1), [{ s: 'contacted', at: T0 }, { s: 'site_visit', at: T1 }]);
});

test('the history is capped', () => {
  let lead = { status: 'new', createdAt: T0, stageHistory: initialStageHistory(T0) };
  for (let i = 0; i < 60; i++) {
    const next = i % 2 ? 'new' : 'contacted';
    lead = { ...lead, status: next, stageHistory: stageHistoryAfter(lead, next, T1) };
  }
  assert.equal(lead.stageHistory.length, MAX_STAGE_HISTORY);
});

test('reachedAny sees stages the lead has since left', () => {
  const lost = { status: 'lost', stageHistory: [{ s: 'new', at: T0 }, { s: 'site_visit', at: T1 }, { s: 'lost', at: T1 }] };
  assert.equal(reachedAny(lost, ['site_visit', 'closed']), true);
  assert.equal(reachedAny({ status: 'lost', stageHistory: [{ s: 'new', at: T0 }, { s: 'lost', at: T1 }] }, ['site_visit']), false);
  assert.equal(reachedAny({ status: 'closed' }, ['closed']), true);
  assert.equal(reachedAny({}, ['new']), true);
});

test('time to a stage, and the average in days', () => {
  const l = { createdAt: T0, status: 'site_visit', stageHistory: [{ s: 'new', at: T0 }, { s: 'site_visit', at: T1 }] };
  assert.equal(msToReach(l, ['site_visit']), 2 * 86400000);
  assert.equal(msToReach({ createdAt: T0, status: 'site_visit' }, ['site_visit']), 0);
  assert.equal(avgDays([2 * 86400000, 4 * 86400000, 0]), 3);
  assert.equal(avgDays([]), 0);
});
