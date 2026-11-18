// scripts/rollback-1line-os-migration.mjs
// Rollback script for 1Line OS migration.
// Removes migrated documents from `persons` and `person_contacts` without touching original `leads` or `properties`.
import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  connectFirestoreEmulator,
  collection,
  getDocs,
  doc,
  writeBatch
} from 'firebase/firestore';

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'demo-1line-os';
const EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080';

console.log(`Starting 1Line OS rollback on project ${PROJECT_ID}...`);

const [host, port] = EMULATOR_HOST.split(':');
const app = initializeApp({ projectId: PROJECT_ID });
const db = getFirestore(app);
connectFirestoreEmulator(db, host, Number(port));

async function runRollback() {
  let rolledBackCount = 0;
  const personsSnap = await getDocs(collection(db, 'persons'));
  console.log(`Found ${personsSnap.size} persons to rollback.`);

  const batch = writeBatch(db);
  let batchCount = 0;

  for (const personDoc of personsSnap.docs) {
    const id = personDoc.id;
    batch.delete(doc(db, 'persons', id));
    batch.delete(doc(db, 'person_contacts', id));
    batchCount += 2;
    rolledBackCount++;

    if (batchCount >= 400) {
      await batch.commit();
      batchCount = 0;
    }
  }

  if (batchCount > 0) {
    await batch.commit();
  }

  console.log(`✅ 1Line OS Rollback Complete: ${rolledBackCount} migrated records removed.`);
}

runRollback().catch((err) => {
  console.error('Rollback failed:', err);
  process.exit(1);
});
