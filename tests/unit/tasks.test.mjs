import test from 'node:test';
import assert from 'node:assert/strict';
import { buildTask, bucketOf, groupTasks, taskCounts, snoozed, completion, reopening, dueFromPreset, dueLabel, dayKeyFrom } from '../../src/utils/tasks.js';

// 2026-11-13 12:00 local
const NOW = new Date(2026, 10, 13, 12, 0, 0).getTime();
const me = { uid: 'u1', name: 'منى' };
const mk = (over = {}) => ({ id: 't', title: 'x', status: 'open', priority: 'normal', assigneeUid: 'u1', dueAt: '', ...over });

test('a task needs a title and a person; it takes a client by id and name only', () => {
  assert.equal(buildTask({ title: '  ', me, now: NOW }), null);
  assert.equal(buildTask({ title: 'اتصل', now: NOW }), null);
  const t = buildTask({ title: '  اتصل   بالعميل ', dueAt: '2026-11-14', priority: 'high', kind: 'call', lead: { id: 'L1', name: 'أحمد', phone: '0100' }, me, now: NOW });
  assert.equal(t.title, 'اتصل بالعميل');
  assert.equal(t.assigneeUid, 'u1');
  assert.equal(t.createdBy, 'u1');
  assert.equal(t.status, 'open');
  assert.equal(t.leadId, 'L1');
  assert.ok(!JSON.stringify(t).includes('0100'));
  // an unknown priority / kind / due falls back, the assignee can be someone else
  const odd = buildTask({ title: 'x', dueAt: 'tomorrow', priority: 'urgent!', kind: '??', assignee: { uid: 'u2', name: 'سارة' }, me, now: NOW });
  assert.deepEqual([odd.dueAt, odd.priority, odd.kind, odd.assigneeUid, odd.createdBy], ['', 'normal', 'other', 'u2', 'u1']);
});

test('presets are days from today', () => {
  assert.equal(dueFromPreset('today', NOW), '2026-11-13');
  assert.equal(dueFromPreset('tomorrow', NOW), '2026-11-14');
  assert.equal(dueFromPreset('week', NOW), '2026-11-20');
  assert.equal(dayKeyFrom(NOW, -1), '2026-11-12');
});

test('a task is overdue, today, upcoming, undated or done; a time that has passed today is late', () => {
  assert.equal(bucketOf(mk({ dueAt: '2026-11-12' }), NOW), 'overdue');
  assert.equal(bucketOf(mk({ dueAt: '2026-11-13' }), NOW), 'today');
  assert.equal(bucketOf(mk({ dueAt: '2026-11-13T09:00' }), NOW), 'overdue');
  assert.equal(bucketOf(mk({ dueAt: '2026-11-13T18:00' }), NOW), 'today');
  assert.equal(bucketOf(mk({ dueAt: '2026-11-14' }), NOW), 'upcoming');
  assert.equal(bucketOf(mk(), NOW), 'nodate');
  assert.equal(bucketOf(mk({ status: 'done', dueAt: '2026-11-01' }), NOW), 'done');
});

test('groups are in the order they are worked: late by date, today by urgency, then time', () => {
  const g = groupTasks([
    mk({ id: 'a', dueAt: '2026-11-13', priority: 'low' }),
    mk({ id: 'b', dueAt: '2026-11-13', priority: 'high', title: 'urgent' }),
    mk({ id: 'c', dueAt: '2026-11-10' }),
    mk({ id: 'd', dueAt: '2026-11-11' }),
    mk({ id: 'e', dueAt: '2026-11-20' }),
    mk({ id: 'f', dueAt: '2026-11-15' }),
    mk({ id: 'g', status: 'done', doneAt: '2026-11-12T10:00:00Z' }),
    mk({ id: 'h', status: 'done', doneAt: '2026-11-13T10:00:00Z' })
  ], NOW);
  assert.deepEqual(g.overdue.map((t) => t.id), ['c', 'd']);
  assert.deepEqual(g.today.map((t) => t.id), ['b', 'a']);
  assert.deepEqual(g.upcoming.map((t) => t.id), ['f', 'e']);
  assert.deepEqual(g.done.map((t) => t.id), ['h', 'g']);
});

test('the badge counts one person\'s late and today tasks, not done ones or others\'', () => {
  const c = taskCounts([
    mk({ dueAt: '2026-11-12' }), mk({ dueAt: '2026-11-13' }), mk({ dueAt: '2026-11-20' }),
    mk({ dueAt: '2026-11-12', status: 'done' }), mk({ dueAt: '2026-11-12', assigneeUid: 'u2' })
  ], 'u1', NOW);
  assert.deepEqual(c, { overdue: 1, today: 1, open: 3, due: 2 });
});

test('«بعد يوم» moves a late task from today and a future one from its own day, keeping its time', () => {
  assert.equal(snoozed(mk({ dueAt: '2026-11-10' }), 1, NOW), '2026-11-14');
  assert.equal(snoozed(mk({ dueAt: '2026-11-13T10:30' }), 1, NOW), '2026-11-14T10:30');
  assert.equal(snoozed(mk({ dueAt: '2026-11-20' }), 1, NOW), '2026-11-21');
  assert.equal(snoozed(mk(), 1, NOW), '2026-11-14');
});

test('completing and reopening, and the due label', () => {
  const done = completion(me, NOW);
  assert.deepEqual([done.status, done.doneBy], ['done', 'u1']);
  assert.deepEqual([reopening(NOW).status, reopening(NOW).doneAt], ['open', '']);
  assert.equal(dueLabel(mk({ dueAt: '2026-11-13T18:00' }), true, NOW), 'النهارده 18:00');
  assert.equal(dueLabel(mk({ dueAt: '2026-11-14' }), true, NOW), 'بكرة');
  assert.equal(dueLabel(mk({ dueAt: '2026-11-12' }), true, NOW), 'إمبارح');
  assert.equal(dueLabel(mk({ dueAt: '2026-12-02' }), true, NOW), '12/02');
  assert.equal(dueLabel(mk(), true, NOW), 'من غير ميعاد');
});
