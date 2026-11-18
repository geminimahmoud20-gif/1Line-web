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

test('a role for one side of the business only sees that side: owners and brokers, or buyers', async () => {
  const { leadSideScope } = await import('../../src/utils/accessModel.js');
  const leads = [
    { id: 's1', type: 'seller', assignedTo: 'Unassigned' },
    { id: 's2', type: 'seller_instant', assignedTo: 'Unassigned' },
    { id: 's3', type: 'website', details: { sellerRole: 'owner' }, assignedTo: 'Unassigned' },
    { id: 'b1', type: 'buyer', assignedTo: 'Unassigned' },
    { id: 'b2', type: 'viewing', assignedTo: 'Unassigned' },
    { id: 'b3', assignedTo: 'Unassigned' }
  ];
  const ids = (perms, role = 'x') => scopeLeadsForAccess(leads, { role, perms }).map((l) => l.id).join(',');
  assert.equal(leadSideScope(['ld.all']), 'all');
  assert.equal(leadSideScope(['ld.only_sellers']), 'seller');
  assert.equal(leadSideScope(['ld.only_buyers']), 'buyer');
  assert.equal(leadSideScope(['ld.only_sellers', 'ld.only_buyers']), 'all'); // both ticked: no limit
  assert.equal(ids(['ld.all']), 's1,s2,s3,b1,b2,b3');
  assert.equal(ids(['ld.all', 'ld.only_sellers']), 's1,s2,s3');
  assert.equal(ids(['ld.all', 'ld.only_buyers']), 'b1,b2,b3');
  assert.equal(ids(['ld.edit', 'ld.only_buyers']), 'b1,b2,b3'); // a desk agent: the queue, then the side
  assert.equal(ids(['ld.only_sellers'], 'super_admin'), 's1,s2,s3,b1,b2,b3'); // the super admin sees both
});
