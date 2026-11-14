#!/usr/bin/env node
// =============================================================
//  Phone notifications for team @mentions (Web Push): someone wrote «@name» in the team chat or in the notes
//  of a client, listing or project (crm_mentions), the person has not read it yet and has a phone subscribed
//  (push_subscriptions/{uid}, the same devices and key pair as the hourly follow-up reminders). One message per
//  person per run, sent 08:00–23:00 Cairo time; a mention is marked `pushedAt` so it is never sent twice, and
//  one that is over 18 hours old is left alone. Dead subscriptions (404/410) are removed.
//
//  Usage: GOOGLE_APPLICATION_CREDENTIALS=key.json TZ=Africa/Cairo node scripts/send-mention-pushes.mjs [--dry-run] [--force]
//  Every 10 minutes: .github/workflows/mention-pushes.yml  (needs `npm install --no-save firebase-admin web-push`)
// =============================================================

import { initAdmin } from './backup-format.mjs';
import { pushPlan, LOOKBACK_MS } from '../src/utils/mentionPush.js';

const dryRun = process.argv.includes('--dry-run');
const force = process.argv.includes('--force');
const SUBJECT = 'https://www.1lineestate.com';

const now = new Date();
const hour = Number(new Intl.DateTimeFormat('en-GB', { hour: '2-digit', hour12: false, timeZone: 'Africa/Cairo' }).format(now));
if (!force && (hour < 8 || hour >= 23)) {
  console.log(`outside 08:00–23:00 Cairo (${hour}h): nothing sent`);
  process.exit(0);
}

const admin = await initAdmin();
const db = admin.firestore();

const since = new Date(now.getTime() - LOOKBACK_MS).toISOString();
const snap = await db.collection('crm_mentions').where('createdAt', '>=', since).get();
const mentions = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
const plan = pushPlan(mentions, { now: now.getTime() });
if (!plan.length) {
  console.log(`${mentions.length} recent mentions: nothing to send`);
  process.exit(0);
}

let webpush;
try {
  webpush = (await import('web-push')).default;
} catch {
  throw new Error('web-push is not installed. Run: npm install --no-save web-push');
}
const vapid = (await db.doc('push_private/vapid').get()).data();
if (!vapid?.privateKey || !vapid?.publicKey) {
  console.log('the push key pair does not exist yet (run the follow-up reminders workflow once): nothing sent');
  process.exit(0);
}
webpush.setVapidDetails(SUBJECT, vapid.publicKey, vapid.privateKey);

let sent = 0;
for (const p of plan) {
  const ref = db.doc(`push_subscriptions/${p.toUid}`);
  const data = (await ref.get()).data();
  const subs = Array.isArray(data?.subs) ? data.subs : [];
  if (!subs.length) continue; // no phone: the in-app bell is enough, and it stays unmarked in case they subscribe later
  if (dryRun) { console.log(`[dry run] ${data?.name || p.toUid}: ${p.title} — ${p.body}`); continue; }
  const payload = JSON.stringify({ title: p.title, body: p.body, url: p.url, leadId: p.leadId, tag: p.tag });
  const alive = [];
  let delivered = 0;
  for (const sub of subs) {
    try {
      await webpush.sendNotification(sub, payload, { TTL: 6 * 3600 });
      alive.push(sub);
      delivered += 1;
    } catch (err) {
      if (err.statusCode === 404 || err.statusCode === 410) continue; // the device unsubscribed
      alive.push(sub);
      console.error(`push failed (${err.statusCode || err.message}) for ${p.toUid}`);
    }
  }
  if (alive.length !== subs.length) await ref.update({ subs: alive });
  if (delivered) {
    const at = now.toISOString();
    const batch = db.batch();
    for (const id of p.ids) batch.update(db.doc(`crm_mentions/${id}`), { pushedAt: at });
    await batch.commit();
    sent += 1;
  }
}
console.log(`${sent} phone notification${sent === 1 ? '' : 's'} sent`);
