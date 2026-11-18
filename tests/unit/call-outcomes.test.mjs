import test from 'node:test';
import assert from 'node:assert/strict';
import { callEntry, outcomePatch, callStats, callsIn, cairoHour, slotLabel, KEEP } from '../../src/utils/callOutcomes.js';
import { markCallStarted, readPendingCall, clearPendingCall } from '../../src/utils/pendingCall.js';

const mem = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };

test('an entry needs a known outcome; the patch keeps the last 20, counts as activity and logs it', () => {
  assert.equal(callEntry('nope', { uid: 'a' }), null);
  const e = callEntry('answered', { uid: 'a', name: 'Ali' }, Date.parse('2026-11-14T10:00:00Z'));
  assert.deepEqual([e.o, e.by, e.n], ['answered', 'a', 'Ali']);
  const lead = { callOutcomes: Array.from({ length: KEEP }, (_, i) => ({ o: 'no_answer', at: `2026-11-0${(i % 9) + 1}T10:00:00Z` })), activityLogs: [{ action: 'x' }] };
  const p = outcomePatch(lead, e);
  assert.equal(p.callOutcomes.length, KEEP);
  assert.equal(p.callOutcomes.at(-1), e);
  assert.equal(p.lastCallOutcome, 'answered');
  assert.equal(p.lastActivityAt, e.at);
  assert.equal(p.activityLogs[0].action, 'مكالمة: ردّ وكلّمته');
  assert.equal(outcomePatch(lead, null), null);
});

test('Cairo hours, not UTC', () => {
  assert.equal(cairoHour(Date.parse('2026-11-14T10:00:00Z')), 12);
  assert.equal(slotLabel(8, 10), 'من 8 ص إلى 10 ص');
  assert.equal(slotLabel(16, 18), 'من 4 م إلى 6 م');
  assert.equal(slotLabel(10, 14), 'من 10 ص إلى 2 م');
  assert.equal(slotLabel(0, 2), 'من 12 ص إلى 2 ص');
  assert.equal(slotLabel(22, 24), 'من 10 م إلى 12 ص');
});

const at = (day, hourUtc) => `2026-11-${day}T${String(hourUtc).padStart(2, '0')}:00:00Z`;
test('stats: the answer rate (wrong numbers apart), the 2-hour slots, the best ones need enough calls, and each seller', () => {
  const calls = [
    ...Array.from({ length: 6 }, (_, i) => ({ o: i < 4 ? 'answered' : 'no_answer', at: at('10', 8), by: 'a', n: 'Ali' })), // 10–12 Cairo: 4 of 6
    ...Array.from({ length: 5 }, (_, i) => ({ o: i < 1 ? 'answered' : 'no_answer', at: at('11', 15), by: 'b', n: 'Mona' })), // 5–7 pm Cairo: 1 of 5
    { o: 'wrong', at: at('11', 8), by: 'b', n: 'Mona' },
    { o: 'answered', at: at('11', 9), by: 'a', n: 'Ali' } // 11 a.m., in the 10–12 slot too
  ];
  const s = callStats([{ id: 'l', callOutcomes: calls }], { from: '2026-11-01', to: '2026-11-30' });
  assert.deepEqual([s.total, s.wrong, s.answered, s.rate], [13, 1, 6, 50]);
  assert.equal(s.enough, false);
  assert.deepEqual(s.best.map((x) => [x.from, x.rate]), [[10, 71], [16, 20]]); // 10–12: 5 of 7 real calls; 4–6 pm: 1 of 5
  assert.equal(s.sellers[0].name, 'Ali');
  assert.ok(s.days.length >= 1);
});

test('calls outside the range or on archived leads are not counted', () => {
  const lead = { id: 'l', callOutcomes: [{ o: 'answered', at: at('10', 8) }, { o: 'answered', at: '2026-10-01T08:00:00Z' }] };
  assert.equal(callsIn([lead], { from: '2026-11-01', to: '2026-11-30' }).length, 1);
  assert.equal(callsIn([{ ...lead, isArchived: true }], null).length, 0);
  assert.equal(callStats([], null).total, 0);
});

test('the pending call is remembered for 45 minutes and holds no phone', () => {
  const st = mem();
  markCallStarted({ id: 'l1', name: 'سعيد', phone: '0101' }, 1000, st);
  assert.deepEqual(readPendingCall(1000 + 60_000, st), { id: 'l1', name: 'سعيد', at: 1000 });
  assert.equal(readPendingCall(1000 + 46 * 60_000, st), null);
  assert.ok(!st.getItem('oneline_pending_call').includes('0101'));
  clearPendingCall(st);
  assert.equal(readPendingCall(2000, st), null);
  markCallStarted({}, 1, st); // no id: nothing saved
  assert.equal(readPendingCall(2, st), null);
});
