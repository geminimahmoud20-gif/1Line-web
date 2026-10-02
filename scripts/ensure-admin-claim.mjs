#!/usr/bin/env node
// =============================================================
//  Give the owner account the super_admin custom claim, so admin access comes from the ID token
//  like every other CRM role instead of a user ID written into the rules and the code.
//
//  Keeps the account's other claims and does NOT sign it out: the browser picks the claim up on
//  its next token refresh (at most an hour, or right away on the next sign-in).
//
//  Usage: ADMIN_UID=<uid> GOOGLE_APPLICATION_CREDENTIALS=key.json node scripts/ensure-admin-claim.mjs
//         (needs `npm install --no-save firebase-admin`). Used by .github/workflows/firebase-deploy.yml.
// =============================================================

import fs from 'node:fs';
import path from 'node:path';

const uid = (process.env.ADMIN_UID || '').trim();
if (!/^[A-Za-z0-9]{20,128}$/.test(uid)) {
  console.error('Set ADMIN_UID to the owner account\'s Firebase user ID.');
  process.exit(1);
}

let admin;
try {
  admin = (await import('firebase-admin')).default;
} catch {
  console.error('firebase-admin is not installed. Run: npm install --no-save firebase-admin');
  process.exit(1);
}
const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || path.resolve('service-account.json');
if (!fs.existsSync(keyPath)) {
  console.error(`Service account key not found at ${keyPath}`);
  process.exit(1);
}
admin.initializeApp({ credential: admin.credential.cert(JSON.parse(fs.readFileSync(keyPath, 'utf8'))) });
const auth = admin.auth();

// Logs may be public: show only enough of the email to recognise it
const mask = (email) => (email ? email.replace(/^(.{2}).*(@.*)$/, '$1***$2') : '(no email)');

const user = await auth.getUser(uid);
const claims = user.customClaims || {};
if (user.disabled) {
  console.error(`Account ${mask(user.email)} is disabled — not granting admin.`);
  process.exit(1);
}
if (claims.role === 'super_admin' && claims.admin === true) {
  console.log(`✔ ${mask(user.email)} already has role=super_admin`);
  process.exit(0);
}

await auth.setCustomUserClaims(uid, { ...claims, role: 'super_admin', admin: true });
const after = (await auth.getUser(uid)).customClaims || {};
if (after.role !== 'super_admin' || after.admin !== true) {
  console.error('Claim did not stick:', JSON.stringify(after));
  process.exit(1);
}
console.log(`✔ ${mask(user.email)} → role=super_admin (was: ${claims.role || 'none'})`);
process.exit(0);
