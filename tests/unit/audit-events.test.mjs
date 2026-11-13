import test from 'node:test';
import assert from 'node:assert/strict';
import { contactUseEvent, assignmentEvent, shouldLogContact, describeAudit, auditLabel } from '../../src/utils/auditEvents.js';

test('a phone tap records the client id and channel, never the number', () => {
  const e = contactUseEvent({ id: 'lead-1', name: 'عميل', phone: '01000000000' }, 'whatsapp');
  assert.deepEqual(e, { actionType: 'CONTACT_USED', targetCollection: 'leads', targetId: 'lead-1', details: { channel: 'whatsapp' } });
  assert.ok(!JSON.stringify(e).includes('0100'));
  assert.equal(contactUseEvent({ id: 'x' }, 'sms'), null);
  assert.equal(contactUseEvent(null, 'call'), null);
});

test('a reassignment records who held the client and who has it now', () => {
  const before = { id: 'lead-1', assignedTo: 'Sales Team A', ownerName: 'أحمد' };
  assert.deepEqual(assignmentEvent(before, { ownerName: 'منى', ownerUid: 'u2' }), { actionType: 'LEAD_REASSIGNED', targetCollection: 'leads', targetId: 'lead-1', details: { from: 'أحمد', to: 'منى' } });
  assert.deepEqual(assignmentEvent({ id: 'l2', assignedTo: 'Unassigned' }, { assignedTo: 'Sales Team B' }).details, { from: 'Unassigned', to: 'Sales Team B' });
  assert.equal(assignmentEvent(before, { notes: 'x' }), null);
  assert.equal(assignmentEvent(before, { ownerName: 'أحمد' }), null);
});

test('repeat taps within a minute log once per client and channel', () => {
  assert.equal(shouldLogContact('a', 'call', 1000), true);
  assert.equal(shouldLogContact('a', 'call', 30000), false);
  assert.equal(shouldLogContact('a', 'whatsapp', 30000), true);
  assert.equal(shouldLogContact('a', 'call', 62000), true);
});

test('labels and one-line descriptions', () => {
  assert.equal(auditLabel('LEADS_EXPORTED_CSV'), 'صدّر العملاء (CSV)');
  assert.equal(auditLabel('SOMETHING_NEW', true), 'something new');
  assert.equal(describeAudit({ action: 'CONTACT_USED', targetId: 'lead-1', details: { channel: 'call' } }), 'اتصال — lead-1');
  assert.equal(describeAudit({ action: 'LEAD_REASSIGNED', targetId: 'lead-1', details: { from: 'أ', to: 'ب' } }), 'أ ← ب (lead-1)');
});
