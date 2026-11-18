#!/usr/bin/env node
// =============================================================
//  Hourly phone reminders for the sales team (Web Push): one short message per person who has
//  clients waiting past the reply target, follow-ups due today / late and tasks (crm_tasks) due today or late
//  (src/utils/reminderDigest.js).
//
//    • The first run creates the push key pair: the private half in push_private/vapid (no client
//      can read it), the public half in settings/push for the CRM to subscribe devices with.
//    • Sends only 09:00–21:00 Cairo time, and only when the digest changed or the last one is over
//      4 hours old. Dead subscriptions (404/410) are removed.
//    • Reads only the leads that matter (follow-up due by today, and clients still «new»), so an
//      hourly run stays far inside the free plan's daily reads.
//
//  Usage: GOOGLE_APPLICATION_CREDENTIALS=key.json TZ=Africa/Cairo node scripts/send-followup-reminders.mjs [--dry-run] [--force]
//  Hourly run: .github/workflows/followup-reminders.yml  (needs `npm install --no-save firebase-admin web-push`)
// =============================================================

import { initAdmin } from './backup-format.mjs';
import { digestFor, shouldSend } from '../src/utils/reminderDigest.js';
import { dueSoonFor, taskAlertPayload } from '../src/utils/nextStep.js';
import { localDayKey } from '../src/utils/crmLeadViews.js';
import { assignmentPayload } from '../src/utils/tasks.js';

const dryRun = process.argv.includes('--dry-run');
const force = process.argv.includes('--force');
const SUBJECT = 'https://www.1lineestate.com';

const admin = await initAdmin();
const db = admin.firestore();
let webpush;
try {
  webpush = (await import('web-push')).default;
} catch {
  throw new Error('web-push is not installed. Run: npm install --no-save web-push');
}

// ── The key pair, created once ──
let vapid = (await db.doc('push_private/vapid').get()).data();
if (!vapid?.privateKey || !vapid?.publicKey) {
  const keys = webpush.generateVAPIDKeys();
  vapid = { publicKey: keys.publicKey, privateKey: keys.privateKey, createdAt: new Date().toISOString() };
  if (!dryRun) {
    await db.doc('push_private/vapid').set(vapid);
    await db.doc('settings/push').set({ vapidPublicKey: vapid.publicKey, updatedAt: vapid.createdAt });
  }
  console.log(`push keys ${dryRun ? 'would be ' : ''}created`);
} else {
  const published = (await db.doc('settings/push').get()).data();
  if (published?.vapidPublicKey !== vapid.publicKey && !dryRun) {
    await db.doc('settings/push').set({ vapidPublicKey: vapid.publicKey, updatedAt: new Date().toISOString() });
    console.log('public key republished');
  }
}
webpush.setVapidDetails(SUBJECT, vapid.publicKey, vapid.privateKey);

// ── Working hours (Cairo) ──
const now = new Date();
const hour = Number(new Intl.DateTimeFormat('en-GB', { hour: '2-digit', hour12: false, timeZone: 'Africa/Cairo' }).format(now));
// The digest goes out 09:00–21:00; a task's own alert may come from 07:00 (a viewing at 08:00 reminds at 07:00)
const digestHours = force || (hour >= 9 && hour < 21);
const alertHours = force || (hour >= 7 && hour < 22);
if (!digestHours && !alertHours) {
  console.log(`outside working hours in Cairo (${hour}h): nothing sent`);
  process.exit(0);
}

const subscribers = (await db.collection('push_subscriptions').get()).docs.filter((d) => Array.isArray(d.data().subs) && d.data().subs.length);
if (!subscribers.length) {
  console.log('no devices subscribed yet');
  process.exit(0);
}

// ── What can matter ──
// The job runs every 15 minutes: a timed task is announced shortly before it is due, and the digest of waiting
// clients still goes out about once an hour (shouldSend's minimum gap).
const today = localDayKey(now);
const nowMs = now.getTime();
const taskSnap = await db.collection('crm_tasks').where('status', '==', 'open').get();
const tasks = taskSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
let leads = [];
if (digestHours) {
  const [due, fresh] = await Promise.all([
    db.collection('leads').where('nextFollowUpAt', '<=', `${today}`).get(),
    db.collection('leads').where('status', '==', 'new').get()
  ]);
  const byId = new Map();
  for (const d of [...due.docs, ...fresh.docs]) byId.set(d.id, { id: d.id, ...d.data() });
  leads = [...byId.values()];
}
console.log(`${leads.length} leads and ${tasks.length} open tasks checked, ${subscribers.length} people with phones`);

/** Sends one payload to every device of a person; resolves { alive, delivered } (dead subscriptions are dropped) */
async function pushTo(id, subs, message) {
  const body = JSON.stringify(message);
  const alive = [];
  let delivered = 0;
  for (const sub of subs) {
    try {
      await webpush.sendNotification(sub, body, { TTL: 3600 });
      alive.push(sub);
      delivered += 1;
    } catch (err) {
      if (err.statusCode === 404 || err.statusCode === 410) continue; // the device unsubscribed
      alive.push(sub);
      console.error(`push failed (${err.statusCode || err.message}) for ${id}`);
    }
  }
  return { alive, delivered };
}

const openIds = new Set(tasks.map((t) => t.id));
let sent = 0;
for (const doc of subscribers) {
  const data = doc.data();
  const member = { uid: doc.id, name: data.name || '', manager: Boolean(data.manager) };
  let subs = data.subs;
  const patch = {};

  // 1. The digest
  if (digestHours) {
    const digest = digestFor(leads, member, { now: nowMs, tasks });
    if (digest && (force || shouldSend(digest, data.lastDigest, nowMs, { minGapMs: 55 * 60 * 1000 }))) {
      if (dryRun) console.log(`[dry run] ${member.name || doc.id}: ${digest.body}`);
      else {
        const r = await pushTo(doc.id, subs, { title: digest.title, body: digest.body, url: '/crm?tab=leads' });
        subs = r.alive;
        if (r.delivered) { patch.lastDigest = { sig: digest.sig, at: now.toISOString() }; sent += 1; }
      }
    }
  }

  // 2. Timed tasks that are about to be due (each due value is announced once). What was announced is kept in
  // push_state/{uid}, a collection no client can read or write, so no security rule has to know about it.
  if (alertHours && tasks.some((t) => t.assigneeUid === doc.id && String(t.dueAt || '').length > 10)) {
    const stateRef = db.doc(`push_state/${doc.id}`);
    const alerted = { ...((await stateRef.get()).data()?.taskAlerts || {}) };
    let changed = false;
    for (const t of dueSoonFor(tasks, doc.id, nowMs, alerted).slice(0, 3)) {
      if (dryRun) { console.log(`[dry run] ${member.name || doc.id}: ${taskAlertPayload(t).title}`); continue; }
      const r = await pushTo(doc.id, subs, taskAlertPayload(t));
      subs = r.alive;
      if (r.delivered) { alerted[t.id] = t.dueAt; changed = true; sent += 1; }
    }
    for (const id of Object.keys(alerted)) if (!openIds.has(id)) { delete alerted[id]; changed = true; }
    if (changed && !dryRun) await stateRef.set({ taskAlerts: alerted, updatedAt: now.toISOString() }, { merge: true });
  }

  // 3. A colleague gave this person a task and they have not opened it: told once, within 15 minutes of it being given
  const given = alertHours ? tasks.filter((t) => t.assigneeUid === doc.id && t.createdBy && t.createdBy !== doc.id && !t.seenAt) : [];
  if (given.length) {
    const stateRef = db.doc(`push_state/${doc.id}`);
    const announced = { ...((await stateRef.get()).data()?.taskAssigned || {}) };
    let changed = false;
    for (const t of given.filter((x) => !announced[x.id]).slice(0, 3)) {
      if (dryRun) { console.log(`[dry run] ${member.name || doc.id}: ${assignmentPayload(t).title}`); continue; }
      const r = await pushTo(doc.id, subs, assignmentPayload(t));
      subs = r.alive;
      if (r.delivered) { announced[t.id] = true; changed = true; sent += 1; }
    }
    for (const id of Object.keys(announced)) if (!openIds.has(id)) { delete announced[id]; changed = true; }
    if (changed && !dryRun) await stateRef.set({ taskAssigned: announced }, { merge: true });
  }

  if (!dryRun && (subs.length !== data.subs.length || Object.keys(patch).length)) await doc.ref.update({ subs, ...patch });
}
console.log(`${sent} reminder${sent === 1 ? '' : 's'} sent`);
