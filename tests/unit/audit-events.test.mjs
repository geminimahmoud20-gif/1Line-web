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

test('an automatic assignment has its own label and a readable line', () => {
  assert.equal(auditLabel('LEAD_AUTO_ASSIGNED'), 'توزيع تلقائي لعميل جديد');
  assert.equal(describeAudit({ action: 'LEAD_AUTO_ASSIGNED', targetId: 'lead-9', details: { to: 'منى', team: 'Sales Team A' } }), 'منى (Sales Team A) — lead-9');
});

test('a deleted client is logged by id only; a role change lists what was gained and lost', async () => {
  const { leadDeletedEvent, roleChangeEvent, roleDeletedEvent, dataExportEvent, describeAudit, auditLabel } = await import('../../src/utils/auditEvents.js');
  assert.deepEqual(leadDeletedEvent('l1'), { actionType: 'LEAD_DELETED', targetCollection: 'leads', targetId: 'l1', details: {} });
  assert.equal(leadDeletedEvent(''), null);
  const before = { id: 'sales', perms: ['ld.edit', 'ld.phone'] };
  const ev = roleChangeEvent(before, { id: 'sales', perms: ['ld.edit', 'export'] });
  assert.deepEqual(ev.details, { created: false, added: ['export'], removed: ['ld.phone'] });
  assert.equal(roleChangeEvent(before, { id: 'sales', perms: ['ld.phone', 'ld.edit'] }), null); // saved with no change
  assert.equal(roleChangeEvent(null, { id: 'new', perms: ['ld.edit'] }).details.created, true);
  assert.equal(roleDeletedEvent('old', 'sales').details.fallback, 'sales');
  const exp = dataExportEvent('1Line_Properties', 'excel', 12);
  assert.deepEqual(exp.details, { format: 'excel', count: 12 });
  assert.equal(dataExportEvent('', 'csv', 1), null);
  assert.match(describeAudit({ action: 'ROLE_SAVED', targetId: 'sales', details: ev.details }), /\+export.*−ld\.phone/);
  assert.match(describeAudit({ action: 'DATA_EXPORTED', targetCollection: '1Line_Properties', details: exp.details }), /1Line_Properties · excel · 12/);
  assert.equal(auditLabel('LEAD_DELETED'), 'حذف عميل');
});
