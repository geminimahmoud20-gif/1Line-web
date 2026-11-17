#!/usr/bin/env node
// =============================================================
//  An auto-assigned client nobody answered in 15 minutes moves once to another salesperson.
//
//    • Off unless settings/automation has reassignUnanswered: true (CRM → الأتمتة).
//    • Only 09:00–21:00 Cairo time (at night nobody is answering, so moving clients would just shuffle them).
//    • Only clients the SYSTEM assigned (autoAssigned: true), still «new», with no contact, call outcome or
//      earlier automatic move (api/_assign-core.js needsReassign). A manager's choice is never undone.
//    • The new person is picked by the same rule as the first assignment, never the current owner.
//    • The move is written on the client's history, in audit_logs, and the follow-up tasks (cad-<id>-n) go to the
//      new owner. Nothing is deleted.
//
//  Usage: GOOGLE_APPLICATION_CREDENTIALS=key.json TZ=Africa/Cairo node scripts/reassign-unanswered.mjs [--dry-run] [--force]
//  Run: .github/workflows/reassign-unanswered.yml  (needs `npm install --no-save firebase-admin`)
// =============================================================

import { initAdmin } from './backup-format.mjs';
import { needsReassign, chooseReplacement, reassignFields, sellersOf, MAX_OPEN_COUNT } from '../api/_assign-core.js';
import { toMember } from '../api/_team-core.js';
import { cadenceTasks, CADENCE_STEPS } from '../src/utils/followUpCadence.js';

const dryRun = process.argv.includes('--dry-run');
const force = process.argv.includes('--force');

const admin = await initAdmin();
const db = admin.firestore();
const now = new Date();
const hour = Number(new Intl.DateTimeFormat('en-GB', { hour: '2-digit', hour12: false, timeZone: 'Africa/Cairo' }).format(now));
if (!force && (hour < 9 || hour >= 21)) {
  console.log(`outside 09:00–21:00 Cairo (${hour}h): nothing moved`);
  process.exit(0);
}
const flags = (await db.doc('settings/automation').get()).data() || {};
if (flags.reassignUnanswered !== true && !force) {
  console.log('reassignUnanswered is off (CRM → الأتمتة): nothing moved');
  process.exit(0);
}

// Clients that are new and were given by the system
const snap = await db.collection('leads').where('status', '==', 'new').where('autoAssigned', '==', true).get();
const nowMs = now.getTime();
const stuck = snap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((l) => needsReassign(l, nowMs));
console.log(`${snap.size} auto-assigned new clients, ${stuck.length} unanswered past 15 minutes`);
if (!stuck.length) process.exit(0);

// The people who can take them (the same list api/assign.js uses)
const access = (await db.doc('settings/access').get()).data();
let config = null;
try { config = access?.json ? JSON.parse(access.json) : null; } catch { config = null; }
const members = [];
let pageToken;
do {
  const page = await admin.auth().listUsers(1000, pageToken);
  for (const u of page.users) {
    members.push(toMember({ localId: u.uid, email: u.email, displayName: u.displayName, disabled: u.disabled, customAttributes: JSON.stringify(u.customClaims || {}) }, config));
  }
  pageToken = page.pageToken;
} while (pageToken);
const sellers = sellersOf(members);
if (sellers.length < 2) {
  console.log('fewer than two salespeople on teams: nothing to move to');
  process.exit(0);
}

// Open clients per person, for the fewest-clients rule
const counts = {};
for (const s of sellers) {
  const rows = await db.collection('leads').where('ownerUid', '==', s.uid).select('status', 'isArchived').limit(MAX_OPEN_COUNT).get();
  counts[s.uid] = rows.docs.filter((d) => !d.data().isArchived && d.data().status !== 'closed' && d.data().status !== 'lost').length;
}

let moved = 0;
for (const lead of stuck) {
  const to = chooseReplacement(lead, sellers, counts, config?.teams || []);
  if (!to) { console.log(`${lead.id}: nobody else to give it to`); continue; }
  const nowIso = now.toISOString();
  const fields = reassignFields(to, lead, nowIso);
  console.log(`${dryRun ? '[dry run] ' : ''}${lead.id}: ${lead.ownerName || lead.ownerUid} → ${fields.ownerName}`);
  if (dryRun) continue;
  // The lead first, guarded by the owner we read: if someone took it meanwhile, nothing is written
  const ref = db.doc(`leads/${lead.id}`);
  const ok = await db.runTransaction(async (tx) => {
    const cur = (await tx.get(ref)).data();
    if (!cur || cur.ownerUid !== lead.ownerUid || cur.firstContactedAt || cur.lastContactedAt) return false;
    tx.update(ref, fields);
    return true;
  });
  if (!ok) { console.log(`${lead.id}: changed meanwhile, left alone`); continue; }
  counts[to.uid] = (counts[to.uid] || 0) + 1;
  counts[lead.ownerUid] = Math.max(0, (counts[lead.ownerUid] || 1) - 1);
  moved += 1;
  // The follow-up tasks go with the client: same ids as api/assign.js, so an open one is re-assigned, a missing one created
  for (const { id, task } of cadenceTasks({ lead, seller: to, now: nowMs })) {
    const tref = db.doc(`crm_tasks/${id}`);
    const cur = await tref.get();
    if (!cur.exists) await tref.set(task);
    else if (cur.data().status === 'open') await tref.update({ assigneeUid: to.uid, assigneeName: String(to.name || '').slice(0, 80), updatedAt: nowIso });
  }
  await db.collection('audit_logs').add({
    actorId: 'system', actorUid: 'system', actorEmail: 'auto-reassign',
    action: 'LEAD_AUTO_REASSIGNED', type: 'LEAD_AUTO_REASSIGNED', actionType: 'LEAD_AUTO_REASSIGNED',
    entityType: 'leads', targetCollection: 'leads', entityId: lead.id, targetId: lead.id,
    createdAt: nowIso, timestamp: now,
    details: { from: lead.ownerUid, to: to.uid, afterMinutes: 15 }
  });
}
console.log(`${moved} client${moved === 1 ? '' : 's'} moved (${CADENCE_STEPS.length} follow-up tasks each)`);
