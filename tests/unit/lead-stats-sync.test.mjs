import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newestChangeMs, mergeLeadChanges, nextStatsRead, FULL_RELOAD_MS, SCOPED_RELOAD_MS } from '../../src/utils/leadStatsSync.js';

const ts = (ms) => ({ toMillis: () => ms });

test('newest change uses created and updated times, any stored format', () => {
  assert.equal(newestChangeMs([]), 0);
  assert.equal(newestChangeMs([
    { createdAt: ts(1000), updatedAt: ts(5000) },
    { createdAt: { seconds: 7, nanoseconds: 0 } },
    { createdAt: '1970-01-01T00:00:03Z' },
  ]), 7000);
});

test('changed leads replace their old copy and new ones are added', () => {
  const merged = mergeLeadChanges(
    [{ id: 1, status: 'new' }, { id: 2, status: 'new' }],
    [{ id: '2', status: 'closed' }, { id: 3, status: 'new' }]
  );
  assert.equal(merged.length, 3);
  assert.equal(merged.find((l) => String(l.id) === '2').status, 'closed');
});

test('read plan: full first, then changes, full again hourly; scoped accounts reload in full less often', () => {
  const now = 10 * FULL_RELOAD_MS;
  assert.equal(nextStatsRead({ hasData: false, scoped: false, fullAt: 0, now }), 'full');
  assert.equal(nextStatsRead({ hasData: true, scoped: false, fullAt: now - 1000, now }), 'changes');
  assert.equal(nextStatsRead({ hasData: true, scoped: false, fullAt: now - FULL_RELOAD_MS, now }), 'full');
  assert.equal(nextStatsRead({ hasData: true, scoped: true, fullAt: now - 1000, now }), 'wait');
  assert.equal(nextStatsRead({ hasData: true, scoped: true, fullAt: now - SCOPED_RELOAD_MS, now }), 'full');
});
