#!/usr/bin/env node
// =============================================================
//  1Line CRM — one-time move of client contacts out of lead documents
//
//  Leads saved before lead_contacts existed carry phone / whatsapp / email / altPhone on the
//  lead itself, where every CRM role (viewer, finance, property_manager) can read them.
//  This copies those fields into lead_contacts/{leadId} (with the lead's desk in assignedTo)
//  and deletes them from the lead. Safe to re-run: leads without inline contacts are skipped.
//  Managers' CRM sessions also do this for the newest leads they load; this script covers all.
//
//  Setup: same as scripts/set-crm-role.mjs (firebase-admin + ./service-account.json).
//
//  Usage:
//    node scripts/migrate-lead-contacts.mjs            dry run — counts what would move
//    node scripts/migrate-lead-contacts.mjs --apply    move them
// =============================================================

import fs from 'node:fs';
import path from 'node:path';

// Keep in sync with LEAD_CONTACT_FIELDS in src/firebaseService.js and contactFields() in firestore.rules
const CONTACT_FIELDS = ['phone', 'whatsapp', 'email', 'altPhone'];
const apply = process.argv.includes('--apply');

let admin;
try {
  admin = (await import('firebase-admin')).default;
} catch {
  console.error('firebase-admin is not installed. Run: npm i -D firebase-admin');
  process.exit(1);
}

const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || path.resolve('service-account.json');
if (!fs.existsSync(keyPath)) {
  console.error(`Service account key not found at ${keyPath}\nFirebase console → Project settings → Service accounts → Generate new private key.`);
  process.exit(1);
}
admin.initializeApp({ credential: admin.credential.cert(JSON.parse(fs.readFileSync(keyPath, 'utf8'))) });
const db = admin.firestore();
const { FieldValue } = admin.firestore;

let scanned = 0;
let toMove = 0;
let batch = db.batch();
let inBatch = 0;
const flush = async () => {
  if (inBatch > 0 && apply) await batch.commit();
  batch = db.batch();
  inBatch = 0;
};

let last = null;
for (;;) {
  let q = db.collection('leads').orderBy(admin.firestore.FieldPath.documentId()).limit(300);
  if (last) q = q.startAfter(last);
  const page = await q.get();
  if (page.empty) break;
  for (const snap of page.docs) {
    scanned++;
    const data = snap.data();
    const inline = CONTACT_FIELDS.filter((f) => f in data);
    if (inline.length === 0) continue;
    toMove++;
    const contact = { assignedTo: data.assignedTo || 'Unassigned' };
    for (const f of inline) if (data[f] !== null && data[f] !== '') contact[f] = String(data[f]);
    batch.set(db.collection('lead_contacts').doc(snap.id), contact, { merge: true });
    batch.update(snap.ref, Object.fromEntries(inline.map((f) => [f, FieldValue.delete()])));
    inBatch += 2;
    if (inBatch >= 400) await flush();
  }
  last = page.docs[page.docs.length - 1];
}
await flush();

console.log(`${scanned} leads scanned, ${toMove} with inline contacts ${apply ? 'moved to lead_contacts' : 'would be moved (dry run — add --apply)'}.`);
process.exit(0);
