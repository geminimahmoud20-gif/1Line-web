#!/usr/bin/env node
// =============================================================
//  Encrypted backup of the whole Firestore database (every collection and sub-collection).
//
//  Usage: BACKUP_PASSPHRASE=… GOOGLE_APPLICATION_CREDENTIALS=key.json \
//           node scripts/backup-firestore.mjs [out-dir]
//  Writes <out-dir>/firestore-<UTC date-time>.1lbk and prints how many documents each collection has.
//  Restore: scripts/restore-firestore.mjs. Daily run: .github/workflows/backup.yml.
//  (needs `npm install --no-save firebase-admin`)
// =============================================================

import fs from 'node:fs';
import path from 'node:path';
import { encrypt, encodeValue, initAdmin, checkPassphrase } from './backup-format.mjs';

const passphrase = process.env.BACKUP_PASSPHRASE;
try { checkPassphrase(passphrase); } catch (e) { console.error(e.message); process.exit(1); }

const outDir = path.resolve(process.argv[2] || 'backups');
const admin = await initAdmin();
const db = admin.firestore();

// { [collectionPath]: [{ id, data }] } — sub-collections appear under their full path
const collections = {};
let total = 0;

async function dumpCollection(ref) {
  const docs = [];
  // Page through so large collections don't load in one request
  let last = null;
  for (;;) {
    let q = ref.orderBy(admin.firestore.FieldPath.documentId()).limit(500);
    if (last) q = q.startAfter(last);
    const snap = await q.get();
    for (const d of snap.docs) {
      docs.push({ id: d.id, data: encodeValue(d.data(), admin) });
      for (const sub of await d.ref.listCollections()) await dumpCollection(sub);
    }
    if (snap.size < 500) break;
    last = snap.docs[snap.docs.length - 1];
  }
  collections[ref.path] = docs;
  total += docs.length;
}

for (const ref of await db.listCollections()) await dumpCollection(ref);

const now = new Date();
const backup = {
  format: 1,
  project: admin.app().options.projectId || process.env.FIREBASE_PROJECT || 'line-c9601',
  createdAt: now.toISOString(),
  collections
};

fs.mkdirSync(outDir, { recursive: true });
const file = path.join(outDir, `firestore-${now.toISOString().replace(/[:.]/g, '-')}.1lbk`);
fs.writeFileSync(file, encrypt(backup, passphrase));

for (const [name, docs] of Object.entries(collections).sort()) console.log(`${String(docs.length).padStart(6)}  ${name}`);
console.log(`✔ ${total} documents in ${Object.keys(collections).length} collections → ${path.relative(process.cwd(), file)} (${(fs.statSync(file).size / 1024).toFixed(1)} KB, encrypted)`);
process.exit(0);
