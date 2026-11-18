// =============================================================
//  The push reminder a salesperson gets on their phone: how many of their clients are waiting past
//  the reply target and how many follow-ups are due today or late. One short digest, not one
//  message per client. Pure: scripts/send-followup-reminders.mjs (hourly) and
//  tests/unit/reminder-digest.test.mjs use it.
// =============================================================
import { waitingMs, responseSlaMs, escalationLevel, isOverdue, isDueToday, localDayKey } from './crmLeadViews.js';
import { taskCounts, delegatedLate } from './tasks.js';

const isOpen = (l) => !l.isArchived && l.status !== 'lost' && l.status !== 'closed' && l.status !== 'inactive';
const NO_OWNER = (l) => !l.ownerUid && !l.ownerName && !l.claimedBy && (!l.assignedTo || l.assignedTo === 'Unassigned');
export const RESEND_AFTER_MS = 4 * 3600 * 1000;
/** A salesperson with this many clients past the reply target is «متكدّس»: the manager hears who */
export const PILE_LIMIT = 3;

/** The person this lead is with (by account id, or by name for owners saved without one) */
export const ownedBy = (l, member = {}) => Boolean(
  (member.uid && l.ownerUid === member.uid)
  || (member.name && !l.ownerUid && (l.ownerName === member.name || l.claimedBy === member.name))
);

/**
 * What this team member should be reminded of, or null when there is nothing.
 * Managers also hear about clients nobody has been given (those wait for them to assign).
 * @param {object[]} leads
 * @param {{uid?: string, name?: string, manager?: boolean}} member
 */
export function digestFor(leads = [], member = {}, { now = Date.now(), tasks = [] } = {}) {
  const today = localDayKey(now);
  let late = 0;
  let due = 0;
  let overdue = 0;
  let unassignedLate = 0;
  let escalatedMine = 0; // mine, and the managers have been told
  let escalatedOthers = 0; // someone else's, past the escalation time: the manager's to chase
  const pile = new Map(); // other people's owners -> clients past the reply target (managers only)
  for (const l of leads) {
    if (!l || !isOpen(l)) continue;
    const mine = ownedBy(l, member);
    const waited = waitingMs(l, now);
    if (mine) {
      if (waited > responseSlaMs(l)) late += 1;
      if (escalationLevel(l, now) === 2) escalatedMine += 1;
      if (isDueToday(l, today) || isOverdue(l, today)) due += 1;
      if (isOverdue(l, today)) overdue += 1;
    } else if (member.manager && NO_OWNER(l) && waited > responseSlaMs(l)) {
      unassignedLate += 1;
    } else if (member.manager && !NO_OWNER(l)) {
      if (escalationLevel(l, now) === 2) escalatedOthers += 1;
      if (waited > responseSlaMs(l)) {
        const who = l.ownerName || l.claimedBy || '';
        if (who) pile.set(who, (pile.get(who) || 0) + 1);
      }
    }
  }
  // Tasks assigned to this person that are late or due today (crm_tasks)
  const mineTasks = member.uid ? taskCounts(tasks, member.uid, now) : { overdue: 0, today: 0 };
  const tasksLate = mineTasks.overdue;
  const tasksToday = mineTasks.today;
  // Tasks this person gave to colleagues that are late: theirs to chase
  const givenLate = member.uid ? delegatedLate(tasks, member.uid, now) : 0;
  const piled = [...pile.entries()].filter(([, n]) => n >= PILE_LIMIT).sort((a, b) => b[1] - a[1]).map(([name, n]) => ({ name, n }));
  if (!late && !due && !unassignedLate && !piled.length && !escalatedOthers && !tasksLate && !tasksToday && !givenLate) return null;
  const parts = [];
  if (late) parts.push(`${late} عميل مستني ردّك${escalatedMine ? ` (${escalatedMine} وصل للمدير)` : ''}`);
  if (due) parts.push(`${due} متابعة ${overdue ? 'النهارده أو متأخرة' : 'النهارده'}`);
  if (unassignedLate) parts.push(`${unassignedLate} عميل لسه من غير بياع`);
  if (tasksLate || tasksToday) parts.push(`${tasksLate + tasksToday} مهمة${tasksLate ? ` (${tasksLate} متأخرة)` : ' النهارده'}`);
  if (escalatedOthers) parts.push(`${escalatedOthers} عميل اتأخر الرد عليه عند بياعين`);
  if (piled.length) parts.push(`عملاء متأخرين عند: ${piled.slice(0, 3).map((p) => `${p.name} (${p.n})`).join('، ')}`);
  if (givenLate) parts.push(`${givenLate} مهمة كلّفت بيها اتأخرت`);
  return {
    late, due, overdue, unassignedLate, escalatedMine, escalatedOthers, tasksLate, tasksToday, givenLate, piled,
    sig: `${late}|${due}|${unassignedLate}|${escalatedMine}|${escalatedOthers}|${tasksLate}|${tasksToday}|${givenLate}|${piled.map((p) => `${p.name}:${p.n}`).join(',')}`,
    title: 'عندك شغل مستني في 1Line',
    body: parts.join(' · ')
  };
}

/** Send when it changed since the last digest, or the last one is old (so a day's backlog repeats, not every hour) */
export function shouldSend(digest, last, now = Date.now(), { minGapMs = 0 } = {}) {
  if (!digest) return false;
  if (!last || !last.sig || !last.at) return true;
  // The job now runs every 15 minutes for task alerts; the digest itself still goes out about once an hour
  if (minGapMs && now - Date.parse(last.at) < minGapMs) return false;
  return last.sig !== digest.sig || now - Date.parse(last.at) > RESEND_AFTER_MS;
}
