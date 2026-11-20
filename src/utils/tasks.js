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

const DUE_RE = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2})?$/;

/**
 * Why this task can't be saved, in words for the form; '' when it can. A task needs a title, a day and someone
 * responsible (the assignee, else the person adding it).
 */
export function taskProblem({ title, dueAt, assignee, me } = {}, isAr = true) {
  if (!String(title ?? '').trim()) return isAr ? 'اكتب المهمة الأول' : 'Write the task first';
  if (!DUE_RE.test(String(dueAt ?? ''))) return isAr ? 'حدد ميعاد المهمة' : 'Pick a date for the task';
  if (!assignee?.uid && !me?.uid) return isAr ? 'حدد المسؤول عن المهمة' : 'Choose who is responsible';
  return '';
}

/** A task payload ready to store, or null when it has no title, no date or nobody responsible. `me`/`assignee`: { uid, name } */
export function buildTask({ title, note = '', dueAt = '', priority = 'normal', kind = 'other', lead = null, assignee, me, now = Date.now() } = {}) {
  if (taskProblem({ title, dueAt, assignee, me })) return null;
  const t = String(title ?? '').trim().replace(/\s+/g, ' ').slice(0, 140);
  const to = assignee?.uid ? assignee : me;
  const due = String(dueAt);
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

/** The open task of this client that is due first (a task with no date comes last), or null */
export function nextTaskFor(tasks = [], leadId) {
  const mine = tasks.filter((t) => t && t.status !== 'done' && String(t.leadId) === String(leadId));
  return mine.sort((a, b) => byDue(a, b))[0] || null;
}


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
    // no uid: the whole list (the team view)
    if ((uid && t.assigneeUid !== uid) || t.status === 'done') continue;
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
  const late = daysLate(task, now);
  if (late > 1) return isAr ? `متأخرة ${late} أيام` : `${late} days late`;
  return `${day.slice(5).replace('-', '/')}${time}`;
};

const ENDED = new Set(['closed', 'lost', 'inactive']);
/** Open tasks of a client who has since closed or been lost: nobody should keep chasing them */
export function tasksOfEndedLeads(tasks = [], leads = []) {
  const ended = new Set(leads.filter((l) => l && ENDED.has(l.status)).map((l) => l.id));
  return tasks.filter((t) => t && t.status === 'open' && t.leadId && ended.has(t.leadId));
}
/** The patch that closes such a task on its own (doneBy says it was not a person) */
export const autoCompletion = (now = Date.now()) => ({ ...completion({ uid: 'auto' }, now), doneBy: 'auto' });

// ── The «مهامي» screen's tools ──────────────────────────────────────────────

/** One-tap starters for the add form: the title, the kind and when */
export const TEMPLATES = [
  { id: 'call', ar: 'اتصل بالعميل', kind: 'call', priority: 'high', due: 'today' },
  { id: 'wa', ar: 'ابعت الكتالوج واتساب', kind: 'whatsapp', priority: 'normal', due: 'today' },
  { id: 'visit', ar: 'رتّب معاينة', kind: 'visit', priority: 'normal', due: 'tomorrow' },
  { id: 'docs', ar: 'اطلب الأوراق', kind: 'docs', priority: 'normal', due: '3d' },
  { id: 'follow', ar: 'متابعة بعد المعاينة', kind: 'call', priority: 'normal', due: 'tomorrow' }
];

/** «أجّلها»: how far to move a task */
export const SNOOZE_OPTIONS = [
  { id: 'tomorrow', ar: 'بكرة', en: 'Tomorrow', days: 1 },
  { id: '3d', ar: 'بعد ٣ أيام', en: 'In 3 days', days: 3 },
  { id: 'week', ar: 'الأسبوع الجاي', en: 'Next week', days: 7 }
];

/** Whole days a task is late (0 when it is not) */
export function daysLate(task, now = Date.now()) {
  if (bucketOf(task, now) !== 'overdue') return 0;
  const day = String(task.dueAt || '').slice(0, 10);
  const today = dayKeyFrom(now);
  return Math.max(0, Math.round((Date.parse(`${today}T00:00:00Z`) - Date.parse(`${day}T00:00:00Z`)) / DAY));
}

/** Tasks matching a search text (title, client, note), a kind, a priority and a person; empty filters pass everything */
export function filterTasks(tasks = [], { q = '', kind = '', priority = '', assignee = '' } = {}) {
  const needle = String(q).trim().toLowerCase();
  return tasks.filter((t) => (!kind || t.kind === kind)
    && (!priority || t.priority === priority)
    && (!assignee || t.assigneeUid === assignee)
    && (!needle || [t.title, t.leadName, t.note, t.assigneeName].some((x) => String(x || '').toLowerCase().includes(needle))));
}

/** { done, total }: tasks due today or earlier that are done today / still open, for the day's progress ring */
export function dayProgress(tasks = [], uid, now = Date.now()) {
  const today = dayKeyFrom(now);
  let done = 0;
  let open = 0;
  for (const t of tasks) {
    if (uid && t.assigneeUid !== uid) continue;
    if (t.status === 'done') { if (String(t.doneAt || '').length >= 10 && dayKeyFrom(Date.parse(t.doneAt)) === today) done += 1; continue; }
    const b = bucketOf(t, now);
    if (b === 'overdue' || b === 'today') open += 1;
  }
  return { done, total: done + open };
}

/** The patch that moves every given task to tomorrow (a late one keeps its time of day) */
export const pushAllPatch = (task, now = Date.now()) => ({ dueAt: snoozed(task, 1, now), updatedAt: new Date(now).toISOString() });

/** Editable fields of a task, validated like buildTask (null when the title is empty) */
export function editPatch({ title, dueAt, priority, kind, note }, now = Date.now()) {
  const t = String(title ?? '').trim().replace(/\s+/g, ' ').slice(0, 140);
  // Editing never leaves a task without a date
  if (!t || !DUE_RE.test(String(dueAt))) return null;
  return {
    title: t,
    dueAt: String(dueAt),
    priority: PRIORITIES.some((p) => p.id === priority) ? priority : 'normal',
    kind: KINDS.some((k) => k.id === kind) ? kind : 'other',
    note: String(note ?? '').trim().slice(0, 1000),
    updatedAt: new Date(now).toISOString()
  };
}


/** Tries a client gets before «غير متفاعل» is the next step (utils/stageGate MAX_ATTEMPTS) */
export const MAX_CALL_ATTEMPTS = 3;

/**
 * When to try again after a «لم يرد»: later the same day for the second try (the next morning when it is already
 * evening), the next morning for the third.
 */
export function nextAttemptDue(attemptNo, now = Date.now()) {
  const d = new Date(now);
  if (attemptNo <= 2 && d.getHours() < 17) {
    const at = new Date(now + 3 * 3600000);
    return `${dayKeyFrom(at.getTime())}T${String(at.getHours()).padStart(2, '0')}:${String(at.getMinutes() >= 30 ? 30 : 0).padStart(2, '0')}`;
  }
  return `${dayKeyFrom(now, 1)}T11:00`;
}

/**
 * The follow-up task a «لم يرد» creates: the next call, up to the third try. null once the tries are used up (the
 * client can then be moved to غير متفاعل). `attempts` = «لم يرد» so far, this one included.
 * [{ id, task }]: a fixed id, so a retry or a second device writes the same task.
 */
export function nextAttemptTask({ lead, attempts, me, now = Date.now() } = {}) {
  const next = Number(attempts) + 1;
  if (!lead?.id || !(attempts >= 1) || next > MAX_CALL_ATTEMPTS) return null;
  const who = lead.name ? ` — ${String(lead.name).split(' ').slice(0, 2).join(' ')}` : '';
  const task = buildTask({ title: `محاولة اتصال ${next} من ${MAX_CALL_ATTEMPTS}${who}`, dueAt: nextAttemptDue(next, now), priority: 'high', kind: 'call', lead, me, now });
  return task ? { id: `retry-${lead.id}-${next}`, task } : null;
}

// ── Giving tasks to colleagues, and following them ────────────────────────────

/** A task one person made for another (a manager's «كلّف زميلك بمهمة») */
export const isDelegated = (t) => Boolean(t?.createdBy) && t.createdBy !== t.assigneeUid;

/** The tasks this person gave to colleagues, open ones and done ones */
export const assignedByMe = (tasks = [], uid) => (uid ? tasks.filter((t) => isDelegated(t) && t.createdBy === uid) : []);

/** Open tasks someone gave to this person that they have not opened yet */
export const newAssignmentsFor = (tasks = [], uid) => (uid
  ? tasks.filter((t) => t.status !== 'done' && t.assigneeUid === uid && isDelegated(t) && !t.seenAt)
  : []);

/** The patch that says the assignee has seen the task (the assigner reads it as «اتشافت») */
export const seenPatch = (now = Date.now()) => ({ seenAt: new Date(now).toISOString(), updatedAt: new Date(now).toISOString() });

/** Open tasks this person gave to colleagues that are late: what the assigner has to chase */
export const delegatedLate = (tasks = [], uid, now = Date.now()) => assignedByMe(tasks, uid)
  .filter((t) => t.status !== 'done' && bucketOf(t, now) === 'overdue').length;

/**
 * One row per person who has tasks (or is on the team): how many are open, late, due today, done this week, and how
 * many were given by someone else and not opened yet. Most behind first; `members`: [{ uid, name }].
 */
export function workload(tasks = [], members = [], now = Date.now()) {
  const weekAgo = now - 7 * DAY;
  const byUid = new Map();
  const row = (uid, name) => {
    if (!byUid.has(uid)) byUid.set(uid, { uid, name: name || '', open: 0, overdue: 0, today: 0, doneWeek: 0, unseen: 0 });
    const r = byUid.get(uid);
    if (name && !r.name) r.name = name;
    return r;
  };
  for (const m of members) if (m?.uid) row(m.uid, m.name || m.email || '');
  for (const t of tasks) {
    if (!t?.assigneeUid) continue;
    const r = row(t.assigneeUid, t.assigneeName);
    if (t.status === 'done') {
      if (Date.parse(t.doneAt || '') >= weekAgo) r.doneWeek += 1;
      continue;
    }
    r.open += 1;
    const b = bucketOf(t, now);
    if (b === 'overdue') r.overdue += 1;
    else if (b === 'today') r.today += 1;
    if (isDelegated(t) && !t.seenAt) r.unseen += 1;
  }
  return [...byUid.values()]
    .filter((r) => r.open > 0 || r.doneWeek > 0)
    .sort((a, b) => b.overdue - a.overdue || b.open - a.open || String(a.name).localeCompare(String(b.name)));
}

/** The push the assignee gets when a colleague gives them a task */
export function assignmentPayload(task) {
  const who = String(task.createdByName || '').trim() || 'زميلك';
  const day = String(task.dueAt || '').slice(0, 10);
  const time = String(task.dueAt || '').length > 10 ? String(task.dueAt).slice(11, 16) : '';
  return {
    title: `كلّفك ${who} بمهمة`.slice(0, 120),
    body: [task.title, task.leadName, [day, time].filter(Boolean).join(' ')].filter(Boolean).join(' · '),
    url: '/crm?tab=tasks'
  };
}

/** The few tasks to do first: everything late (oldest first), then today's by urgency */
export function focusTasks(tasks = [], now = Date.now(), limit = 3) {
  const g = groupTasks(tasks, now);
  return [...g.overdue, ...g.today].slice(0, limit);
}

/** Tasks this person finished in the last 7 days (no uid: the whole list) */
export function doneThisWeek(tasks = [], uid, now = Date.now()) {
  const from = now - 7 * DAY;
  let n = 0;
  for (const t of tasks) {
    if (t.status !== 'done' || (uid && t.assigneeUid !== uid)) continue;
    const at = Date.parse(t.doneAt || '');
    if (Number.isFinite(at) && at >= from && at <= now) n += 1;
  }
  return n;
}
