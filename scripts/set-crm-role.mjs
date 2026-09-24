#!/usr/bin/env node
// =============================================================
//  1Line CRM — staff accounts & roles (Firebase custom claims)
//
//  Roles live in the user's ID token, so neither the browser nor the user can change them.
//  Firestore rules (firestore.rules) and the CRM UI both read the same `role` claim.
//
//  Setup (once):
//    1. npm i -D firebase-admin
//    2. Firebase console → Project settings → Service accounts → Generate new private key
//       Save it as ./service-account.json (git-ignored). Never commit or upload it.
//
//  Usage:
//    node scripts/set-crm-role.mjs <email> <role>     create the account if needed and set its role
//    node scripts/set-crm-role.mjs <email> --remove   revoke CRM access
//    node scripts/set-crm-role.mjs --list             list accounts that have a CRM role
// =============================================================

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

// Keep in sync with CRM_STAFF_ROLES in src/firebaseService.js and firestore.rules
const ROLES = {
  super_admin: 'المدير العام — كل الصلاحيات',
  sales_manager: 'مدير المبيعات — العملاء والطلبات والعقارات',
  sales_agent: 'مستشار مبيعات — متابعة العملاء',
  agent_east: 'فريق شرق والكوثر — متابعة العملاء',
  agent_new_sohag: 'فريق سوهاج الجديدة — متابعة العملاء',
  property_manager: 'مدير العقارات — العقارات والمشروعات والطلبات',
  finance: 'الإدارة المالية — قراءة + الصفقات',
  viewer: 'مراقب — قراءة فقط'
};

const [, , arg1, arg2] = process.argv;
const usage = () => {
  console.log('Usage:\n  node scripts/set-crm-role.mjs <email> <role>\n  node scripts/set-crm-role.mjs <email> --remove\n  node scripts/set-crm-role.mjs --list\n\nRoles:');
  for (const [id, label] of Object.entries(ROLES)) console.log(`  ${id.padEnd(17)} ${label}`);
  process.exit(1);
};
if (!arg1) usage();

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
const auth = admin.auth();

if (arg1 === '--list') {
  let pageToken;
  const rows = [];
  do {
    const page = await auth.listUsers(1000, pageToken);
    for (const u of page.users) {
      const role = u.customClaims?.role || (u.customClaims?.admin ? 'super_admin' : null);
      if (role) rows.push(`${role.padEnd(17)} ${u.email || u.uid}${u.disabled ? '  (disabled)' : ''}`);
    }
    pageToken = page.pageToken;
  } while (pageToken);
  console.log(rows.length ? rows.join('\n') : 'No accounts with a CRM role.');
  process.exit(0);
}

const email = arg1.trim().toLowerCase();
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) usage();

let user;
try {
  user = await auth.getUserByEmail(email);
} catch (err) {
  if (err.code !== 'auth/user-not-found' || arg2 === '--remove') throw err;
  // New staff member: random password nobody knows; they set their own via the reset link.
  user = await auth.createUser({ email, password: crypto.randomBytes(24).toString('base64url'), emailVerified: false });
  console.log(`Created account ${email}`);
}

if (arg2 === '--remove') {
  const { role, admin: _admin, ...rest } = user.customClaims || {};
  await auth.setCustomUserClaims(user.uid, rest);
  await auth.revokeRefreshTokens(user.uid);
  console.log(`CRM access removed for ${email} (was: ${role || 'none'}). Active sessions were signed out.`);
  process.exit(0);
}

if (!ROLES[arg2]) usage();
await auth.setCustomUserClaims(user.uid, { ...(user.customClaims || {}), role: arg2, admin: arg2 === 'super_admin' });
// Claims only reach the browser on the next token refresh — force it by ending current sessions.
await auth.revokeRefreshTokens(user.uid);
console.log(`${email} → ${arg2} (${ROLES[arg2]})`);

// Never signed in (new account) → they need a link to set their own password
if (!user.metadata.lastSignInTime) {
  const link = await auth.generatePasswordResetLink(email);
  console.log(`\nSend this one-time link to the staff member so they set their own password:\n${link}`);
}
process.exit(0);
