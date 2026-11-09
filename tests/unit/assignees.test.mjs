import test from 'node:test';
import assert from 'node:assert/strict';
import { assigneeValue, assignmentUpdates, personFor, personValue } from '../../src/utils/assignees.js';

const team = [{ uid: 'u1', name: 'أحمد', desk: 'Sales Team A' }, { uid: 'u2', name: 'منى', desk: '' }];
const NOW = '2026-11-09T10:00:00.000Z';

test('the select shows the person who holds the lead, else its desk', () => {
  assert.equal(assigneeValue({ assignedTo: 'Sales Team A', ownerUid: 'u1', ownerName: 'أحمد' }), 'user:u1');
  assert.equal(assigneeValue({ assignedTo: 'Sales Team A', claimedBy: 'سارة' }), 'user:name:سارة');
  assert.equal(assigneeValue({ assignedTo: 'Sales Management' }), 'Sales Management');
  assert.equal(assigneeValue({}), 'Unassigned');
  assert.equal(personValue(team[0]), 'user:u1');
  assert.equal(personFor('user:u2', team).name, 'منى');
  assert.equal(personFor('Sales Management', team), null);
});

test('choosing a person names them on the lead and moves it to their desk', () => {
  const upd = assignmentUpdates({ assignedTo: 'Unassigned' }, 'user:u1', team, NOW);
  assert.equal(upd.ownerUid, 'u1');
  assert.equal(upd.ownerName, 'أحمد');
  assert.equal(upd.assignedTo, 'Sales Team A');
  // a person without a desk keeps the lead's desk
  assert.equal(assignmentUpdates({ assignedTo: 'Sales Management' }, 'user:u2', team, NOW).assignedTo, 'Sales Management');
});

test('choosing a team clears the person so the team queue picks the lead up', () => {
  const upd = assignmentUpdates({ assignedTo: 'Sales Team A', ownerUid: 'u1', ownerName: 'أحمد' }, 'Sales Team B', team, NOW);
  assert.equal(upd.assignedTo, 'Sales Team B');
  assert.equal(upd.ownerUid, null);
  assert.equal(upd.ownerName, null);
});
