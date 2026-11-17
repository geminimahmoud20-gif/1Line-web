import { test } from 'node:test';
import assert from 'node:assert/strict';
import { suggestNextStep, composeDue, reminderAt, dueReminders } from '../../src/utils/nextStep.js';

const NOW = new Date('2026-11-17T08:00:00').getTime();

test('suggestions follow the outcome', () => {
  assert.equal(suggestNextStep('interested', NOW).title, 'إرسال ترشيحات مناسبة');
  assert.equal(suggestNextStep('offer', NOW).day, '2026-11-19');
  assert.equal(suggestNextStep('viewing_set', NOW).needsTime, true);
  assert.equal(suggestNextStep('no_answer', NOW), null);
  assert.equal(suggestNextStep('not_fit', NOW), null);
});

test('composeDue needs a day, and a time for a viewing', () => {
  assert.equal(composeDue('2026-11-18', '10:00'), '2026-11-18T10:00');
  assert.equal(composeDue('2026-11-18', ''), '2026-11-18');
  assert.equal(composeDue('2026-11-18', '', { needsTime: true }), '');
  assert.equal(composeDue('', '10:00'), '');
});

test('reminder times: 15 min before, 60 for a viewing, 09:00 for a date-only task', () => {
  assert.equal(reminderAt({ dueAt: '2026-11-17T10:00', kind: 'call' }), new Date('2026-11-17T09:45:00').getTime());
  assert.equal(reminderAt({ dueAt: '2026-11-17T10:00', kind: 'visit' }), new Date('2026-11-17T09:00:00').getTime());
  assert.equal(reminderAt({ dueAt: '2026-11-17' }), new Date('2026-11-17T09:00:00').getTime());
  assert.equal(reminderAt({ dueAt: '' }), null);
});

test('dueReminders: mine, open, reached, not yet reminded', () => {
  const t = (id, dueAt, extra = {}) => ({ id, dueAt, kind: 'call', status: 'open', assigneeUid: 'u1', ...extra });
  const tasks = [t('a', '2026-11-17T08:10'), t('b', '2026-11-17T12:00'), t('c', '2026-11-17T08:05', { assigneeUid: 'u2' }), t('d', '2026-11-17T08:05', { status: 'done' }), t('e', '2026-11-17T08:14')];
  const ids = (r) => dueReminders(tasks, 'u1', NOW, r).map((x) => x.id);
  assert.deepEqual(ids({}), ['a', 'e']);
  assert.deepEqual(ids({ a: '2026-11-17T08:10' }), ['e']);
  assert.deepEqual(ids({ a: '2026-11-17T08:00' }), ['a', 'e']); // the task was moved: remind again
});
