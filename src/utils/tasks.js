// =============================================================
//  CRM tasks («مهامي»): things someone has to do by a day, with or without a client behind them.
//  A client has one «next step»; tasks are the list around it: call him, send the brochure, collect
//  the papers, book the viewing. Pure (tests/unit/tasks.test.mjs); the rules in firestore.rules
//  (tasks/{id}) hold the same shape, and src/services/tasks.js stores it.
// =============================================================
import { localDayKey } from './crmLeadViews.js';

export const PRIORITIES = [
  { id: 'high', ar: 'عاجلة', en: 'Urgent', rank: 0 },
  { id: 'normal', ar: 'عادية', en: 'Normal', rank: 1 },
  { id: 'low', ar: 'مش مستعجلة', en: 'Low', rank: 2 }
];
export const KINDS = [
  { id: 'call', ar: 'اتصال', en: 'Call' },
  { id: 'whatsapp', ar: 'واتساب', en: 'WhatsApp' },
  { id: 'visit', ar: 'معاينة', en: 'Viewing' },
  { id: 'docs', ar: 'أوراق', en: 'Papers' },
  { id: 'other', ar: 'أخرى', en: 'Other' }
];
export const DUE_PRESETS = [
  { id: 'today', ar: 'النهارده', en: 'Today', days: 0 },
  { id: 'tomorrow', ar: 'بكرة', en: 'Tomorrow', days: 1 },
  { id: '3d', ar: 'بعد ٣ أيام', en: 'In 3 days', days: 3 },
  { id: 'week', ar: 'الأسبوع الجاي', en: 'Next week', days: 7 }
];

const DAY = 86_400_000;
const rank = (p) => (PRIORITIES.find((x) => x.id === p) || PRIORITIES[1]).rank;

/** 'YYYY-MM-DD' (Egypt local day) `days` from `now` */
export const dayKeyFrom = (now = Date.now(), days = 0) => localDayKey(new Date(now + days * DAY));

export const dueFromPreset = (presetId, now = Date.now()) => {
  const p = DUE_PRESETS.find((x) => x.id === presetId) || DUE_PRESETS[0];
  return dayKeyFrom(now, p.days);
};

/** A task payload ready to store, or null when it has no title. `me`/`assignee`: { uid, name } */
export function buildTask({ title, note = '', dueAt = '', priority = 'normal', kind = 'other', lead = null, assignee, me, now = Date.now() } = {}) {
  const t = String(title ?? '').trim().replace(/\s+/g, ' ').slice(0, 140);
  if (!t || !me?.uid) return null;
  const to = assignee?.uid ? assignee : me;
  const due = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2})?$/.test(String(dueAt)) ? String(dueAt) : '';
  const iso = new Date(now).toISOString();
  return {
    title: t,
    note: String(note ?? '').trim().slice(0, 1000),
    dueAt: due,
    priority: PRIORITIES.some((p) => p.id === priority) ? priority : 'normal',
    status: 'open',
    kind: KINDS.some((k) => k.id === kind) ? kind : 'other',
    // The client's id and name only (never a phone): the name is for the list, the id opens the client
    leadId: lead?.id ? String(lead.id) : '',
    leadName: lead?.name ? String(lead.name).slice(0, 80) : '',
    assigneeUid: String(to.uid),
    assigneeName: String(to.name || '').slice(0, 80),
    createdBy: String(me.uid),
    createdByName: String(me.name || '').slice(0, 80),
    createdAt: iso,
    doneAt: '',
    doneBy: '',
    updatedAt: iso
  };
}

/** 'overdue' | 'today' | 'upcoming' | 'nodate' | 'done' */
export function bucketOf(task, now = Date.now()) {
  if (task.status === 'done') return 'done';
  const due = String(task.dueAt || '');
  if (!due) return 'nodate';
  const today = dayKeyFrom(now);
  const day = due.slice(0, 10);
  if (day < today) return 'overdue';
  if (day > today) return 'upcoming';
  // Today with a time that has passed counts as late
  if (due.length > 10) {
    const [h, m] = due.slice(11).split(':').map(Number);
    const d = new Date(now);
    if (h * 60 + m < d.getHours() * 60 + d.getMinutes()) return 'overdue';
  }
  return 'today';
}

const byDue = (a, b) => String(a.dueAt || '9999').localeCompare(String(b.dueAt || '9999'));
const byUrgency = (a, b) => rank(a.priority) - rank(b.priority) || byDue(a, b);

/** { overdue, today, upcoming, nodate, done }, each in the order it should be worked */
export function groupTasks(tasks = [], now = Date.now()) {
  const out = { overdue: [], today: [], upcoming: [], nodate: [], done: [] };
  for (const t of tasks) out[bucketOf(t, now)].push(t);
  out.overdue.sort(byDue);
  out.today.sort(byUrgency);
  out.upcoming.sort(byDue);
  out.nodate.sort(byUrgency);
  out.done.sort((a, b) => String(b.doneAt || '').localeCompare(String(a.doneAt || '')));
  out.done = out.done.slice(0, 20);
  return out;
}

/** What the badge and the digest say for one person */
export function taskCounts(tasks = [], uid, now = Date.now()) {
  let overdue = 0;
  let today = 0;
  let open = 0;
  for (const t of tasks) {
    if (t.assigneeUid !== uid || t.status === 'done') continue;
    open += 1;
    const b = bucketOf(t, now);
    if (b === 'overdue') overdue += 1;
    else if (b === 'today') today += 1;
  }
  return { overdue, today, open, due: overdue + today };
}

/** The new due value for «بعد يوم»: from today, keeping the time of day if there was one */
export function snoozed(task, days = 1, now = Date.now()) {
  const time = String(task.dueAt || '').length > 10 ? String(task.dueAt).slice(10) : '';
  const base = String(task.dueAt || '').slice(0, 10);
  const today = dayKeyFrom(now);
  // a task due in the future moves from its own day; a late or undated one moves from today
  const from = base && base > today ? Date.parse(`${base}T12:00:00`) : now;
  return `${dayKeyFrom(from, days)}${time}`;
}

/** The completion patch (the service adds nothing else) */
export const completion = (me, now = Date.now()) => ({ status: 'done', doneAt: new Date(now).toISOString(), doneBy: String(me?.uid || ''), updatedAt: new Date(now).toISOString() });
export const reopening = (now = Date.now()) => ({ status: 'open', doneAt: '', doneBy: '', updatedAt: new Date(now).toISOString() });

export const dueLabel = (task, isAr = true, now = Date.now()) => {
  const due = String(task.dueAt || '');
  if (!due) return isAr ? 'من غير ميعاد' : 'No date';
  const day = due.slice(0, 10);
  const today = dayKeyFrom(now);
  const time = due.length > 10 ? ` ${due.slice(11)}` : '';
  if (day === today) return `${isAr ? 'النهارده' : 'Today'}${time}`;
  if (day === dayKeyFrom(now, 1)) return `${isAr ? 'بكرة' : 'Tomorrow'}${time}`;
  if (day === dayKeyFrom(now, -1)) return `${isAr ? 'إمبارح' : 'Yesterday'}${time}`;
  return `${day.slice(5).replace('-', '/')}${time}`;
};
