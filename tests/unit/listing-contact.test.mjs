import { test } from 'node:test';
import assert from 'node:assert/strict';
import { linkedContactLead, leadWithPhone, listingContactProblem, listingContactLead, listedByLabel } from '../../src/utils/listingContact.js';

const prop = { id: 'prop-1', unitCode: 'A12', title_ar: 'شقة 150م', type: 'apartment', areaKey: 'west', price: 1500000 };

test('a new unit needs who offers it and a valid phone', () => {
  assert.match(listingContactProblem({}, { required: true }), /مين اللي عارض/);
  assert.match(listingContactProblem({ listedBy: 'owner' }, { required: true }), /رقم صاحب الوحدة/);
  assert.match(listingContactProblem({ listedBy: 'owner', phone: '123' }, { required: true }), /مش صحيح/);
  assert.equal(listingContactProblem({ listedBy: 'broker', phone: '01012345678', name: 'محمد علي' }, { required: true }), '');
  // An edit may leave it empty, but a typed phone must still be valid
  assert.equal(listingContactProblem({}, { required: false }), '');
  assert.match(listingContactProblem({ phone: 'abc1' }), /مش صحيح/);
});

test('the contact becomes a client linked to the unit, phone kept off the listing', () => {
  const lead = listingContactLead(prop, { name: 'أحمد محمود', phone: '+20 101 234 5678', listedBy: 'owner', now: new Date('2026-11-02T10:00:00Z') });
  assert.equal(lead.name, 'أحمد محمود');
  assert.equal(lead.phone, '01012345678');
  assert.equal(lead.type, 'seller');
  assert.deepEqual(lead.details.listingIds, ['prop-1']);
  assert.equal(lead.details.listedBy, 'owner');
  assert.match(lead.notes, /المالك نفسه للوحدة كود A12/);
  const broker = listingContactLead(prop, { phone: '01112345678', listedBy: 'broker' });
  assert.equal(broker.type, 'broker');
  assert.match(broker.name, /وسيط/);
});

test('finds the linked client and a client with the same phone', () => {
  const leads = [{ id: 'L1', phone: '01012345678' }, { id: 'L2', details: { listingIds: ['prop-9'] } }];
  assert.equal(linkedContactLead({ sourceLeadId: 'L1' }, leads).id, 'L1');
  assert.equal(linkedContactLead({ id: 'prop-9' }, leads).id, 'L2');
  assert.equal(linkedContactLead({ id: 'prop-x' }, leads), null);
  assert.equal(leadWithPhone('+201012345678', leads).id, 'L1');
  assert.equal(leadWithPhone('', leads), null);
  assert.equal(listedByLabel('agent'), 'مفوّض أو قريب المالك');
});
