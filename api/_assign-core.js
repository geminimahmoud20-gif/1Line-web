// =============================================================
//  Auto-assign a new client to a salesperson: the rules, pure (tests/unit/assign-core.test.mjs).
//  A client from the website lands on a team's queue (the browser can't see the other leads, so its
//  round-robin can't balance). Right after it is saved, api/assign.js picks the person on that team
//  with the fewest open clients and gives the client to them, so someone owns it in seconds.
// =============================================================

/** Only a client this fresh is assigned automatically */
export const FRESH_MS = 20 * 60 * 1000;
export const MAX_OPEN_COUNT = 300;

const hasOwner = (l) => Boolean(l.ownerUid || l.ownerName || l.claimedBy);

/** A fresh, still-new client nobody owns yet (staff-made and already-worked clients are left alone) */
export function eligible(lead, now = Date.now()) {
  if (!lead || lead.isArchived || hasOwner(lead)) return false;
  if (lead.status && lead.status !== 'new') return false;
  const created = Date.parse(lead.createdAt || lead.timestamp || '');
  return Boolean(created) && now - created >= 0 && now - created <= FRESH_MS;
}

/** People who work clients day to day: can edit leads, but are not managers or admins, and are on a team */
export function sellersOf(members = []) {
  return members.filter((m) => m && !m.disabled && m.uid && m.role !== 'super_admin'
    && Array.isArray(m.perms) && m.perms.includes('ld.edit')
    && !m.perms.includes('ld.manage') && !m.perms.includes('*')
    && m.desk);
}

/**
 * The person to give the lead to, or null. Same team as the lead first; otherwise anyone on a team
 * that takes part in round-robin. The fewest open clients wins (ties: by id, so it is repeatable).
 * @param {object} lead
 * @param {object[]} sellers   sellersOf(members)
 * @param {Record<string, number>} counts  open clients per uid
 * @param {object[]} teams  access config teams
 */
export function chooseSeller(lead, sellers = [], counts = {}, teams = []) {
  const sameTeam = sellers.filter((m) => m.desk === lead.assignedTo);
  const inRotation = sellers.filter((m) => {
    const team = teams.find((t) => t.id === m.desk);
    return team ? team.active !== false && team.roundRobin !== false : true;
  });
  const pool = sameTeam.length ? sameTeam : inRotation;
  if (!pool.length) return null;
  return [...pool].sort((a, b) => (counts[a.uid] || 0) - (counts[b.uid] || 0) || String(a.uid).localeCompare(String(b.uid)))[0];
}

/** The lead fields that hand it to one person (the same ones the CRM's «تعيين» writes) */
export function ownerFields(member, lead, nowIso = new Date().toISOString()) {
  const name = member.name || (member.email ? member.email.split('@')[0] : '') || member.uid;
  return {
    ownerUid: member.uid,
    ownerName: name,
    claimedBy: name,
    assignedTo: member.desk || lead.assignedTo || 'Unassigned',
    claimedAt: nowIso,
    assignedAt: nowIso,
    autoAssigned: true
  };
}

/**
 * The forms a phone can be stored as («+201094590572», «201094590572», «01094590572»): to find the same
 * person's earlier requests whichever way they typed it. Empty when it is not a phone.
 */
export function phoneVariants(phone) {
  const d = String(phone ?? '').replace(/[٠-٩]/g, (c) => String(c.charCodeAt(0) - 0x0660)).replace(/\D/g, '');
  const local = d.startsWith('0020') ? d.slice(4) : d.startsWith('20') && d.length >= 12 ? d.slice(2) : d.startsWith('0') ? d.slice(1) : d;
  if (local.length < 9 || local.length > 11) return [];
  return [`+20${local}`, `20${local}`, `0${local}`, local];
}

/**
 * A client who asks again goes back to the person who already has them, not to whoever has the fewest clients:
 * the owner of the most recent earlier request (same phone) who is still on the team. null when there is none.
 * @param {object[]} earlier  [{ id, ownerUid, createdAt, isArchived }]
 * @param {object[]} sellers  sellersOf(members)
 */
export function returningOwner(earlier = [], sellers = []) {
  const byUid = new Map(sellers.map((m) => [m.uid, m]));
  const mine = earlier
    .filter((l) => l && l.ownerUid && !l.isArchived && byUid.has(l.ownerUid))
    .sort((a, b) => Date.parse(b.createdAt || 0) - Date.parse(a.createdAt || 0));
  return mine.length ? { seller: byUid.get(mine[0].ownerUid), previousLeadId: String(mine[0].id) } : null;
}

// ── An auto-assigned client nobody answered ──────────────────────────────────────────────────────

/** How long the new owner has to make first contact before the client moves to someone else */
export const REASSIGN_AFTER_MS = 15 * 60 * 1000;
/** A client moves at most once this way: after that the managers' escalation takes over */
export const MAX_AUTO_REASSIGNS = 1;

const ms = (v) => (typeof v === 'string' ? Date.parse(v) : typeof v === 'number' ? v : 0) || 0;

/**
 * True for a client the system gave to someone, who is still new and untouched after the reply target:
 * not by hand (a manager's choice is never undone), not archived, nobody has called, messaged or logged anything.
 */
export function needsReassign(lead, now = Date.now(), { afterMs = REASSIGN_AFTER_MS } = {}) {
  if (!lead || lead.isArchived || !lead.autoAssigned || !lead.ownerUid) return false;
  if (lead.status && lead.status !== 'new') return false;
  if (lead.firstContactedAt || lead.lastContactedAt || (Array.isArray(lead.outcomes) && lead.outcomes.length)) return false;
  if ((lead.autoReassignCount || 0) >= MAX_AUTO_REASSIGNS) return false;
  const since = Math.max(ms(lead.assignedAt), ms(lead.claimedAt));
  return Boolean(since) && now - since >= afterMs;
}

/** The person to move the client to: the same rule as the first assignment, never the current owner. null when nobody else is available */
export function chooseReplacement(lead, sellers = [], counts = {}, teams = []) {
  return chooseSeller(lead, sellers.filter((m) => m.uid !== lead.ownerUid), counts, teams);
}

/** The lead fields for the move, with a history line saying why */
export function reassignFields(member, lead, nowIso = new Date().toISOString()) {
  const fields = ownerFields(member, lead, nowIso);
  const from = lead.ownerName || lead.claimedBy || '';
  const line = `تحويل تلقائي${from ? ` من ${from}` : ''} إلى ${fields.ownerName}: مفيش رد خلال ${Math.round(REASSIGN_AFTER_MS / 60000)} دقيقة`;
  return {
    ...fields,
    autoReassignCount: (lead.autoReassignCount || 0) + 1,
    autoReassignedFrom: lead.ownerUid,
    autoReassignedAt: nowIso,
    lastActivityAt: nowIso,
    activityLogs: [{ timestamp: nowIso, action: line, kind: 'assign', agent: 'النظام' }, ...(Array.isArray(lead.activityLogs) ? lead.activityLogs : [])].slice(0, 100)
  };
}
