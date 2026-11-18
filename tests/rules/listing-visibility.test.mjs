// Who reads which listing: a visitor gets only the listings on the site (and only by asking for
// them); hidden, draft and trashed listings, with their exact location and legal file, are staff's.
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { doc, getDoc, getDocs, setDoc, collection, query, where } from 'firebase/firestore';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { test, before, after, beforeEach } from 'node:test';
import { SITE_STATUSES } from '../../api/_catalog-core.js';

let env;

before(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-listing-visibility',
    firestore: { rules: fs.readFileSync(new URL('../../firestore.rules', import.meta.url), 'utf8') }
  });
});
after(() => env.cleanup());

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'properties/live'), { title_ar: 'شقة', status: 'published' });
    await setDoc(doc(db, 'properties/sold'), { title_ar: 'شقة', status: 'sold' });
    await setDoc(doc(db, 'properties/hidden'), { title_ar: 'شقة', status: 'hidden', coordinates: { lat: 26.5, lng: 31.7 } });
    await setDoc(doc(db, 'properties/trash'), { title_ar: 'شقة', status: 'trash' });
    await setDoc(doc(db, 'properties/gone'), { deleted: true });
  });
});

const guest = () => env.unauthenticatedContext().firestore();
const staff = (role) => env.authenticatedContext(`u-${role}`, { role, staff: true }).firestore();
const siteQuery = (db) => query(collection(db, 'properties'), where('status', 'in', SITE_STATUSES));

test('a visitor reads a listing on the site, not a hidden, trashed or removed one', async () => {
  const db = guest();
  await assertSucceeds(getDoc(doc(db, 'properties/live')));
  await assertSucceeds(getDoc(doc(db, 'properties/sold')));
  for (const id of ['hidden', 'trash', 'gone']) await assertFails(getDoc(doc(db, `properties/${id}`)));
});

test('a visitor can list only by asking for the listings on the site', async () => {
  const db = guest();
  await assertFails(getDocs(collection(db, 'properties')));
  const snap = await assertSucceeds(getDocs(siteQuery(db)));
  assert.deepEqual(snap.docs.map((d) => d.id).sort(), ['live', 'sold']);
});

test('staff read every listing, hidden and trashed included', async () => {
  for (const role of ['viewer', 'property_manager', 'agent_east']) {
    const snap = await assertSucceeds(getDocs(collection(staff(role), 'properties')));
    assert.equal(snap.size, 5);
  }
});

test('the rules, the catalog API and the site use one list of on-site statuses', async () => {
  const rules = fs.readFileSync(new URL('../../firestore.rules', import.meta.url), 'utf8');
  for (const s of SITE_STATUSES) assert.ok(rules.includes(`'${s}'`), s);
  const client = fs.readFileSync(new URL('../../src/services/catalog.js', import.meta.url), 'utf8');
  assert.ok(client.includes(`SITE_STATUSES = ${JSON.stringify(SITE_STATUSES).replace(/"/g, "'").replace(/,/g, ', ')}`));
});
