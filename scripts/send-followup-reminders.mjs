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
//    • Also tells a salesperson when a listing that just went live fits their buyers (utils/matchAlerts): the new
//      listings (approvedAt since the last run, tracked in push_state/_matching) are scored against the open
//      buyers, and the leads are read only when there is something new. The first run starts from «now».
//
//    • And the other way round: a brand-new buyer lead (createdAt since the last run, tracked in
//      push_state/_buyermatch) that already fits a live listing tells their own salesperson right away — the
//      live catalog is only fetched (from /api/catalog, no extra Firestore reads) when there is a new buyer.
//
//    • Tells the managers once a day when an exclusive agreement is about to end (14, 7, 3 days, and the day it ends;
//      utils/exclusivity), from property_private (only the exclusive listings are read). Remembered in push_state/_exclusive.
//
//    • Tells a salesperson when a client opens a listing link the team sent them (utils/linkTracking → api/link-open.js
//      writes link_opens/{lead__listing}; the opens changed since the last run are read, tracked in push_state/_linkopens).
//
//  Usage: GOOGLE_APPLICATION_CREDENTIALS=key.json TZ=Africa/Cairo node scripts/send-followup-reminders.mjs [--dry-run] [--force]
//  Hourly run: .github/workflows/followup-reminders.yml  (needs `npm install --no-save firebase-admin web-push`)
// =============================================================

import { initAdmin } from './backup-format.mjs';
import { digestFor, shouldSend } from '../src/utils/reminderDigest.js';
import { dueSoonFor, taskAlertPayload } from '../src/utils/nextStep.js';
import { localDayKey } from '../src/utils/crmLeadViews.js';
import { assignmentPayload } from '../src/utils/tasks.js';
import { freshListings, matchAlerts, matchAlertPayload, freshBuyers, buyerMatchAlerts, buyerMatchAlertPayload, OPEN_BUYER_STAGES } from '../src/utils/matchAlerts.js';
import { linkOpenAlerts, linkOpenPayload } from '../src/utils/linkOpenAlerts.js';
import { exclusiveAlerts, exclusiveAlertPayload, cleanExclusive, todayKey } from '../src/utils/exclusivity.js';

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
// The digest goes out about once an hour per person (shouldSend's gap), so the clients are read only when someone
// is due one: this job runs every 15 minutes, and reading every new and due client each time was most of its cost.
const GAP_MS = 55 * 60 * 1000;
const digestDue = force || subscribers.some((d) => {
  const at = Date.parse(d.data().lastDigest?.at || '');
  return !at || nowMs - at >= GAP_MS;
});
if (digestHours && digestDue) {
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

// ── New listings that fit somebody's buyers ──
// push_state/_matching remembers when this last ran and which listings it announced. Properties are read only for
// those approved since then, and the open buyers only when there is a new listing, so a quiet day costs almost nothing.
const matchRef = db.doc('push_state/_matching');
let matchState = null;
let matchFresh = [];
let matchByOwner = new Map();
if (alertHours) {
  matchState = (await matchRef.get()).data() || null;
  const since = matchState?.lastRunAt || now.toISOString(); // the first run starts from now: no backlog blast
  const done = new Set(matchState?.processed || []);
  const newSnap = matchState ? await db.collection('properties').where('approvedAt', '>', since).get() : { docs: [] };
  matchFresh = freshListings(newSnap.docs.map((d) => ({ ...d.data(), id: d.data().id ?? d.id })), since, done);
  if (matchFresh.length) {
    const buyers = (await db.collection('leads').where('status', 'in', OPEN_BUYER_STAGES).get()).docs.map((d) => ({ id: d.id, ...d.data() }));
    matchByOwner = matchAlerts(matchFresh, buyers);
    console.log(`${matchFresh.length} new listing(s) checked against ${buyers.length} open clients: ${matchByOwner.size} salesperson(s) to tell`);
  }
}

// ── The other way round: a brand-new buyer lead that already fits a live listing ──
// push_state/_buyermatch remembers when this last ran; a Firestore range query on createdAt reads only the
// leads created since then (cheap — not the whole open-buyers collection), and the live catalog is fetched
// from /api/catalog (CDN-cached, no extra Firestore reads) only when there is a fresh buyer to check.
const buyerMatchRef = db.doc('push_state/_buyermatch');
let buyerMatchState = null;
let freshB = [];
let buyerMatchByOwner = new Map();
if (alertHours) {
  buyerMatchState = (await buyerMatchRef.get()).data() || null;
  const since = buyerMatchState?.lastRunAt || now.toISOString(); // the first run starts from now: no backlog blast
  const done = new Set(buyerMatchState?.processed || []);
  const newLeadsSnap = buyerMatchState
    ? await db.collection('leads').where('createdAt', '>', admin.firestore.Timestamp.fromDate(new Date(since))).get()
    : { docs: [] };
  freshB = freshBuyers(newLeadsSnap.docs.map((d) => ({ id: d.id, ...d.data() })), done);
  if (freshB.length) {
    let liveProps = [];
    try {
      const res = await fetch(`${SUBJECT}/api/catalog`);
      if (res.ok) { const data = await res.json(); liveProps = Array.isArray(data.properties) ? data.properties : []; }
    } catch (err) { console.error('catalog fetch failed:', err.message); }
    if (liveProps.length) {
      buyerMatchByOwner = buyerMatchAlerts(freshB, liveProps);
      console.log(`${freshB.length} new buyer(s) checked against ${liveProps.length} live listings: ${buyerMatchByOwner.size} salesperson(s) to tell`);
    }
  }
}

// ── Exclusive agreements about to end: the managers are told once a day, once per threshold ──
const exclusiveRef = db.doc('push_state/_exclusive');
const hasManagers = subscribers.some((d) => d.data().manager);
let exclusiveState = null;
let exclusivePayload = null;
let exclusiveNext = null;
let exclusiveDelivered = 0;
if (digestHours && hasManagers) {
  exclusiveState = (await exclusiveRef.get()).data() || {};
  const today = todayKey(nowMs);
  if (force || exclusiveState.day !== today) {
    const snap = await db.collection('property_private').where('exclusive', '==', true).get();
    const entries = new Map(snap.docs.map((d) => [d.id, cleanExclusive(d.data())]));
    const { fresh, next } = exclusiveAlerts(entries, exclusiveState.alerted || {}, today);
    exclusiveNext = { day: today, alerted: next };
    if (fresh.length) {
      const titles = {};
      for (const f of fresh.slice(0, 3)) {
        const p = (await db.doc(`properties/${f.id}`).get()).data();
        titles[f.id] = p?.title_ar || p?.title_en || '';
      }
      exclusivePayload = exclusiveAlertPayload(fresh, titles);
      console.log(`${fresh.length} exclusive agreement(s) to announce`);
    }
  }
}

// ── Clients who opened a listing link the team sent them ──
// Only the link_opens documents changed since the last run are read (first run: from now), then the clients and listings they name.
const linkRef = db.doc('push_state/_linkopens');
let linkState = null;
let linkByOwner = new Map();
let linkNext = null;
let linkAlertCount = 0;
let linkDelivered = 0;
if (alertHours) {
  linkState = (await linkRef.get()).data() || null;
  const since = linkState?.lastRunAt || now.toISOString();
  const snap = linkState ? await db.collection('link_opens').where('lastAt', '>', since).get() : { docs: [] };
  const opens = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  if (opens.length) {
    const leadIds = [...new Set(opens.map((o) => o.leadId))].slice(0, 40);
    const leadMap = new Map();
    for (const id of leadIds) {
      const l = (await db.doc(`leads/${id}`).get()).data();
      if (l) leadMap.set(id, { name: l.name, ownerUid: l.ownerUid, status: l.status, isArchived: l.isArchived });
    }
    const titles = {};
    for (const id of [...new Set(opens.map((o) => o.propertyId))].slice(0, 40)) {
      const p = (await db.doc(`properties/${id}`).get()).data();
      titles[id] = p?.title_ar || p?.title_en || '';
    }
    const res = linkOpenAlerts(opens, leadMap, titles, linkState?.notified || {});
    linkByOwner = res.byOwner;
    linkNext = res.next;
    linkAlertCount = res.byOwner.size;
    console.log(`${opens.length} link open(s) since the last run: ${linkAlertCount} salesperson(s) to tell`);
  }
}

const openIds = new Set(tasks.map((t) => t.id));
let sent = 0;
for (const doc of subscribers) {
  const data = doc.data();
  const member = { uid: doc.id, name: data.name || '', manager: Boolean(data.manager) };
  let subs = data.subs;
  const patch = {};

  // 1. The digest
  if (digestHours && digestDue) {
    const digest = digestFor(leads, member, { now: nowMs, tasks });
    if (digest && (force || shouldSend(digest, data.lastDigest, nowMs, { minGapMs: GAP_MS }))) {
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

  // 4. A listing that just went live fits this person's buyers (one push for everything new in this run)
  const matchPayload = matchAlertPayload(matchByOwner.get(doc.id));
  if (matchPayload) {
    if (dryRun) console.log(`[dry run] ${member.name || doc.id}: ${matchPayload.title} — ${matchPayload.body}`);
    else {
      const r = await pushTo(doc.id, subs, matchPayload);
      subs = r.alive;
      if (r.delivered) sent += 1;
    }
  }

  // 4b. A brand-new buyer lead of theirs already fits a live listing
  const buyerMatchPayload = buyerMatchAlertPayload(buyerMatchByOwner.get(doc.id));
  if (buyerMatchPayload) {
    if (dryRun) console.log(`[dry run] ${member.name || doc.id}: ${buyerMatchPayload.title} — ${buyerMatchPayload.body}`);
    else {
      const r = await pushTo(doc.id, subs, buyerMatchPayload);
      subs = r.alive;
      if (r.delivered) sent += 1;
    }
  }

  // 6. A client opened a listing link this person sent
  const linkPayload = linkOpenPayload(linkByOwner.get(doc.id));
  if (linkPayload) {
    if (dryRun) console.log(`[dry run] ${member.name || doc.id}: ${linkPayload.title} — ${linkPayload.body}`);
    else {
      const r = await pushTo(doc.id, subs, linkPayload);
      subs = r.alive;
      if (r.delivered) { linkDelivered += 1; sent += 1; }
    }
  }

  // 5. An exclusive agreement is about to end (managers only)
  if (exclusivePayload && member.manager) {
    if (dryRun) console.log(`[dry run] ${member.name || doc.id}: ${exclusivePayload.title} — ${exclusivePayload.body}`);
    else {
      const r = await pushTo(doc.id, subs, exclusivePayload);
      subs = r.alive;
      if (r.delivered) { exclusiveDelivered += 1; sent += 1; }
    }
  }

  if (!dryRun && (subs.length !== data.subs.length || Object.keys(patch).length)) await doc.ref.update({ subs, ...patch });
}

// The opens are marked as seen once the people to tell got it (or there was nobody to tell); a failed push is tried again next run
if (!dryRun && alertHours && (linkAlertCount === 0 || linkDelivered > 0)) {
  const notified = Object.fromEntries(Object.entries(linkNext || linkState?.notified || {}).slice(-300));
  await linkRef.set({ lastRunAt: now.toISOString(), notified });
}

// Remembered only once somebody got it (or there was nothing to say), so a failed push is tried again next run
if (!dryRun && exclusiveNext && (!exclusivePayload || exclusiveDelivered > 0)) await exclusiveRef.set(exclusiveNext);

// What was announced is remembered whether or not someone had a phone subscribed: each listing is announced once
if (alertHours && !dryRun) {
  await matchRef.set({
    lastRunAt: now.toISOString(),
    processed: [...(matchState?.processed || []), ...matchFresh.map((p) => String(p.id))].slice(-300)
  });
  await buyerMatchRef.set({
    lastRunAt: now.toISOString(),
    processed: [...(buyerMatchState?.processed || []), ...freshB.map((l) => String(l.id))].slice(-300)
  });
}
console.log(`${sent} reminder${sent === 1 ? '' : 's'} sent`);
