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
