#!/usr/bin/env node
// =============================================================
//  1Line CRM — Access & Claims Migration Script
//
//  1. Seeds Firestore `settings/access` with DEFAULT_ACCESS if not already created.
//  2. Iterates over all Firebase Auth users with legacy claims (role only)
//     and upgrades them with `{ staff: true, perms: [...], desk: '...' }` claims.
//
//  Usage:
//    node scripts/migrate-access.mjs [--dry-run]
// =============================================================

import fs from 'node:fs';
import path from 'node:path';
import { DEFAULT_ACCESS, normalizeAccess, claimsForMember } from '../src/utils/accessModel.js';

const isDryRun = process.argv.includes('--dry-run');

let admin;
try {
  admin = (await import('firebase-admin')).default;
} catch {
  console.error('firebase-admin is not installed. Run: npm i -D firebase-admin');
  process.exit(1);
}

const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || path.resolve('service-account.json');
if (!fs.existsSync(keyPath)) {
  console.error(`Service account key not found at ${keyPath}\nPlace service-account.json in the project root or set GOOGLE_APPLICATION_CREDENTIALS.`);
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(JSON.parse(fs.readFileSync(keyPath, 'utf8')))
});

const auth = admin.auth();
const db = admin.firestore();

async function runMigration() {
  console.log(`Starting access model migration... ${isDryRun ? '(DRY RUN)' : ''}`);

  // 1. Seed or read settings/access
  const accessRef = db.doc('settings/access');
  const snap = await accessRef.get();
  let config = DEFAULT_ACCESS;

  if (!snap.exists) {
    console.log('Document settings/access does not exist. Seeding default roles & teams...');
    if (!isDryRun) {
      await accessRef.set({ json: JSON.stringify(DEFAULT_ACCESS), updatedAt: new Date().toISOString() });
      console.log('Successfully seeded settings/access in Firestore.');
    } else {
      console.log('[DRY-RUN] Would create settings/access document.');
    }
  } else {
    try {
      const data = snap.data();
      config = normalizeAccess(data?.json || data);
      console.log(`Existing settings/access found with ${config.roles.length} roles and ${config.teams.length} teams.`);
    } catch (err) {
      console.warn('Failed parsing settings/access, using default fallback:', err);
    }
  }

  // 2. Scan and upgrade user claims
  console.log('Scanning Firebase Auth accounts for legacy role claims...');
  let nextPageToken;
  let totalUsers = 0;
  let updatedUsers = 0;

  do {
    const listResult = await auth.listUsers(1000, nextPageToken);
    for (const user of listResult.users) {
      totalUsers++;
      const claims = user.customClaims || {};
      const role = claims.role;

      if (!role) continue; // Not a CRM staff user

      // Check if claims already upgraded
      const isUpgraded = claims.staff === true && Array.isArray(claims.perms) && typeof claims.desk === 'string';
      if (isUpgraded) {
        console.log(`- ${user.email || user.uid}: already upgraded (role=${role}, desk=${claims.desk || 'none'})`);
        continue;
      }

      const desk = claims.desk || '';
      const newClaims = claimsForMember(claims, role, desk, config);
      console.log(`* ${user.email || user.uid}: UPGRADING role=${role} -> perms=${newClaims.perms.length}, staff=true, desk=${newClaims.desk || 'none'}`);

      if (!isDryRun) {
        await auth.setCustomUserClaims(user.uid, newClaims);
        // Also update staff registry record if present
        const staffRef = db.doc(`staff/${user.uid}`);
        const staffSnap = await staffRef.get();
        if (staffSnap.exists) {
          await staffRef.update({
            role: newClaims.role,
            desk: newClaims.desk,
            updatedAt: new Date().toISOString()
          });
        }
      }
      updatedUsers++;
    }
    nextPageToken = listResult.pageToken;
  } while (nextPageToken);

  console.log(`\nMigration completed! Total scanned: ${totalUsers}, Upgraded: ${updatedUsers} accounts.`);
}

runMigration().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
