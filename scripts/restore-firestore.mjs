#!/usr/bin/env node
// =============================================================
//  Restore an encrypted backup made by scripts/backup-firestore.mjs.
//
//  Usage: BACKUP_PASSPHRASE=… GOOGLE_APPLICATION_CREDENTIALS=key.json \
//           node scripts/restore-firestore.mjs <file.1lbk> [--only=leads,lead_contacts] [--apply]
//  Without --apply it only decrypts and prints what it would write (nothing changes).
//  With --apply every document in the backup is written back exactly as it was (overwriting the
//  current version of that document). Documents created after the backup are left alone.
//  (needs `npm install --no-save firebase-admin`)
// =============================================================

import fs from 'node:fs';
import { decrypt, decodeValue, initAdmin } from './backup-format.mjs';

const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith('--'));
const apply = args.includes('--apply');
const only = (args.find((a) => a.startsWith('--only=')) || '').slice(7).split(',').filter(Boolean);

if (!file || !fs.existsSync(file)) {
  console.error('Usage: node scripts/restore-firestore.mjs <file.1lbk> [--only=a,b] [--apply]');
  process.exit(1);
}

let backup;
try {
  backup = decrypt(fs.readFileSync(file), process.env.BACKUP_PASSPHRASE);
} catch (e) {
  console.error(`✖ ${e.message}`);
  process.exit(1);
}

const names = Object.keys(backup.collections).filter((n) => only.length === 0 || only.includes(n.split('/')[0]));
console.log(`Backup of ${backup.project} taken ${backup.createdAt}`);
for (const n of names) console.log(`${String(backup.collections[n].length).padStart(6)}  ${n}`);

if (!apply) {
  console.log('Dry run — nothing written. Add --apply to restore these documents.');
  process.exit(0);
}

const admin = await initAdmin();
const db = admin.firestore();
const writer = db.bulkWriter();
let written = 0;
for (const n of names) {
  for (const { id, data } of backup.collections[n]) {
    writer.set(db.collection(n).doc(id), decodeValue(data, admin, db));
    written++;
  }
}
await writer.close();
console.log(`✔ Restored ${written} documents.`);
process.exit(0);
