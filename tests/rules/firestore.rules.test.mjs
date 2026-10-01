// Firestore security rules tests. Needs the Firestore emulator (Java 11+):
//   npm run test:rules
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, deleteDoc, collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import fs from 'node:fs';
import { test, before, after, beforeEach } from 'node:test';

const ADMIN_UID = 'dB6GM2RoPQRE0iksDnqcdvUKgXy2';
let env;

before(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-1line-rules',
    firestore: { rules: fs.readFileSync(new URL('../../firestore.rules', import.meta.url), 'utf8') }
  });
});
after(() => env.cleanup());

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'leads/a'), { name: 'A', phone: '01000000001', assignedTo: 'Sales Team A', createdAt: 1 });
    await setDoc(doc(db, 'leads/b'), { name: 'B', phone: '01000000002', assignedTo: 'Sales Team B', createdAt: 2 });
    await setDoc(doc(db, 'leads/u'), { name: 'U', phone: '01000000003', assignedTo: 'Unassigned', createdAt: 3 });
    await setDoc(doc(db, 'leads/v'), { name: 'V', phone: '01000000004', assignedTo: 'Dr. Mahmoud Elbaz', createdAt: 4 });
    await setDoc(doc(db, 'demands/p1'), { name: 'X', phone: '01000000005', status: 'published', text_ar: 't' });
    await setDoc(doc(db, 'deals/a'), { assignedTo: 'Sales Team A', stage: 'proposal' });
    await setDoc(doc(db, 'deals/b'), { assignedTo: 'Sales Team B', stage: 'proposal' });
  });
});

const as = (role) => env.authenticatedContext(`u-${role}`, { role }).firestore();
const guest = () => env.unauthenticatedContext().firestore();

// ── Leads ────────────────────────────────────────────────────────────────
test('leads: desk agent reads own desk + pool only', async () => {
  const east = as('agent_east');
  await assertSucceeds(getDoc(doc(east, 'leads/a')));
  await assertSucceeds(getDoc(doc(east, 'leads/u')));
  await assertFails(getDoc(doc(east, 'leads/b')));
  await assertFails(getDoc(doc(east, 'leads/v')));
  await assertFails(getDoc(doc(as('sales_agent'), 'leads/a')));
});

test('leads: unfiltered list denied to agents, queue query allowed', async () => {
  const east = as('agent_east');
  await assertFails(getDocs(collection(east, 'leads')));
  const q = query(collection(east, 'leads'), where('assignedTo', 'in', ['Sales Team A', 'Unassigned']), orderBy('createdAt', 'desc'));
  const r = await assertSucceeds(getDocs(q));
  if (r.size !== 2) throw new Error(`expected 2 leads, got ${r.size}`);
});

test('leads: agents claim pool leads but cannot move leads to other desks', async () => {
  const east = as('agent_east');
  await assertSucceeds(setDoc(doc(east, 'leads/u'), { assignedTo: 'Sales Team A' }, { merge: true }));
  await assertFails(setDoc(doc(east, 'leads/a'), { assignedTo: 'Sales Team B' }, { merge: true }));
  await assertSucceeds(setDoc(doc(east, 'leads/a'), { status: 'contacted' }, { merge: true }));
  await assertFails(setDoc(doc(east, 'leads/b'), { status: 'contacted' }, { merge: true }));
});

test('leads: managers, read-only roles and admins', async () => {
  await assertSucceeds(getDocs(collection(as('sales_manager'), 'leads')));
  await assertSucceeds(setDoc(doc(as('sales_manager'), 'leads/b'), { assignedTo: 'Sales Team A' }, { merge: true }));
  await assertSucceeds(getDocs(collection(as('viewer'), 'leads')));
  await assertFails(setDoc(doc(as('viewer'), 'leads/b'), { status: 'x' }, { merge: true }));
  await assertSucceeds(getDocs(collection(as('admin'), 'leads')));
  await assertSucceeds(getDocs(collection(env.authenticatedContext(ADMIN_UID, {}).firestore(), 'leads')));
  await assertFails(getDocs(collection(as('some_unknown_role'), 'leads')));
});

test('leads: guests create only', async () => {
  await assertFails(getDoc(doc(guest(), 'leads/a')));
  await assertSucceeds(setDoc(doc(guest(), 'leads/new1'), { name: 'Guest', phone: '01000000009', status: 'new' }));
  await assertFails(setDoc(doc(guest(), 'leads/new2'), { name: 'Guest', phone: '01000000009', status: 'won' }));
});

// ── Demands ──────────────────────────────────────────────────────────────
test('demands: contact-bearing docs are staff-only, even when published', async () => {
  await assertFails(getDoc(doc(guest(), 'demands/p1')));
  await assertFails(getDocs(query(collection(guest(), 'demands'), where('status', '==', 'published'))));
  await assertSucceeds(getDoc(doc(as('viewer'), 'demands/p1')));
  await assertSucceeds(setDoc(doc(guest(), 'demands/new1'), { name: 'Buyer', phone: '01000000002', status: 'pending' }));
  await assertFails(setDoc(doc(guest(), 'demands/new2'), { name: 'Buyer', phone: '01000000002', status: 'published' }));
});

test('public_demands: public read, editors write contact-free published copies', async () => {
  const pm = as('property_manager');
  await assertSucceeds(setDoc(doc(pm, 'public_demands/p1'), { text_ar: 't', status: 'published', budget: 1 }));
  await assertFails(setDoc(doc(pm, 'public_demands/p2'), { text_ar: 't', status: 'published', phone: '010' }));
  await assertFails(setDoc(doc(pm, 'public_demands/p3'), { text_ar: 't', status: 'pending' }));
  await assertFails(setDoc(doc(as('sales_agent'), 'public_demands/p4'), { text_ar: 't', status: 'published' }));
  await assertFails(setDoc(doc(guest(), 'public_demands/p5'), { text_ar: 't', status: 'published' }));
  await assertSucceeds(getDocs(collection(guest(), 'public_demands')));
  await assertSucceeds(deleteDoc(doc(pm, 'public_demands/p1')));
});

// ── Deals ────────────────────────────────────────────────────────────────
test('deals: desk scoping', async () => {
  const east = as('agent_east');
  await assertSucceeds(getDoc(doc(east, 'deals/a')));
  await assertFails(getDoc(doc(east, 'deals/b')));
  await assertSucceeds(setDoc(doc(east, 'deals/n'), { assignedTo: 'Sales Team A', stage: 'qualification' }));
  await assertFails(setDoc(doc(east, 'deals/m'), { assignedTo: 'Sales Team B', stage: 'qualification' }));
  await assertSucceeds(getDoc(doc(as('finance'), 'deals/b')));
  await assertSucceeds(setDoc(doc(as('sales_manager'), 'deals/b'), { stage: 'won' }, { merge: true }));
  await assertFails(getDoc(doc(as('property_manager'), 'deals/a')));
});
