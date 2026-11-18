import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isOpenEarlier, pickPrimary, requestSummary, mergeFields, toFirestore } from '../../api/_merge-core.js';

const incoming = { createdAt: '2026-11-17T10:00:00Z', type: 'seller', source: 'بوابة بيع', area: 'new-sohag', notes: '[09:19 ص] تم تحديث\n| عايز أبيع شقة' };

test('only an earlier, still-open request takes the new one', () => {
  const open = { createdAt: '2026-11-10T10:00:00Z', status: 'contacted' };
  assert.equal(isOpenEarlier(open, incoming), true);
  assert.equal(isOpenEarlier({ ...open, status: 'closed' }, incoming), false);
  assert.equal(isOpenEarlier({ ...open, status: 'lost' }, incoming), false);
  assert.equal(isOpenEarlier({ ...open, isArchived: true }, incoming), false);
  assert.equal(isOpenEarlier({ ...open, mergedInto: 'x' }, incoming), false);
  // two forms sent together never swallow each other
  assert.equal(isOpenEarlier({ ...open, createdAt: '2026-11-17T10:00:00Z' }, incoming), false);
  assert.equal(isOpenEarlier({ ...open, createdAt: '2026-11-18T10:00:00Z' }, incoming), false);
});

test('the most recent open request is the one kept', () => {
  const list = [
    { id: 'a', data: { createdAt: '2026-11-01T10:00:00Z' } },
    { id: 'b', data: { createdAt: '2026-11-12T10:00:00Z' } },
    { id: 'c', data: { createdAt: '2026-11-14T10:00:00Z', status: 'lost' } }
  ];
  assert.equal(pickPrimary(list, incoming).id, 'b');
  assert.equal(pickPrimary([], incoming), null);
});

test('the timeline line says what was asked, in the client\'s own words', () => {
  const s = requestSummary(incoming);
  assert.match(s, /طلب جديد من نفس العميل/);
  assert.match(s, /بوابة بيع/);
  assert.match(s, /بيع/);
  assert.match(s, /عايز أبيع شقة/);
  assert.doesNotMatch(s, /تم تحديث/);
});

test('merge fields: log entry first, count, source id; the new record is archived with a pointer', () => {
  const primary = { id: 'old1', data: { activityLogs: [{ timestamp: 't0', action: 'x' }], requestCount: 2, mergedFrom: ['m1'] } };
  const f = mergeFields(primary, incoming, 'new1', '2026-11-17T10:01:00.000Z');
  assert.equal(f.primary.activityLogs.length, 2);
  assert.equal(f.primary.activityLogs[0].requestId, 'new1');
  assert.equal(f.primary.requestCount, 3);
  assert.deepEqual(f.primary.mergedFrom, ['m1', 'new1']);
  assert.deepEqual(f.incoming.mergedInto, 'old1');
  assert.equal(f.incoming.isArchived, true);
  const first = mergeFields({ id: 'o', data: {} }, incoming, 'n', 'now');
  assert.equal(first.primary.requestCount, 2);
});

test('the log is capped', () => {
  const logs = Array.from({ length: 150 }, (_, i) => ({ timestamp: String(i), action: 'a' }));
  assert.equal(mergeFields({ id: 'o', data: { activityLogs: logs } }, incoming, 'n').primary.activityLogs.length, 100);
});

test('values encode for the Firestore REST API', () => {
  assert.deepEqual(toFirestore(3), { integerValue: '3' });
  assert.deepEqual(toFirestore(true), { booleanValue: true });
  assert.deepEqual(toFirestore(['a']), { arrayValue: { values: [{ stringValue: 'a' }] } });
  assert.deepEqual(toFirestore({ k: 'v' }), { mapValue: { fields: { k: { stringValue: 'v' } } } });
});
