import test from 'node:test';
import assert from 'node:assert/strict';
import { silentLeads, silenceLabel, silenceBucket, lastTouchMs } from '../../src/utils/silentLeads.js';

const NOW = Date.parse('2026-11-14T10:00:00Z');
const DAY = 86_400_000;
const ago = (d) => new Date(NOW - d * DAY).toISOString();
const lead = (o) => ({ id: Math.random().toString(36).slice(2), status: 'contacted', ownerUid: 'a', createdAt: ago(40), ...o });

test('the last touch is the latest of activity, contact, update, else the arrival', () => {
  assert.equal(lastTouchMs(lead({ lastActivityAt: ago(5), updatedAt: ago(9), lastContactedAt: ago(20) })), Date.parse(ago(5)));
  assert.equal(lastTouchMs(lead({})), Date.parse(ago(40)));
});

test('open clients silent for a week or more, longest first; closed, archived, recent and covered ones are left out', () => {
  const quiet = lead({ id: 'q', lastActivityAt: ago(10) });
  const quieter = lead({ id: 'qq', lastActivityAt: ago(31) });
  const list = [
    quiet, quieter,
    lead({ id: 'recent', lastActivityAt: ago(2) }),
    lead({ id: 'won', status: 'closed', lastActivityAt: ago(50) }),
    lead({ id: 'gone', isArchived: true, lastActivityAt: ago(50) }),
    lead({ id: 'planned', lastActivityAt: ago(20) }),
    lead({ id: 'other', ownerUid: 'b', lastActivityAt: ago(20) })
  ];
  const tasks = [{ status: 'open', leadId: 'planned' }, { status: 'done', leadId: 'q' }];
  assert.deepEqual(silentLeads(list, { uid: 'a', tasks, now: NOW }).map((r) => [r.lead.id, r.days]), [['qq', 31], ['q', 10]]);
  assert.deepEqual(silentLeads(list, { tasks, now: NOW }).map((r) => r.lead.id), ['qq', 'other', 'q']); // everyone's
  assert.equal(silentLeads(list, { uid: 'a', days: 30, tasks, now: NOW }).length, 1);
});

test('labels and buckets', () => {
  assert.equal(silenceLabel(8), '8 أيام');
  assert.equal(silenceLabel(12), '12 يوم');
  assert.equal(silenceLabel(15), '2 أسابيع');
  assert.equal(silenceLabel(31), 'شهر');
  assert.equal(silenceLabel(65), 'شهرين');
  assert.equal(silenceLabel(100), '3 شهور');
  assert.deepEqual([silenceBucket(8), silenceBucket(14), silenceBucket(45)], ['week', 'fortnight', 'month']);
});
