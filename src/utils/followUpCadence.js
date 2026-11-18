// =============================================================
//  The follow-up a new client gets without anyone remembering it: a few tasks for the person who owns
//  him, spread over the first week (the first call today, a WhatsApp tomorrow, a second call in three
//  days). Created by the server (api/assign.js) right after the client is given to a salesperson, with
//  fixed ids so a retry never makes them twice. Pure: tests/unit/follow-up-cadence.test.mjs.
// =============================================================

export const CADENCE_STEPS = [
  { n: 1, days: 0, kind: 'call', priority: 'high', title: (name) => `أول اتصال: ${name}` },
  { n: 2, days: 1, kind: 'whatsapp', priority: 'normal', title: (name) => `واتساب متابعة: ${name}` },
  { n: 3, days: 3, kind: 'call', priority: 'normal', title: (name) => `اتصال تاني (تأكد من اهتمامه): ${name}` }
];

/** Egypt's calendar day, `days` from `now` */
export const cairoDay = (now = Date.now(), days = 0) => new Date(now + days * 86_400_000)
  .toLocaleDateString('en-CA', { timeZone: 'Africa/Cairo' });

const firstName = (lead) => String(lead?.name || '').trim().replace(/\s+/g, ' ').split(' ').slice(0, 2).join(' ').slice(0, 40) || 'العميل';

/**
 * [{ id, task }] for one client given to one person. `task` has the same shape as a task made in the CRM
 * (src/utils/tasks.js, firestore.rules crm_tasks); the client's id and first names, never a phone.
 */
export function cadenceTasks({ lead, seller, now = Date.now(), createdBy = 'system' }) {
  if (!lead?.id || !seller?.uid) return [];
  const name = firstName(lead);
  const at = new Date(now).toISOString();
  return CADENCE_STEPS.map((s) => ({
    id: `cad-${String(lead.id).slice(0, 60)}-${s.n}`,
    task: {
      title: s.title(name).slice(0, 140),
      note: '',
      dueAt: cairoDay(now, s.days),
      priority: s.priority,
      status: 'open',
      kind: s.kind,
      leadId: String(lead.id),
      leadName: name,
      assigneeUid: String(seller.uid),
      assigneeName: String(seller.name || '').slice(0, 80),
      createdBy: String(createdBy),
      createdByName: 'المتابعة التلقائية',
      createdAt: at,
      doneAt: '',
      doneBy: '',
      updatedAt: at
    }
  }));
}

const WEEK = 7 * 86_400_000;
const ms = (v) => (typeof v?.toMillis === 'function' ? v.toMillis() : typeof v?.seconds === 'number' ? v.seconds * 1000 : Date.parse(v) || 0);

/**
 * Clients that a person owns, who are still new and untouched, arrived this week and have no follow-up task
 * yet (a client given to them by hand, or by a manager). The same ids as the server's, so the two never double.
 */
export function leadsNeedingCadence(leads = [], tasks = [], uid, now = Date.now()) {
  if (!uid) return [];
  const withTasks = new Set(tasks.map((t) => t.leadId).filter(Boolean));
  return leads.filter((l) => l && l.id && l.ownerUid === uid && !l.isArchived && l.status === 'new'
    && !l.firstContactedAt && !withTasks.has(l.id)
    && now - (ms(l.createdAt) || ms(l.timestamp)) <= WEEK);
}
