#!/usr/bin/env node
// =============================================================
//  Publish firestore.rules and the composite indexes in firestore.indexes.json with the Admin SDK.
//
//  Same result as `firebase deploy --only firestore`, but needs only the Firebase Admin SDK
//  service account (the CLI also checks that APIs are enabled, which that account may not be
//  allowed to read). Used by .github/workflows/firebase-deploy.yml.
//
//  Usage: GOOGLE_APPLICATION_CREDENTIALS=key.json node scripts/deploy-firestore.mjs
//         (needs `npm install --no-save firebase-admin`)
// =============================================================

import fs from 'node:fs';
import path from 'node:path';

const PROJECT = process.env.FIREBASE_PROJECT || 'line-c9601';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');

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
const credential = admin.credential.cert(JSON.parse(fs.readFileSync(keyPath, 'utf8')));
admin.initializeApp({ credential, projectId: PROJECT });

// ── 1. Rules ─────────────────────────────────────────────────────────────────
const source = fs.readFileSync(path.join(root, 'firestore.rules'), 'utf8');
const ruleset = await admin.securityRules().releaseFirestoreRulesetFromSource(source);
const live = await admin.securityRules().getFirestoreRuleset();
if (live.name !== ruleset.name || live.source[0].content !== source) {
  console.error(`Rules release mismatch: live ruleset ${live.name}, created ${ruleset.name}`);
  process.exit(1);
}
console.log(`✔ Rules published and live (${ruleset.name})`);

// ── 2. Composite indexes ─────────────────────────────────────────────────────
const { access_token: token } = await credential.getAccessToken();
const api = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)`;
const call = async (method, url, body) => {
  const res = await fetch(url, {
    method,
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
};
const sameFields = (a, b) => JSON.stringify(a.map((f) => [f.fieldPath, f.order])) === JSON.stringify(b.map((f) => [f.fieldPath, f.order]));
const describe = (ix) => `${ix.collectionGroup} (${ix.fields.map((f) => `${f.fieldPath} ${f.order === 'DESCENDING' ? '↓' : '↑'}`).join(', ')})`;

const wanted = JSON.parse(fs.readFileSync(path.join(root, 'firestore.indexes.json'), 'utf8')).indexes;
const pending = [];
let skipped = 0;
for (const ix of wanted) {
  const listUrl = `${api}/collectionGroups/${ix.collectionGroup}/indexes`;
  const existing = (await call('GET', listUrl)).json.indexes || [];
  const fields = ix.fields.map(({ fieldPath, order }) => ({ fieldPath, order }));
  // Firestore appends __name__ to stored indexes; compare on the declared fields only
  const match = existing.find((e) => e.queryScope === ix.queryScope && sameFields(e.fields.filter((f) => f.fieldPath !== '__name__'), fields));
  if (match) {
    console.log(`• index ${describe(ix)}: ${match.state}`);
    if (match.state !== 'READY') pending.push({ ix, listUrl, fields });
    continue;
  }
  const { status, json } = await call('POST', listUrl, { queryScope: ix.queryScope, fields });
  if (status === 403) {
    // The Admin SDK account may lack Cloud Datastore Index Admin. The app's queries don't depend on
    // composite indexes, so this is reported, not fatal.
    console.warn(`! index ${describe(ix)}: not created (no permission to manage indexes) — optional`);
    skipped++;
    continue;
  }
  if (status >= 300 && status !== 409) {
    console.error(`✖ index ${describe(ix)}: HTTP ${status} ${json.error?.message || ''}`);
    process.exit(1);
  }
  console.log(`+ index ${describe(ix)}: creating`);
  pending.push({ ix, listUrl, fields });
}

// Wait for indexes this run created
const deadline = Date.now() + 15 * 60 * 1000;
while (pending.length && Date.now() < deadline) {
  await new Promise((r) => setTimeout(r, 15000));
  for (let i = pending.length - 1; i >= 0; i--) {
    const { ix, listUrl, fields } = pending[i];
    const existing = (await call('GET', listUrl)).json.indexes || [];
    const match = existing.find((e) => sameFields(e.fields.filter((f) => f.fieldPath !== '__name__'), fields));
    if (match?.state === 'READY') {
      console.log(`✔ index ${describe(ix)}: READY`);
      pending.splice(i, 1);
    }
  }
}
if (pending.length) {
  console.error(`✖ still building after 15 min: ${pending.map((p) => describe(p.ix)).join('; ')}`);
  process.exit(1);
}
console.log(skipped ? `✔ Done (${skipped} optional index(es) skipped — grant Cloud Datastore Index Admin to create them)` : '✔ All indexes READY');
process.exit(0);
