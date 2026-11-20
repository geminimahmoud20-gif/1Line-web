import test from 'node:test';
import assert from 'node:assert/strict';
import { buildTask, bucketOf, groupTasks, taskCounts, snoozed, completion, reopening, dueFromPreset, dueLabel, dayKeyFrom } from '../../src/utils/tasks.js';

// 2026-11-13 12:00 local
const NOW = new Date(2026, 10, 13, 12, 0, 0).getTime();
const me = { uid: 'u1', name: 'منى' };
const mk = (over = {}) => ({ id: 't', title: 'x', status: 'open', priority: 'normal', assigneeUid: 'u1', dueAt: '', ...over });

test('a task needs a title, a day and a person; it takes a client by id and name only', () => {
  assert.equal(buildTask({ title: '  ', dueAt: '2026-11-14', me, now: NOW }), null);
  assert.equal(buildTask({ title: 'اتصل', dueAt: '2026-11-14', now: NOW }), null);
  assert.equal(buildTask({ title: 'اتصل', me, now: NOW }), null); // no day
  assert.equal(buildTask({ title: 'اتصل', dueAt: 'tomorrow', me, now: NOW }), null);
  const t = buildTask({ title: '  اتصل   بالعميل ', dueAt: '2026-11-14', priority: 'high', kind: 'call', lead: { id: 'L1', name: 'أحمد', phone: '0100' }, me, now: NOW });
  assert.equal(t.title, 'اتصل بالعميل');
  assert.equal(t.assigneeUid, 'u1');
  assert.equal(t.createdBy, 'u1');
  assert.equal(t.status, 'open');
  assert.equal(t.leadId, 'L1');
  assert.ok(!JSON.stringify(t).includes('0100'));
  // an unknown priority / kind falls back, the assignee can be someone else
  const odd = buildTask({ title: 'x', dueAt: '2026-11-14T09:00', priority: 'urgent!', kind: '??', assignee: { uid: 'u2', name: 'سارة' }, me, now: NOW });
  assert.deepEqual([odd.dueAt, odd.priority, odd.kind, odd.assigneeUid, odd.createdBy], ['2026-11-14T09:00', 'normal', 'other', 'u2', 'u1']);
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

import { tasksOfEndedLeads, autoCompletion } from '../../src/utils/tasks.js';
test('open tasks of closed or lost clients are picked up for auto-closing', () => {
  const leads = [{ id: 'a', status: 'closed' }, { id: 'b', status: 'lost' }, { id: 'c', status: 'contacted' }];
  const tasks = [
    { id: 1, leadId: 'a', status: 'open' }, { id: 2, leadId: 'b', status: 'open' },
    { id: 3, leadId: 'c', status: 'open' }, { id: 4, leadId: 'a', status: 'done' }, { id: 5, status: 'open' }
  ];
  assert.deepEqual(tasksOfEndedLeads(tasks, leads).map((t) => t.id), [1, 2]);
  const p = autoCompletion(0);
  assert.equal(p.status, 'done');
  assert.equal(p.doneBy, 'auto');
});

import { daysLate, filterTasks, dayProgress, editPatch, TEMPLATES, SNOOZE_OPTIONS } from '../../src/utils/tasks.js';
const N2 = new Date(2026, 10, 13, 12, 0).getTime();
test('daysLate counts whole days, 0 when not late', () => {
  assert.equal(daysLate({ status: 'open', dueAt: '2026-11-10' }, N2), 3);
  assert.equal(daysLate({ status: 'open', dueAt: '2026-11-13' }, N2), 0);
  assert.equal(daysLate({ status: 'done', dueAt: '2026-11-01' }, N2), 0);
  assert.equal(dueLabel({ status: 'open', dueAt: '2026-11-10' }, true, N2), 'متأخرة 3 أيام');
});
test('filterTasks matches text in the title, client or person, plus kind, priority and assignee', () => {
  const ts = [
    { id: 1, title: 'اتصل بسعيد', leadName: 'سعيد', kind: 'call', priority: 'high', assigneeUid: 'a' },
    { id: 2, title: 'ابعت كتالوج', leadName: 'منى', kind: 'whatsapp', priority: 'normal', assigneeUid: 'b', assigneeName: 'Ali' }
  ];
  assert.deepEqual(filterTasks(ts, { q: 'سعيد' }).map((t) => t.id), [1]);
  assert.deepEqual(filterTasks(ts, { q: 'ali' }).map((t) => t.id), [2]);
  assert.deepEqual(filterTasks(ts, { kind: 'whatsapp' }).map((t) => t.id), [2]);
  assert.deepEqual(filterTasks(ts, { priority: 'high', assignee: 'a' }).map((t) => t.id), [1]);
  assert.equal(filterTasks(ts, {}).length, 2);
});
test('dayProgress: done today against what is still due', () => {
  const ts = [
    { assigneeUid: 'a', status: 'done', doneAt: new Date(2026, 10, 13, 9, 0).toISOString() },
    { assigneeUid: 'a', status: 'done', doneAt: new Date(2026, 10, 12, 9, 0).toISOString() },
    { assigneeUid: 'a', status: 'open', dueAt: '2026-11-13' },
    { assigneeUid: 'a', status: 'open', dueAt: '2026-11-01' },
    { assigneeUid: 'a', status: 'open', dueAt: '2026-11-20' },
    { assigneeUid: 'b', status: 'open', dueAt: '2026-11-13' }
  ];
  assert.deepEqual(dayProgress(ts, 'a', N2), { done: 1, total: 3 });
});
test('editPatch validates like a new task', () => {
  assert.equal(editPatch({ title: '  ', dueAt: '2026-11-15' }), null);
  const p = editPatch({ title: '  اتصل   بسعيد ', dueAt: '2026-11-15T10:30', priority: 'x', kind: 'call', note: 'ملاحظة' }, N2);
  assert.deepEqual([p.title, p.dueAt, p.priority, p.kind], ['اتصل بسعيد', '2026-11-15T10:30', 'normal', 'call']);
  assert.equal(editPatch({ title: 'a', dueAt: 'soon' }), null); // never without a date
  assert.equal(editPatch({ title: 'a', dueAt: '2026-11-15' }).dueAt, '2026-11-15');
  assert.ok(TEMPLATES.every((t) => t.ar && t.kind && t.due) && SNOOZE_OPTIONS.length === 3);
});

test('the next task of a client is its earliest open one', async () => {
  const { nextTaskFor } = await import('../../src/utils/tasks.js');
  const tasks = [
    { id: 'a', leadId: 'L1', dueAt: '2026-11-20', status: 'open' },
    { id: 'b', leadId: 'L1', dueAt: '2026-11-18T10:00', status: 'open' },
    { id: 'c', leadId: 'L1', dueAt: '2026-11-17', status: 'done' },
    { id: 'd', leadId: 'L2', dueAt: '2026-11-16', status: 'open' },
    { id: 'e', leadId: 'L1', dueAt: '', status: 'open' }
  ];
  assert.equal(nextTaskFor(tasks, 'L1').id, 'b');
  assert.equal(nextTaskFor(tasks, 'L2').id, 'd');
  assert.equal(nextTaskFor(tasks, 'L3'), null);
});

test('a task says what is missing', async () => {
  const { taskProblem } = await import('../../src/utils/tasks.js');
  assert.equal(taskProblem({ title: '', dueAt: '2026-11-14', me }), 'اكتب المهمة الأول');
  assert.equal(taskProblem({ title: 'a', dueAt: '', me }), 'حدد ميعاد المهمة');
  assert.equal(taskProblem({ title: 'a', dueAt: '2026-11-14' }), 'حدد المسؤول عن المهمة');
  assert.equal(taskProblem({ title: 'a', dueAt: '2026-11-14', assignee: { uid: 'u2' } }), '');
});

test('after «لم يرد» the next call is a task, up to the third try', async () => {
  const { nextAttemptTask, nextAttemptDue } = await import('../../src/utils/tasks.js');
  const lead = { id: 'L1', name: 'محب عادل' };
  const morning = new Date(2026, 10, 17, 10, 10).getTime();
  const evening = new Date(2026, 10, 17, 19, 0).getTime();
  const a = nextAttemptTask({ lead, attempts: 1, me, now: morning });
  assert.equal(a.id, 'retry-L1-2');
  assert.match(a.task.title, /محاولة اتصال 2 من 3/);
  assert.equal(a.task.dueAt, '2026-11-17T13:00'); // later the same day
  assert.equal(a.task.leadId, 'L1');
  assert.equal(a.task.kind, 'call');
  assert.equal(nextAttemptDue(2, evening), '2026-11-18T11:00'); // already evening: tomorrow morning
  assert.equal(nextAttemptTask({ lead, attempts: 2, me, now: morning }).task.dueAt, '2026-11-18T11:00');
  assert.equal(nextAttemptTask({ lead, attempts: 3, me, now: morning }), null); // tries used up
  assert.equal(nextAttemptTask({ lead, attempts: 0, me, now: morning }), null);
  assert.equal(nextAttemptTask({ lead: {}, attempts: 1, me }), null);
});

// ── Giving tasks to colleagues ──
test('a task one person made for another is delegated; the assignee has not seen it until they open the list', async () => {
  const { isDelegated, assignedByMe, newAssignmentsFor, seenPatch, delegatedLate, workload, assignmentPayload } = await import('../../src/utils/tasks.js');
  const NOW = new Date('2026-11-18T10:00:00').getTime();
  const mk = (over) => ({ id: over.id, title: 'اتصل', status: 'open', priority: 'normal', dueAt: '2026-11-18', assigneeUid: 'u2', assigneeName: 'منى', createdBy: 'boss', createdByName: 'المدير', ...over });
  const mine = mk({ id: 'a', createdBy: 'u2', assigneeUid: 'u2' });
  const given = mk({ id: 'b' });
  const late = mk({ id: 'c', dueAt: '2026-11-10' });
  const seen = mk({ id: 'd', seenAt: '2026-11-18T09:00:00.000Z' });
  const other = mk({ id: 'e', assigneeUid: 'u3', assigneeName: 'علي' });
  const done = mk({ id: 'f', status: 'done', doneAt: '2026-11-17T09:00:00.000Z' });
  const all = [mine, given, late, seen, other, done];
  assert.deepEqual([isDelegated(mine), isDelegated(given)], [false, true]);
  assert.deepEqual(assignedByMe(all, 'boss').map((t) => t.id), ['b', 'c', 'd', 'e', 'f']);
  assert.deepEqual(newAssignmentsFor(all, 'u2').map((t) => t.id), ['b', 'c']); // mine and the seen one are not new
  assert.equal(newAssignmentsFor([done], 'u2').length, 0);
  assert.ok(Date.parse(seenPatch(NOW).seenAt) === NOW);
  assert.equal(delegatedLate(all, 'boss', NOW), 1); // only c is late and still open
  const rows = workload(all, [{ uid: 'u2', name: 'منى' }, { uid: 'u9', name: 'ساكت' }], NOW);
  assert.deepEqual(rows.map((r) => r.uid), ['u2', 'u3']); // most behind first; a member with nothing is not listed
  assert.deepEqual([rows[0].open, rows[0].overdue, rows[0].today, rows[0].doneWeek, rows[0].unseen], [4, 1, 3, 1, 2]);
  assert.match(assignmentPayload(given).title, /المدير/);
});

test('the counts of a list with no person are the whole list (the team view)', async () => {
  const { taskCounts } = await import('../../src/utils/tasks.js');
  const NOW = new Date('2026-11-18T10:00:00').getTime();
  const list = [{ assigneeUid: 'a', status: 'open', dueAt: '2026-11-10' }, { assigneeUid: 'b', status: 'open', dueAt: '2026-11-18' }, { assigneeUid: 'b', status: 'done', dueAt: '2026-11-18' }];
  assert.deepEqual(taskCounts(list, undefined, NOW), { overdue: 1, today: 1, open: 2, due: 2 });
  assert.deepEqual(taskCounts(list, 'b', NOW), { overdue: 0, today: 1, open: 1, due: 1 });
});

import { focusTasks, doneThisWeek } from '../../src/utils/tasks.js';
test('focus: late first, then today, limited', () => {
  const now = Date.parse('2026-06-15T12:00:00');
  const mk = (id, dueAt, extra = {}) => ({ id, title: id, status: 'open', dueAt, assigneeUid: 'u', ...extra });
  const tasks = [mk('t1', '2026-06-15'), mk('late', '2026-06-10'), mk('later', '2026-07-01'), mk('t2', '2026-06-15')];
  const f = focusTasks(tasks, now, 2);
  assert.equal(f[0].id, 'late');
  assert.equal(f.length, 2);
  assert.ok(!f.some((t) => t.id === 'later'));
});
test('done this week counts only the last 7 days for that person', () => {
  const now = Date.parse('2026-06-15T12:00:00Z');
  const d = (days, uid = 'u') => ({ status: 'done', assigneeUid: uid, doneAt: new Date(now - days * 86400000).toISOString() });
  assert.equal(doneThisWeek([d(1), d(6), d(9), d(2, 'x')], 'u', now), 2);
});
