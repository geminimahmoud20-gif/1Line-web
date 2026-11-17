import test from 'node:test';
import assert from 'node:assert/strict';
import { eligible, sellersOf, chooseSeller, ownerFields, FRESH_MS } from '../../api/_assign-core.js';

const NOW = Date.parse('2026-11-13T12:00:00Z');
const ago = (ms) => new Date(NOW - ms).toISOString();
const seller = (uid, desk, extra = {}) => ({ uid, name: `بياع ${uid}`, role: 'sales_agent', desk, perms: ['ld.edit', 'ld.phone'], ...extra });

test('only a fresh, new, unowned client is assigned automatically', () => {
  assert.equal(eligible({ status: 'new', createdAt: ago(60000) }, NOW), true);
  assert.equal(eligible({ createdAt: ago(60000) }, NOW), true);
  assert.equal(eligible({ status: 'new', createdAt: ago(FRESH_MS + 1000) }, NOW), false);
  assert.equal(eligible({ status: 'contacted', createdAt: ago(60000) }, NOW), false);
  assert.equal(eligible({ status: 'new', createdAt: ago(60000), ownerUid: 'u1' }, NOW), false);
  assert.equal(eligible({ status: 'new', createdAt: ago(60000), claimedBy: 'منى' }, NOW), false);
  assert.equal(eligible({ status: 'new', createdAt: ago(60000), isArchived: true }, NOW), false);
  assert.equal(eligible({ status: 'new' }, NOW), false);
  assert.equal(eligible(null, NOW), false);
});

test('sellers are people who edit leads on a team, not managers, admins or disabled accounts', () => {
  const members = [
    seller('a', 'Team A'),
    seller('b', 'Team A', { disabled: true }),
    seller('c', 'Team A', { perms: ['ld.edit', 'ld.manage'] }),
    seller('d', 'Team A', { role: 'super_admin' }),
    seller('e', ''),
    seller('f', 'Team B', { perms: ['ld.all'] }),
    seller('g', 'Team B')
  ];
  assert.deepEqual(sellersOf(members).map((m) => m.uid), ['a', 'g']);
});

test('the person with the fewest open clients on the lead\'s team gets it', () => {
  const sellers = [seller('a', 'Team A'), seller('b', 'Team A'), seller('c', 'Team B')];
  assert.equal(chooseSeller({ assignedTo: 'Team A' }, sellers, { a: 5, b: 2, c: 0 }, []).uid, 'b');
  // ties are settled the same way every time
  assert.equal(chooseSeller({ assignedTo: 'Team A' }, sellers, {}, []).uid, 'a');
});

test('with nobody on the lead\'s team, anyone in a team that takes part in round-robin', () => {
  const sellers = [seller('c', 'Team B'), seller('d', 'Team VIP')];
  const teams = [{ id: 'Team B', roundRobin: true, active: true }, { id: 'Team VIP', roundRobin: false, active: true }];
  assert.equal(chooseSeller({ assignedTo: 'Team A' }, sellers, { c: 9, d: 0 }, teams).uid, 'c');
  assert.equal(chooseSeller({ assignedTo: 'Team A' }, [], {}, teams), null);
  assert.equal(chooseSeller({ assignedTo: 'Team A' }, [seller('d', 'Team VIP')], {}, teams), null);
});

test('the owner fields match what the CRM writes when someone is picked by name', () => {
  const f = ownerFields(seller('a', 'Team A'), { assignedTo: 'Unassigned' }, '2026-11-13T12:00:00.000Z');
  assert.deepEqual(f, { ownerUid: 'a', ownerName: 'بياع a', claimedBy: 'بياع a', assignedTo: 'Team A', claimedAt: '2026-11-13T12:00:00.000Z', assignedAt: '2026-11-13T12:00:00.000Z', autoAssigned: true });
});

import { needsReassign, chooseReplacement, reassignFields, REASSIGN_AFTER_MS } from '../../api/_assign-core.js';
test('an untouched auto-assigned client moves once, after 15 minutes, to someone else', () => {
  const now = Date.parse('2026-11-17T10:00:00Z');
  const base = { id: 'L', status: 'new', autoAssigned: true, ownerUid: 'a', ownerName: 'أمل', assignedAt: '2026-11-17T09:40:00Z', assignedTo: 'Sales Team A' };
  assert.equal(needsReassign(base, now), true);
  assert.equal(needsReassign({ ...base, assignedAt: '2026-11-17T09:50:00Z' }, now), false); // only 10 minutes
  assert.equal(needsReassign({ ...base, autoAssigned: false }, now), false); // a manager gave it
  assert.equal(needsReassign({ ...base, firstContactedAt: '2026-11-17T09:45:00Z' }, now), false);
  assert.equal(needsReassign({ ...base, outcomes: [{ id: 'no_answer' }] }, now), false);
  assert.equal(needsReassign({ ...base, status: 'contacted' }, now), false);
  assert.equal(needsReassign({ ...base, autoReassignCount: 1 }, now), false);
  assert.equal(needsReassign({ ...base, isArchived: true }, now), false);
  const sellers = [{ uid: 'a', desk: 'Sales Team A' }, { uid: 'b', desk: 'Sales Team A' }, { uid: 'c', desk: 'Sales Team B' }];
  assert.equal(chooseReplacement(base, sellers, { a: 0, b: 9 }).uid, 'b'); // never the current owner, even with the fewest clients
  assert.equal(chooseReplacement(base, [{ uid: 'a', desk: 'Sales Team A' }], {}), null);
  const f = reassignFields({ uid: 'b', name: 'بسمة', desk: 'Sales Team A' }, base, '2026-11-17T10:00:00Z');
  assert.equal(f.ownerUid, 'b');
  assert.equal(f.autoReassignCount, 1);
  assert.equal(f.autoReassignedFrom, 'a');
  assert.match(f.activityLogs[0].action, /من أمل إلى بسمة/);
  assert.equal(REASSIGN_AFTER_MS, 900000);
});
