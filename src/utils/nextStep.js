// =============================================================
//  «الخطوة الجاية؟»: after an outcome is logged, the next task is suggested (title, kind, day, priority)
//  and has to be saved, or skipped on purpose. Also: when a task should remind its owner (before its due time).
//  Pure (tests/unit/next-step.test.mjs).
// =============================================================
import { dayKeyFrom, bucketOf } from './tasks.js';

const SUGGESTIONS = {
  reached: { title: 'متابعة واتساب', kind: 'whatsapp', priority: 'normal', days: 1 },
  interested: { title: 'إرسال ترشيحات مناسبة', kind: 'whatsapp', priority: 'normal', days: 1 },
  callback: { title: 'اتصال بعد المهلة', kind: 'call', priority: 'normal', days: 1 },
  viewing_set: { title: 'معاينة مع العميل', kind: 'visit', priority: 'high', days: 1, needsTime: true },
  viewing_done: { title: 'متابعة بعد المعاينة', kind: 'call', priority: 'high', days: 1 },
  offer: { title: 'متابعة العرض', kind: 'call', priority: 'high', days: 2 },
  agreed: { title: 'تجهيز العقد والأوراق', kind: 'docs', priority: 'high', days: 1 },
  // a task was ticked off and nothing else is planned for this client
  task_done: { title: 'متابعة العميل', kind: 'call', priority: 'normal', days: 1 }
};

/** The suggested next task after this outcome, or null when none is needed (no answer has its own retries; negatives end the chase) */
export function suggestNextStep(outcomeId, now = Date.now()) {
  const s = SUGGESTIONS[outcomeId];
  if (!s) return null;
  return { title: s.title, kind: s.kind, priority: s.priority, day: dayKeyFrom(now, s.days), time: s.needsTime ? '' : '10:00', needsTime: Boolean(s.needsTime) };
}

/** 'YYYY-MM-DD' + 'HH:MM' → the task's dueAt, or '' when the day is missing (a visit needs its time) */
export function composeDue(day, time, { needsTime = false } = {}) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(day || ''))) return '';
  if (needsTime && !/^\d{2}:\d{2}$/.test(String(time || ''))) return '';
  return /^\d{2}:\d{2}$/.test(String(time || '')) ? `${day}T${time}` : day;
}

/** Minutes before the due time that a reminder fires: a viewing needs travel time; date-only tasks remind at 09:00 */
export const leadMinutes = (task) => (task?.kind === 'visit' ? 60 : 15);
const DAY_ONLY_HOUR = 9;

/** The moment (ms) the reminder for this task should fire, or null for a task with no date */
export function reminderAt(task) {
  const due = String(task?.dueAt || '');
  if (!/^\d{4}-\d{2}-\d{2}/.test(due)) return null;
  if (due.length > 10) return new Date(`${due}:00`).getTime() - leadMinutes(task) * 60_000;
  return new Date(`${due}T0${DAY_ONLY_HOUR}:00:00`).getTime();
}

/**
 * Open tasks of this person that are due for a reminder now and haven't been reminded: past their reminder time
 * and not already late by more than a day (those show in «متأخرة» anyway).
 */
export function dueReminders(tasks = [], uid, now = Date.now(), reminded = {}) {
  return tasks.filter((t) => {
    if (!t || t.status === 'done' || t.assigneeUid !== uid || reminded[t.id] === t.dueAt) return false;
    const at = reminderAt(t);
    if (at == null || now < at) return false;
    return bucketOf(t, now) !== 'overdue' || now - at < 86_400_000;
  }).sort((a, b) => String(a.dueAt).localeCompare(String(b.dueAt)));
}

/** The activity-log line when the person chooses not to set a next step */
export const SKIP_LOG = 'مفيش خطوة تانية';
