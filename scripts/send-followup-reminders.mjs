#!/usr/bin/env node
// =============================================================
//  Hourly phone reminders for the sales team (Web Push): one short message per person who has
//  clients waiting past the reply target or follow-ups due today / late (src/utils/reminderDigest.js).
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
import { localDayKey } from '../src/utils/crmLeadViews.js';

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
if (!force && (hour < 9 || hour >= 21)) {
  console.log(`outside 09:00–21:00 Cairo (${hour}h): nothing sent`);
  process.exit(0);
}

const subscribers = (await db.collection('push_subscriptions').get()).docs.filter((d) => Array.isArray(d.data().subs) && d.data().subs.length);
if (!subscribers.length) {
  console.log('no devices subscribed yet');
  process.exit(0);
}

// ── The leads that can matter ──
const today = localDayKey(now);
const [due, fresh] = await Promise.all([
  db.collection('leads').where('nextFollowUpAt', '<=', `${today}`).get(),
  db.collection('leads').where('status', '==', 'new').get()
]);
const byId = new Map();
for (const d of [...due.docs, ...fresh.docs]) byId.set(d.id, { id: d.id, ...d.data() });
const leads = [...byId.values()];
console.log(`${leads.length} leads checked, ${subscribers.length} people with phones`);

let sent = 0;
for (const doc of subscribers) {
  const data = doc.data();
  const member = { uid: doc.id, name: data.name || '', manager: Boolean(data.manager) };
  const digest = digestFor(leads, member, { now: now.getTime() });
  if (!force && !shouldSend(digest, data.lastDigest, now.getTime())) continue;
  if (!digest) continue;
  const payload = JSON.stringify({ title: digest.title, body: digest.body, url: '/crm?tab=leads' });
  if (dryRun) { console.log(`[dry run] ${member.name || doc.id}: ${digest.body}`); continue; }
  const alive = [];
  let delivered = 0;
  for (const sub of data.subs) {
    try {
      await webpush.sendNotification(sub, payload, { TTL: 3600 });
      alive.push(sub);
      delivered += 1;
    } catch (err) {
      if (err.statusCode === 404 || err.statusCode === 410) continue; // the device unsubscribed
      alive.push(sub);
      console.error(`push failed (${err.statusCode || err.message}) for ${doc.id}`);
    }
  }
  const patch = { subs: alive };
  if (delivered) { patch.lastDigest = { sig: digest.sig, at: now.toISOString() }; sent += 1; }
  await doc.ref.update(patch);
}
console.log(`${sent} reminder${sent === 1 ? '' : 's'} sent`);
