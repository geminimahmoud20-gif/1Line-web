// Firestore security rules tests. Needs the Firestore emulator (Java 11+):
//   npm run test:rules
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, deleteDoc, collection, query, where, orderBy, getDocs, writeBatch, deleteField, documentId } from 'firebase/firestore';
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
    // current format: contacts in lead_contacts
    await setDoc(doc(db, 'leads/c1'), { name: 'C1', assignedTo: 'Sales Team A', createdAt: 5 });
    await setDoc(doc(db, 'lead_contacts/c1'), { phone: '01000000011', assignedTo: 'Sales Team A' });
    await setDoc(doc(db, 'leads/c2'), { name: 'C2', assignedTo: 'Sales Team B', createdAt: 6 });
    await setDoc(doc(db, 'lead_contacts/c2'), { phone: '01000000012', assignedTo: 'Sales Team B' });
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
  if (r.size !== 3) throw new Error(`expected 3 leads, got ${r.size}`);
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

// ── Lead contacts ────────────────────────────────────────────────────────
const newLeadBatch = (db, id, lead, contact) => {
  const b = writeBatch(db);
  b.set(doc(db, 'leads', id), lead);
  b.set(doc(db, 'lead_contacts', id), contact);
  return b.commit();
};

test('contacts: a guest submits lead + contact together; the lead itself carries no phone', async () => {
  const g = guest();
  await assertSucceeds(newLeadBatch(g, 'n1', { name: 'Guest', status: 'new', assignedTo: 'Sales Team A' }, { phone: '01000000020', assignedTo: 'Sales Team A' }));
  // contact desk must mirror the lead's desk
  await assertFails(newLeadBatch(g, 'n2', { name: 'Guest', assignedTo: 'Sales Team A' }, { phone: '01000000020', assignedTo: 'Sales Team B' }));
  // no lead without its contact doc in the new format
  await assertFails(setDoc(doc(g, 'leads/n3'), { name: 'Guest', assignedTo: 'Unassigned' }));
  // only contact fields allowed
  await assertFails(newLeadBatch(g, 'n4', { name: 'Guest', assignedTo: 'Unassigned' }, { phone: '01000000020', assignedTo: 'Unassigned', notes: 'x' }));
  // cannot attach / overwrite a contact of an existing lead
  await assertFails(setDoc(doc(g, 'lead_contacts/a'), { phone: '01099999999', assignedTo: 'Sales Team A' }));
  await assertFails(setDoc(doc(g, 'lead_contacts/c1'), { phone: '01099999999', assignedTo: 'Sales Team A' }));
});

test('contacts: read-only roles never read them; agents only their desk; managers all', async () => {
  for (const role of ['viewer', 'finance', 'property_manager']) {
    await assertFails(getDoc(doc(as(role), 'lead_contacts/c1')));
    await assertFails(getDocs(collection(as(role), 'lead_contacts')));
  }
  const east = as('agent_east');
  await assertSucceeds(getDoc(doc(east, 'lead_contacts/c1')));
  await assertFails(getDoc(doc(east, 'lead_contacts/c2')));
  await assertSucceeds(getDocs(query(collection(east, 'lead_contacts'), where('assignedTo', 'in', ['Sales Team A', 'Unassigned']))));
  await assertFails(getDocs(collection(east, 'lead_contacts')));
  const mgr = as('sales_manager');
  await assertSucceeds(getDocs(query(collection(mgr, 'lead_contacts'), where(documentId(), 'in', ['c1', 'c2']))));
});

test('contacts: a desk change moves the contact doc in the same batch', async () => {
  const mgr = as('sales_manager');
  await assertFails(setDoc(doc(mgr, 'leads/c1'), { assignedTo: 'Sales Team B' }, { merge: true }));
  const b = writeBatch(mgr);
  b.set(doc(mgr, 'leads/c1'), { assignedTo: 'Sales Team B' }, { merge: true });
  b.set(doc(mgr, 'lead_contacts/c1'), { assignedTo: 'Sales Team B' }, { merge: true });
  await assertSucceeds(b.commit());
  // and the old desk loses the phone
  await assertFails(getDoc(doc(as('agent_east'), 'lead_contacts/c1')));
});

test('contacts: agents edit their lead\'s contact, and leads never gain phone fields again', async () => {
  const east = as('agent_east');
  await assertSucceeds(setDoc(doc(east, 'lead_contacts/c1'), { whatsapp: '01000000099', assignedTo: 'Sales Team A' }, { merge: true }));
  await assertFails(setDoc(doc(east, 'lead_contacts/c2'), { whatsapp: '01000000099', assignedTo: 'Sales Team B' }, { merge: true }));
  await assertFails(setDoc(doc(east, 'leads/c1'), { phone: '01000000098' }, { merge: true }));
  await assertFails(setDoc(doc(as('sales_manager'), 'leads/a'), { phone: '01000000097' }, { merge: true }));
  // unchanged legacy phone on an un-migrated lead doesn't block other edits
  await assertSucceeds(setDoc(doc(east, 'leads/a'), { status: 'contacted' }, { merge: true }));
});

test('contacts: a manager migrates an inline phone into lead_contacts', async () => {
  const mgr = as('sales_manager');
  const b = writeBatch(mgr);
  b.set(doc(mgr, 'lead_contacts/a'), { phone: '01000000001', assignedTo: 'Sales Team A' }, { merge: true });
  b.update(doc(mgr, 'leads/a'), { phone: deleteField() });
  await assertSucceeds(b.commit());
  const snap = await getDoc(doc(as('viewer'), 'leads/a'));
  if ('phone' in snap.data()) throw new Error('phone still on the lead');
});

test('contacts: legacy-format submissions from old builds are still accepted', async () => {
  await assertSucceeds(setDoc(doc(guest(), 'leads/old1'), { name: 'Old build', phone: '01000000030', status: 'new' }));
});
