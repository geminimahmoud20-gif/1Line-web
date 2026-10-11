#!/usr/bin/env node
// =============================================================
//  Deletes raw analytics past their retention (api/_track-core.js RAW_RETENTION_DAYS), in place
//  of Firestore TTL policies, which need a billed (Blaze) project.
//    • analytics_sessions whose expireAt has passed
//    • visitors not seen for the retention period: their raw event batches, then the profile
//  Daily totals (analytics_daily) and per-listing counters (analytics_properties) are kept.
//  Stops after MAX_DELETES so a run never eats the free plan's 20,000 deletes a day.
//
//  Usage: GOOGLE_APPLICATION_CREDENTIALS=key.json node scripts/cleanup-analytics.mjs [--dry-run]
//  Daily run: .github/workflows/analytics-cleanup.yml   (needs `npm install --no-save firebase-admin`)
// =============================================================

import { initAdmin } from './backup-format.mjs';
import { RAW_RETENTION_DAYS } from '../api/_track-core.js';

const MAX_DELETES = Number(process.env.MAX_DELETES) || 5000;
const dryRun = process.argv.includes('--dry-run');
const admin = await initAdmin();
const db = admin.firestore();
const now = new Date();
const cutoff = new Date(now.getTime() - RAW_RETENTION_DAYS * 86_400_000);
let deleted = 0;
const left = () => MAX_DELETES - deleted;

async function deleteDocs(docs) {
  if (!docs.length) return;
  if (!dryRun) {
    const batch = db.batch();
    docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }
  deleted += docs.length;
}

let sessions = 0;
while (left() > 0) {
  const snap = await db.collection('analytics_sessions').where('expireAt', '<', now).limit(Math.min(400, left())).get();
  await deleteDocs(snap.docs);
  sessions += snap.size;
  if (snap.size === 0 || dryRun) break;
}

let visitors = 0;
let batches = 0;
outer: while (left() > 0) {
  const snap = await db.collection('analytics_visitors').where('lastSeenAt', '<', cutoff).limit(50).get();
  if (snap.empty) break;
  for (const visitor of snap.docs) {
    // A visitor's batches go first, so a run cut short never leaves batches without a profile
    for (;;) {
      if (left() <= 0) break outer;
      const page = await visitor.ref.collection('batches').limit(Math.min(400, left())).get();
      await deleteDocs(page.docs);
      batches += page.size;
      if (page.size === 0 || dryRun) break;
    }
    if (left() <= 0) break outer;
    await deleteDocs([visitor]);
    visitors += 1;
  }
  if (dryRun) break;
}

console.log(`${dryRun ? '(dry run) would delete' : 'deleted'}: ${sessions} sessions, ${batches} event batches, ${visitors} inactive visitor profiles (cutoff ${cutoff.toISOString().slice(0, 10)})`);
if (left() <= 0) console.log(`Stopped at the ${MAX_DELETES}-delete limit; the next run continues.`);
process.exit(0);
