import test from 'node:test';
import assert from 'node:assert/strict';
import { otherRequests, clientFileSummary, requestKind } from '../../src/utils/clientFile.js';

const lead = (id, o = {}) => ({ id, name: 'محمود', phone: '01005859328', status: 'new', createdAt: `2026-11-0${id.slice(-1)}T10:00:00Z`, ...o });

test('gathers requests under the same phone, newest first, without the lead itself', () => {
  const a = lead('l1', { source: 'إعلانات', type: 'buyer' });
  const b = lead('l2', { source: 'client_account', type: 'account' });
  const c = lead('l3', { phone: '01111111111' });
  const out = otherRequests(a, [a, b, c]);
  assert.deepEqual(out.map((x) => x.id), ['l2']);
  assert.equal(out[0].kind, 'تسجيل حساب');
  assert.equal(out[0].isAccount, true);
});

test('matches across number formats and the whatsapp field', () => {
  const a = lead('l1');
  const b = lead('l2', { phone: '', whatsapp: '+201005859328' });
  assert.equal(otherRequests(a, [a, b]).length, 1);
});

test('no phone → no file; archived requests are listed but marked', () => {
  const a = lead('l1', { phone: '', whatsapp: '' });
  assert.deepEqual(otherRequests(a, [a, lead('l2', { phone: '' })]), []);
  const b = lead('l1');
  const o = otherRequests(b, [b, lead('l2', { isArchived: true })]);
  assert.equal(o[0].archived, true);
  assert.equal(o[0].open, false);
});

test('summary counts requests, open ones and the account', () => {
  const a = lead('l1', { type: 'buyer' });
  const s = clientFileSummary(a, [a, lead('l2', { type: 'account' }), lead('l3', { type: 'seller', status: 'lost' })]);
  assert.equal(s.total, 3);
  assert.equal(s.open, 2);
  assert.equal(s.hasAccount, true);
  assert.ok(s.kinds.includes('طلب بيع'));
  assert.equal(clientFileSummary(a, [a]).total, 1);
});

test('request kinds', () => {
  assert.equal(requestKind({ type: 'broker' }), 'وسيط');
  assert.equal(requestKind({ type: 'weird' }), 'طلب');
  assert.equal(requestKind({ type: 'buyer' }, false), 'Buy request');
});

test('an unassigned request shows no owner', () => {
  const a = lead('l1');
  assert.equal(otherRequests(a, [a, lead('l2', { assignedTo: 'Unassigned' })])[0].owner, '');
  assert.equal(otherRequests(a, [a, lead('l2', { ownerName: 'كمال' })])[0].owner, 'كمال');
});
