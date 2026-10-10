import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scopeLeadsForAccess } from '../../src/utils/rbacRules.js';

const leads = [
  { id: 'a', assignedTo: 'Sales Team A', phone: '01012345678', whatsapp: '01012345678', email: 'a@x.co' },
  { id: 'b', assignedTo: 'Sales Team B', phone: '01198765432' },
  { id: 'p', assignedTo: 'Unassigned', phone: '01222222222' },
  { id: 'n', phone: '01533333333' } // no desk yet counts as the pool
];
const ids = (r) => r.map((l) => l.id);

test('desk agent: own team plus the pool, real numbers with ld.phone', () => {
  const r = scopeLeadsForAccess(leads, { role: 'sales_agent', perms: ['ld.edit', 'ld.phone', 'deal.edit'], desk: 'Sales Team A' });
  assert.deepEqual(ids(r), ['a', 'p', 'n']);
  assert.equal(r[0].phone, '01012345678');
});

test('agent with no team sees only the pool', () => {
  assert.deepEqual(ids(scopeLeadsForAccess(leads, { role: 'sales_agent', perms: ['ld.edit', 'ld.phone'], desk: '' })), ['p', 'n']);
});

test('viewer / finance: every lead, numbers masked, email hidden', () => {
  const r = scopeLeadsForAccess(leads, { role: 'finance', perms: ['ld.all', 'deal.all', 'fin', 'export'] });
  assert.deepEqual(ids(r), ['a', 'b', 'p', 'n']);
  assert.equal(r[0].phone, '010****78');
  assert.equal(r[0].whatsapp, '010****78');
  assert.equal(r[0].email, '•••');
  assert.equal(leads[0].phone, '01012345678'); // the source list is not touched
});

test('super admin and managers see everything as is', () => {
  assert.deepEqual(scopeLeadsForAccess(leads, { role: 'super_admin', perms: [] }), leads);
  assert.equal(scopeLeadsForAccess(leads, { role: 'sales_manager', perms: ['ld.all', 'ld.manage', 'ld.phone'] })[1].phone, '01198765432');
});

test('a custom role is judged by its permissions, not its name', () => {
  const r = scopeLeadsForAccess(leads, { role: 'x_custom', perms: ['ld.all'] });
  assert.equal(r.length, 4);
  assert.equal(r[1].phone, '011****32');
});
