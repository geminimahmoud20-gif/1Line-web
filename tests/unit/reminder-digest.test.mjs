import test from 'node:test';
import assert from 'node:assert/strict';
import { digestFor, shouldSend, ownedBy } from '../../src/utils/reminderDigest.js';

const NOW = Date.parse('2026-11-13T10:00:00');
const min = (m) => new Date(NOW - m * 60000).toISOString();
const me = { uid: 'u1', name: 'أحمد' };
const lead = (o) => ({ status: 'new', createdAt: min(600), ...o });

test('a lead belongs to a person by account id, or by name when saved without one', () => {
  assert.equal(ownedBy({ ownerUid: 'u1' }, me), true);
  assert.equal(ownedBy({ ownerName: 'أحمد' }, me), true);
  assert.equal(ownedBy({ ownerUid: 'u2', ownerName: 'أحمد' }, me), false);
  assert.equal(ownedBy({}, me), false);
});

test('counts late first replies and follow-ups due today or overdue, only for my own leads', () => {
  const ad = { marketingAttribution: { source: 'facebook', campaign: 'c' } };
  const d = digestFor([
    lead({ ...ad, ownerUid: 'u1', createdAt: min(40) }),                       // ad client, 40 min: late
    lead({ ownerUid: 'u1', createdAt: min(30) }),                              // 2 h target: fine
    lead({ ownerUid: 'u1', status: 'contacted', nextFollowUpAt: '2026-11-13T09:00:00' }),
    lead({ ownerUid: 'u1', status: 'contacted', nextFollowUpAt: '2026-11-10T09:00:00' }),
    lead({ ownerUid: 'u2', createdAt: min(500) }),                             // someone else's
    lead({ ownerUid: 'u1', status: 'closed', nextFollowUpAt: '2026-11-10T09:00:00' })
  ], me, { now: NOW });
  assert.equal(d.late, 1);
  assert.equal(d.due, 2);
  assert.equal(d.overdue, 1);
  assert.equal(d.body, '1 عميل مستني ردّك · 2 متابعة النهارده أو متأخرة');
});

test('nothing to say gives null; managers also hear about unassigned late clients', () => {
  assert.equal(digestFor([lead({ ownerUid: 'u1', createdAt: min(5) })], me, { now: NOW }), null);
  const unassigned = [lead({ createdAt: min(500) })];
  assert.equal(digestFor(unassigned, me, { now: NOW }), null);
  const m = digestFor(unassigned, { ...me, manager: true }, { now: NOW });
  assert.equal(m.unassignedLate, 1);
  assert.match(m.body, /من غير بياع/);
});

test('a digest is sent when it changes or the last one is old, not every run', () => {
  const d = { sig: '1|2|0' };
  assert.equal(shouldSend(null, null, NOW), false);
  assert.equal(shouldSend(d, null, NOW), true);
  assert.equal(shouldSend(d, { sig: '1|2|0', at: min(60) }, NOW), false);
  assert.equal(shouldSend(d, { sig: '1|2|0', at: min(300) }, NOW), true);
  assert.equal(shouldSend(d, { sig: '0|2|0', at: min(10) }, NOW), true);
});

test('a client unanswered for a day is escalated: the owner is told it reached the manager, the manager hears about it', () => {
  const day = 25 * 60;
  const leads = [
    lead({ ownerUid: 'u1', createdAt: min(day) }),     // mine, over a day
    lead({ ownerUid: 'u1', createdAt: min(300) }),     // mine, late but not escalated
    lead({ ownerUid: 'u2', createdAt: min(day) }),     // someone else's, over a day
    lead({ ownerUid: 'u2', createdAt: min(300) })      // someone else's, not yet
  ];
  const mine = digestFor(leads, me, { now: NOW });
  assert.equal(mine.late, 2);
  assert.equal(mine.escalatedMine, 1);
  assert.match(mine.body, /2 عميل مستني ردّك \(1 وصل للمدير\)/);
  assert.equal(mine.escalatedOthers, 0); // a salesperson is not told about colleagues' clients
  const boss = digestFor(leads, { uid: 'm1', name: 'مدير', manager: true }, { now: NOW });
  assert.equal(boss.escalatedOthers, 2); // u1 and u2 day-old clients
  assert.match(boss.body, /اتأخر الرد عليه عند بياعين/);
  assert.notEqual(mine.sig, boss.sig);
});

test('ad clients escalate after two hours, others after a day; answered or closed ones never', async () => {
  const { escalationLevel } = await import('../../src/utils/crmLeadViews.js');
  const ad = { marketingAttribution: { source: 'facebook', campaign: 'c' } };
  assert.equal(escalationLevel(lead({ ...ad, createdAt: min(10) }), NOW), 0);
  assert.equal(escalationLevel(lead({ ...ad, createdAt: min(60) }), NOW), 1);
  assert.equal(escalationLevel(lead({ ...ad, createdAt: min(130) }), NOW), 2);
  assert.equal(escalationLevel(lead({ createdAt: min(600) }), NOW), 1);
  assert.equal(escalationLevel(lead({ createdAt: min(25 * 60) }), NOW), 2);
  assert.equal(escalationLevel(lead({ createdAt: min(25 * 60), firstContactedAt: min(60) }), NOW), 0);
  assert.equal(escalationLevel(lead({ createdAt: min(25 * 60), isArchived: true }), NOW), 0);
});

test('a person\'s late and due-today tasks are in their phone digest, and only theirs', () => {
  const t = (over) => ({ status: 'open', assigneeUid: 'u1', dueAt: '2026-11-13', ...over });
  const tasks = [t({ dueAt: '2026-11-12' }), t({}), t({ dueAt: '2026-11-20' }), t({ status: 'done' }), t({ assigneeUid: 'u2' })];
  const d = digestFor([], me, { now: NOW, tasks });
  assert.equal(d.tasksLate, 1);
  assert.equal(d.tasksToday, 1);
  assert.match(d.body, /2 مهمة \(1 متأخرة\)/);
  assert.equal(digestFor([], me, { now: NOW, tasks: [t({ dueAt: '2026-11-20' })] }), null);
  assert.notEqual(d.sig, digestFor([], me, { now: NOW, tasks: [t({})] }).sig);
});
