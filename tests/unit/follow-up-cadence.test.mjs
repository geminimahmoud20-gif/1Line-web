import test from 'node:test';
import assert from 'node:assert/strict';
import { cadenceTasks, cairoDay, CADENCE_STEPS } from '../../src/utils/followUpCadence.js';

const NOW = Date.parse('2026-11-13T10:00:00Z'); // noon in Cairo
const lead = { id: 'lead-1', name: '  أحمد   عبد العال   الباز ', phone: '01000000000' };
const seller = { uid: 'u-seller', name: 'منى' };

test('a new client gets three follow-up tasks for the owner, spread over the first week', () => {
  const list = cadenceTasks({ lead, seller, now: NOW });
  assert.equal(list.length, CADENCE_STEPS.length);
  assert.deepEqual(list.map((x) => x.task.dueAt), ['2026-11-13', '2026-11-14', '2026-11-16']);
  assert.deepEqual(list.map((x) => x.task.kind), ['call', 'whatsapp', 'call']);
  assert.equal(list[0].task.priority, 'high');
  assert.ok(list.every((x) => x.task.assigneeUid === 'u-seller' && x.task.status === 'open' && x.task.leadId === 'lead-1'));
});

test('ids are fixed per client and step, so a retry never makes them twice', () => {
  const a = cadenceTasks({ lead, seller, now: NOW }).map((x) => x.id);
  const b = cadenceTasks({ lead, seller, now: NOW + 5000 }).map((x) => x.id);
  assert.deepEqual(a, ['cad-lead-1-1', 'cad-lead-1-2', 'cad-lead-1-3']);
  assert.deepEqual(a, b);
});

test('a task names the client by his first two names and carries no phone; it fits the stored shape', () => {
  const [{ task }] = cadenceTasks({ lead, seller, now: NOW });
  assert.match(task.title, /أحمد عبد/);
  assert.ok(!task.title.includes('الباز'));
  assert.ok(!JSON.stringify(task).includes('0100'));
  assert.ok(task.title.length <= 140);
  // exactly the keys the crm_tasks rule allows
  assert.deepEqual(Object.keys(task).sort(), ['assigneeName', 'assigneeUid', 'createdAt', 'createdBy', 'createdByName', 'doneAt', 'doneBy', 'dueAt', 'kind', 'leadId', 'leadName', 'note', 'priority', 'status', 'title', 'updatedAt'].sort());
  assert.equal(task.createdBy, 'system');
});

test('nothing without a client id or an owner; days are Egypt days', () => {
  assert.deepEqual(cadenceTasks({ lead: {}, seller, now: NOW }), []);
  assert.deepEqual(cadenceTasks({ lead, seller: {}, now: NOW }), []);
  // 22:30 UTC is already the next day in Cairo (UTC+2 in winter)
  assert.equal(cairoDay(Date.parse('2026-11-13T22:30:00Z')), '2026-11-14');
  assert.equal(cadenceTasks({ lead: { id: 'x' }, seller, now: NOW })[0].task.leadName, 'العميل');
});
