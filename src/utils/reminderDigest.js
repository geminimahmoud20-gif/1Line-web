// =============================================================
//  The push reminder a salesperson gets on their phone: how many of their clients are waiting past
//  the reply target and how many follow-ups are due today or late. One short digest, not one
//  message per client. Pure: scripts/send-followup-reminders.mjs (hourly) and
//  tests/unit/reminder-digest.test.mjs use it.
// =============================================================
import { waitingMs, responseSlaMs, escalationLevel, isOverdue, isDueToday, localDayKey } from './crmLeadViews.js';

const isOpen = (l) => !l.isArchived && l.status !== 'lost' && l.status !== 'closed';
const NO_OWNER = (l) => !l.ownerUid && !l.ownerName && !l.claimedBy && (!l.assignedTo || l.assignedTo === 'Unassigned');
export const RESEND_AFTER_MS = 4 * 3600 * 1000;

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
export function digestFor(leads = [], member = {}, { now = Date.now() } = {}) {
  const today = localDayKey(now);
  let late = 0;
  let due = 0;
  let overdue = 0;
  let unassignedLate = 0;
  let escalatedMine = 0; // mine, and the managers have been told
  let escalatedOthers = 0; // someone else's, past the escalation time: the manager's to chase
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
    } else if (member.manager && !NO_OWNER(l) && escalationLevel(l, now) === 2) {
      escalatedOthers += 1;
    }
  }
  if (!late && !due && !unassignedLate && !escalatedOthers) return null;
  const parts = [];
  if (late) parts.push(`${late} عميل مستني ردّك${escalatedMine ? ` (${escalatedMine} وصل للمدير)` : ''}`);
  if (due) parts.push(`${due} متابعة ${overdue ? 'النهارده أو متأخرة' : 'النهارده'}`);
  if (unassignedLate) parts.push(`${unassignedLate} عميل لسه من غير بياع`);
  if (escalatedOthers) parts.push(`${escalatedOthers} عميل اتأخر الرد عليه عند بياعين`);
  return {
    late, due, overdue, unassignedLate, escalatedMine, escalatedOthers,
    sig: `${late}|${due}|${unassignedLate}|${escalatedMine}|${escalatedOthers}`,
    title: 'عندك شغل مستني في 1Line',
    body: parts.join(' · ')
  };
}

/** Send when it changed since the last digest, or the last one is old (so a day's backlog repeats, not every hour) */
export function shouldSend(digest, last, now = Date.now()) {
  if (!digest) return false;
  if (!last || !last.sig || !last.at) return true;
  return last.sig !== digest.sig || now - Date.parse(last.at) > RESEND_AFTER_MS;
}
