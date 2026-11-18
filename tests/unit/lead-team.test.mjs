import test from 'node:test';
import assert from 'node:assert/strict';
import { participantsOf } from '../../src/utils/leadTeam.js';

test('the owner first, then everyone who logged on the client or has a task on it', () => {
  const lead = {
    id: 'L1', ownerName: 'محمود كمال',
    activityLogs: [{ agent: 'سارة', action: 'x' }, { agent: 'النظام', action: 'تحويل' }, { agent: 'محمود كمال', action: 'y' }],
    outcomes: [{ id: 'reached', n: 'أحمد' }]
  };
  const tasks = [{ leadId: 'L1', assigneeName: 'محمود كمال', createdByName: 'المدير' }, { leadId: 'other', assigneeName: 'غريب' }];
  const p = participantsOf(lead, tasks);
  assert.equal(p[0].name, 'محمود كمال');
  assert.equal(p[0].role, 'owner');
  assert.deepEqual(p.slice(1).map((x) => x.name).sort(), ['أحمد', 'المدير', 'سارة'].sort());
  assert.ok(!p.some((x) => x.name === 'النظام' || x.name === 'غريب'));
});

test('a client nobody holds has no owner entry', () => {
  assert.deepEqual(participantsOf({ id: 'L2' }, []), []);
});
