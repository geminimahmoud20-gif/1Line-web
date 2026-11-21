import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sweepCandidates, runSweep, MAX_PER_RUN } from '../../api/_dedupe-core.js';

const DAY = 86400000;
const now = Date.parse('2026-11-20T12:00:00Z');
const at = (d) => new Date(now - d * DAY).toISOString();
const row = (id, data) => ({ id, data, doc: { updateTime: 't' } });

test('only recent, untouched, still-new requests are candidates, oldest first', () => {
  const rows = [
    row('new1', { status: 'new', createdAt: at(1) }),
    row('old', { status: 'new', createdAt: at(10) }),                          // outside the window
    row('called', { status: 'new', createdAt: at(1), firstContactedAt: at(0.5) }), // someone already called
    row('moved', { status: 'contacted', createdAt: at(1) }),
    row('archived', { status: 'new', createdAt: at(1), isArchived: true }),
    row('merged', { status: 'new', createdAt: at(1), mergedInto: 'x' }),
    row('new0', { status: 'new', createdAt: at(2) }),
    row('future', { status: 'new', createdAt: new Date(now + DAY).toISOString() })
  ];
  assert.deepEqual(sweepCandidates(rows, { now }).map((r) => r.id), ['new0', 'new1']);
  assert.deepEqual(sweepCandidates(rows, { now, days: 14 }).map((r) => r.id), ['old', 'new0', 'new1']);
  assert.equal(sweepCandidates(Array.from({ length: 200 }, (_, i) => row(`l${i}`, { createdAt: at(1) })), { now }).length, MAX_PER_RUN);
});

test('a run merges what it can, counts it, and one failure does not stop the rest', async () => {
  const seen = [];
  const out = await runSweep({
    list: async () => [row('a', { createdAt: at(2) }), row('b', { createdAt: at(1.5) }), row('c', { createdAt: at(1) })],
    withContact: async ({ id, data }) => ({ ...data, phone: `010-${id}` }),
    mergeOne: async ({ id, lead }) => {
      seen.push(lead.phone);
      if (id === 'b') throw new Error('write failed');
      return id === 'c' ? 'primary1' : null;
    }
  }, { now });
  assert.deepEqual(out, { checked: 3, merged: 1, into: ['primary1'] });
  assert.deepEqual(seen, ['010-a', '010-b', '010-c']);
});
