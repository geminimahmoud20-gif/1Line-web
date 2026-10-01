#!/usr/bin/env node
// =============================================================
//  1Line CRM — one-time move of client contacts out of CRM documents
//
//  Records saved before the contact split carry the client's phone / whatsapp / email on the
//  record itself, where every CRM role (viewer, finance, property_manager) can read them.
//    leads                                 → lead_contacts/{leadId} (+ the lead's desk in assignedTo)
//    demands, remote_inspections, trade_ins → request_contacts/{kind}__{id}
//  The fields are copied there and deleted from the record. Safe to re-run: records without
//  inline contacts are skipped. Managers' CRM sessions also migrate what they load; this covers all.
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

let batch = db.batch();
let inBatch = 0;
const flush = async () => {
  if (inBatch > 0 && apply) await batch.commit();
  batch = db.batch();
  inBatch = 0;
};

// Keep in sync with REQUEST_CONTACT_FIELDS in src/firebaseService.js
const REQUEST_FIELDS = ['phone', 'whatsapp', 'email'];
const JOBS = [
  { coll: 'leads', fields: CONTACT_FIELDS, target: (id, data) => [db.collection('lead_contacts').doc(id), { assignedTo: data.assignedTo || 'Unassigned' }] },
  ...['demands', 'remote_inspections', 'trade_ins'].map((kind) => ({
    coll: kind, fields: REQUEST_FIELDS, target: (id) => [db.collection('request_contacts').doc(`${kind}__${id}`), { kind, parentId: id }]
  }))
];

let scanned = 0;
let toMove = 0;
for (const job of JOBS) {
  let moved = 0;
  let last = null;
  for (;;) {
    let q = db.collection(job.coll).orderBy(admin.firestore.FieldPath.documentId()).limit(300);
    if (last) q = q.startAfter(last);
    const page = await q.get();
    if (page.empty) break;
    for (const snap of page.docs) {
      scanned++;
      const data = snap.data();
      const inline = job.fields.filter((f) => f in data);
      if (inline.length === 0) continue;
      moved++;
      const [ref, base] = job.target(snap.id, data);
      const contact = { ...base };
      for (const f of inline) if (data[f] !== null && data[f] !== '') contact[f] = String(data[f]);
      batch.set(ref, contact, { merge: true });
      batch.update(snap.ref, Object.fromEntries(inline.map((f) => [f, FieldValue.delete()])));
      inBatch += 2;
      if (inBatch >= 400) await flush();
    }
    last = page.docs[page.docs.length - 1];
  }
  console.log(`${job.coll}: ${moved} with inline contacts`);
  toMove += moved;
}
await flush();

console.log(`${scanned} records scanned, ${toMove} with inline contacts ${apply ? 'moved' : 'would be moved (dry run — add --apply)'}.`);
process.exit(0);
