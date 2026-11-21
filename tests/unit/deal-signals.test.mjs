import test from 'node:test';
import assert from 'node:assert/strict';
import { attentionOf, decisionList, attentionSummary, sortByAttention } from '../../src/utils/dealSignals.js';

const DAY = 24 * 60 * 60 * 1000;
const now = new Date('2026-06-15T12:00:00').getTime();
const ago = (d) => now - d * DAY;

test('a new request nobody called in a day is the most urgent', () => {
  const s = attentionOf({ status: 'new', createdAt: ago(2) }, { now });
  assert.equal(s.id, 'new_overdue');
  assert.equal(s.tone, 'danger');
  assert.ok(s.next.length > 0);
});

test('a follow-up from a previous day is overdue; today is not', () => {
  const base = { status: 'contacted', statusUpdatedAt: ago(1), lastActivityAt: ago(1) };
  assert.equal(attentionOf({ ...base, nextFollowUpAt: ago(2) }, { now }).id, 'follow_overdue');
  assert.equal(attentionOf({ ...base, nextFollowUpAt: now - 3600 * 1000 }, { now }), null);
});

test('a big deal untouched for 3 days is urgent, a small one is not yet', () => {
  const lead = { status: 'negotiating', statusUpdatedAt: ago(4), lastActivityAt: ago(4) };
  assert.equal(attentionOf(lead, { now, value: 6_000_000 }).id, 'big_idle');
  assert.equal(attentionOf(lead, { now, value: 800_000 }), null);
});

test('stalled and idle deals are warnings; won, lost, inactive never need a decision', () => {
  assert.equal(attentionOf({ status: 'negotiating', statusUpdatedAt: ago(11), lastActivityAt: ago(1) }, { now }).id, 'stalled');
  assert.equal(attentionOf({ status: 'contacted', statusUpdatedAt: ago(2), lastActivityAt: ago(6) }, { now }).id, 'idle');
  for (const status of ['closed', 'lost', 'inactive']) assert.equal(attentionOf({ status, createdAt: ago(90) }, { now }), null);
});

test('decision list: urgent reasons first, then money; limited', () => {
  const leads = [
    { id: 'a', status: 'contacted', statusUpdatedAt: ago(2), lastActivityAt: ago(6) },
    { id: 'b', status: 'new', createdAt: ago(3) },
    { id: 'c', status: 'new', createdAt: ago(3) }
  ];
  const worth = (l) => (l.id === 'c' ? 4_000_000 : 1_000_000);
  const list = decisionList(leads, { now, worth, limit: 2 });
  assert.deepEqual(list.map((x) => x.lead.id), ['c', 'b']);
});

test('summary counts per column and sums the money at risk', () => {
  const leads = [
    { id: 'a', status: 'new', createdAt: ago(3) },
    { id: 'b', status: 'new', createdAt: ago(1.5) },
    { id: 'c', status: 'new', createdAt: ago(0.1) }
  ];
  const sum = attentionSummary(leads, { now, worth: () => 1_000_000 });
  assert.equal(sum.count, 2);
  assert.equal(sum.byStage.new.value, 2_000_000);
  assert.equal(sum.danger, 2);
});

test('sorting keeps the original order among deals with the same urgency', () => {
  const leads = [
    { id: 'ok1', status: 'new', createdAt: ago(0.1) },
    { id: 'hot', status: 'new', createdAt: ago(3) },
    { id: 'ok2', status: 'new', createdAt: ago(0.2) }
  ];
  assert.deepEqual(sortByAttention(leads, { now }).map((l) => l.id), ['hot', 'ok1', 'ok2']);
});

import { NEXT_STEP_ACCOUNT } from '../../src/utils/dealSignals.js';
test('an account-only client is asked what they want, a typed one gets the normal step', () => {
  const lead = { status: 'new', createdAt: ago(2), type: 'account', source: 'تسجيل حساب بالموقع' };
  assert.equal(attentionOf(lead, { now }).next, NEXT_STEP_ACCOUNT);
  assert.notEqual(attentionOf({ ...lead, type: 'buyer' }, { now }).next, NEXT_STEP_ACCOUNT);
});

test('an owner selling a property gets owner steps, not buyer steps', async () => {
  const { nextStepFor, NEXT_STEP } = await import('../../src/utils/dealSignals.js');
  const owner = { id: 'o', type: 'seller', status: 'contacted' };
  const buyer = { id: 'b', type: 'buyer', status: 'contacted' };
  assert.match(nextStepFor(owner), /معاينة وتقييم/);
  assert.equal(nextStepFor(buyer), NEXT_STEP.contacted);
  assert.match(nextStepFor({ ...owner, status: 'negotiating' }), /المشترين/);
  assert.equal(nextStepFor({ id: 'a', type: 'account', source: 'تسجيل حساب بالموقع', status: 'new' }).includes('بيدوّر'), true);
});
