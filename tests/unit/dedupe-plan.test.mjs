import { test } from 'node:test';
import assert from 'node:assert/strict';
import { planDuplicateMerges, pickKeeper, requestLine } from '../../src/utils/dedupePlan.js';

const L = (id, o = {}) => ({ id, name: 'محب عادل', phone: '01228919435', status: 'new', createdAt: `2026-11-1${id.slice(-1)}T10:00:00Z`, type: 'buyer', ...o });

test('two open requests with the same phone become one plan; the owned one stays', () => {
  const plans = planDuplicateMerges([L('a1'), L('a2', { ownerUid: 'u', ownerName: 'محمود' })]);
  assert.equal(plans.length, 1);
  assert.equal(plans[0].keep.id, 'a2');
  assert.deepEqual(plans[0].others.map((o) => o.id), ['a1']);
  assert.equal(plans[0].archive.isArchived, true);
  assert.equal(plans[0].archive.mergedInto, 'a2');
  assert.equal(plans[0].merged.requestCount, 2);
  assert.ok(plans[0].merged.activityLogs.some((l) => l.requestId === 'a1' && /طلب سابق/.test(l.action)));
});

test('without owners the oldest stays, and the furthest stage wins over age', () => {
  assert.equal(pickKeeper([L('a3'), L('a1')]).id, 'a1');
  assert.equal(pickKeeper([L('a1'), L('a2', { status: 'negotiating' })]).id, 'a2');
});

test('closed, lost, archived and already-merged requests are left alone', () => {
  assert.equal(planDuplicateMerges([L('a1'), L('a2', { status: 'closed' })]).length, 0);
  assert.equal(planDuplicateMerges([L('a1'), L('a2', { status: 'lost' })]).length, 0);
  assert.equal(planDuplicateMerges([L('a1'), L('a2', { isArchived: true })]).length, 0);
  assert.equal(planDuplicateMerges([L('a1'), L('a2', { mergedInto: 'a1' })]).length, 0);
});

test('different phones are different clients; three forms make one plan', () => {
  assert.equal(planDuplicateMerges([L('a1'), L('a2', { phone: '01000000001' })]).length, 0);
  const p = planDuplicateMerges([L('a1'), L('a2'), L('a3')]);
  assert.equal(p.length, 1);
  assert.equal(p[0].others.length, 2);
  assert.equal(p[0].merged.requestCount, 3);
});

test('a phone typed two ways is still the same person', () => {
  assert.equal(planDuplicateMerges([L('a1'), L('a2', { phone: '+201228919435' })]).length, 1);
});

test('the history line says when and what', () => {
  assert.match(requestLine(L('a1')), /2026-11-11/);
  assert.match(requestLine(L('a1')), /شراء/);
});
