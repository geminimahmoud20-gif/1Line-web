import test from 'node:test';
import assert from 'node:assert/strict';
import { pushPlan } from '../../src/utils/mentionPush.js';

const now = Date.parse('2026-11-14T12:00:00Z');
const m = (o) => ({ id: o.id, toUid: 'u1', fromName: 'منى', entityType: 'lead', entityId: 'L1', entityName: 'عبدالعزيز', snippet: 'كلميه', createdAt: '2026-11-14T11:50:00Z', ...o });

test('one unread mention becomes one message that opens the client', () => {
  const [p] = pushPlan([m({ id: 'a' })], { now });
  assert.equal(p.toUid, 'u1');
  assert.deepEqual(p.ids, ['a']);
  assert.equal(p.title, 'منى ذكرك في عميل «عبدالعزيز»');
  assert.equal(p.body, 'كلميه');
  assert.equal(p.url, '/crm?tab=leads');
  assert.equal(p.leadId, 'L1');
});

test('several mentions for one person are one message; others get their own', () => {
  const plan = pushPlan([m({ id: 'a' }), m({ id: 'b', fromName: 'سارة', entityType: 'team', entityId: 'general', entityName: '', snippet: 'اجتماع بكرة', createdAt: '2026-11-14T11:55:00Z' }), m({ id: 'c', toUid: 'u2' })], { now });
  assert.equal(plan.length, 2);
  const one = plan.find((p) => p.toUid === 'u1');
  assert.deepEqual(one.ids.sort(), ['a', 'b']);
  assert.equal(one.title, '2 رسايل من الفريق ليك');
  assert.match(one.body, /سارة، منى: اجتماع بكرة/);
  assert.equal(one.url, '/crm?tab=chat'); // the latest one decides where it opens
  assert.equal(one.leadId, '');
});

test('read, already pushed and old mentions are skipped', () => {
  const plan = pushPlan([
    m({ id: 'read', readAt: '2026-11-14T11:51:00Z' }),
    m({ id: 'sent', pushedAt: '2026-11-14T11:52:00Z' }),
    m({ id: 'old', createdAt: '2026-11-13T10:00:00Z' }),
    m({ id: 'bad', createdAt: 'not a date' })
  ], { now });
  assert.deepEqual(plan, []);
});
