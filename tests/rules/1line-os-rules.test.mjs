// tests/rules/1line-os-rules.test.mjs
// Rules tests for 1Line OS Enterprise Collections: Persons, Search Requests, Nominations, Tasks, Developers, and Financials.
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import fs from 'node:fs';
import { test, before, after, beforeEach } from 'node:test';

let env;
const PROJECT_ID = 'demo-1line-os-rules';

before(async () => {
  env = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: { rules: fs.readFileSync(new URL('../../firestore.rules', import.meta.url), 'utf8') }
  });
});

after(() => env.cleanup());

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    // Seed Person and Contact
    await setDoc(doc(db, 'persons/p-a'), { name: 'المشتري أ', assignedTo: 'Sales Team A', status: 'new' });
    await setDoc(doc(db, 'person_contacts/p-a'), { phone: '01011111111', assignedTo: 'Sales Team A' });

    await setDoc(doc(db, 'persons/p-b'), { name: 'المشتري ب', assignedTo: 'Sales Team B', status: 'new' });
    await setDoc(doc(db, 'person_contacts/p-b'), { phone: '01022222222', assignedTo: 'Sales Team B' });

    // Seed Properties
    await setDoc(doc(db, 'properties/prop-1'), { title: 'شقة بالكوثر', grade: 'A', status: 'available' });

    // Seed Developer
    await setDoc(doc(db, 'developers/dev-1'), { name: 'مطور العاصمة', totalScore: 4.2, status: 'trial_6m' });

    // Seed Search Request
    await setDoc(doc(db, 'search_requests/sr-1'), { personId: 'p-a', status: 'open' });

    // Seed Nomination
    await setDoc(doc(db, 'nominations/nom-1'), { personId: 'p-a', propertyId: 'prop-1', role: 'closest' });

    // Seed Task
    await setDoc(doc(db, 'tasks/t-1'), { name: 'طلب بحث موجّه', status: 'pending' });

    // Seed Invoice
    await setDoc(doc(db, 'commission_invoices/inv-1'), { amount: 50000, status: 'pending' });
  });
});

const asAdmin = () => env.authenticatedContext('u-admin', { role: 'super_admin', admin: true }).firestore();
const asSalesManager = () => env.authenticatedContext('u-mgr', { role: 'sales_manager' }).firestore();
const asAgentEast = () => env.authenticatedContext('u-agent-a', { role: 'agent_east', desk: 'Sales Team A' }).firestore();
const asPropertyManager = () => env.authenticatedContext('u-pm', { role: 'property_manager' }).firestore();
const asFinance = () => env.authenticatedContext('u-fin', { role: 'finance' }).firestore();
const asViewer = () => env.authenticatedContext('u-view', { role: 'viewer' }).firestore();
const asGuest = () => env.unauthenticatedContext().firestore();

test('1line-os: persons and person_contacts respect desk scoping and PII masking', async () => {
  const agentA = asAgentEast();
  // Own desk: allowed
  await assertSucceeds(getDoc(doc(agentA, 'persons/p-a')));
  await assertSucceeds(getDoc(doc(agentA, 'person_contacts/p-a')));
  // Other desk: strictly denied
  await assertFails(getDoc(doc(agentA, 'persons/p-b')));
  await assertFails(getDoc(doc(agentA, 'person_contacts/p-b')));

  // Read-only / finance roles: see person metadata, but contacts are strictly blocked
  await assertSucceeds(getDoc(doc(asViewer(), 'persons/p-a')));
  await assertFails(getDoc(doc(asViewer(), 'person_contacts/p-a')));
  await assertFails(getDoc(doc(asFinance(), 'person_contacts/p-a')));
  await assertFails(getDoc(doc(asPropertyManager(), 'person_contacts/p-a')));
});

test('1line-os: DEF-09 fix verified — sales_manager can no longer edit properties without inv.edit', async () => {
  const mgr = asSalesManager();
  // Manager reads properties
  await assertSucceeds(getDoc(doc(mgr, 'properties/prop-1')));
  // Editing property is now DENIED because inv.edit was removed from default sales_manager!
  await assertFails(setDoc(doc(mgr, 'properties/prop-1'), { price: 999999 }, { merge: true }));
  // Property manager can edit properties
  await assertSucceeds(setDoc(doc(asPropertyManager(), 'properties/prop-1'), { price: 2500000 }, { merge: true }));
});

test('1line-os: search_requests, nominations, and tasks are accessible to staff only', async () => {
  const agentA = asAgentEast();
  // Staff can read and update
  await assertSucceeds(getDoc(doc(agentA, 'search_requests/sr-1')));
  await assertSucceeds(getDoc(doc(agentA, 'nominations/nom-1')));
  await assertSucceeds(getDoc(doc(agentA, 'tasks/t-1')));
  await assertSucceeds(setDoc(doc(agentA, 'tasks/t-1'), { status: 'completed' }, { merge: true }));

  // Unauthenticated guests are denied
  await assertFails(getDoc(doc(asGuest(), 'search_requests/sr-1')));
  await assertFails(getDoc(doc(asGuest(), 'nominations/nom-1')));
  await assertFails(getDoc(doc(asGuest(), 'tasks/t-1')));
});

test('1line-os: developers can be read by staff, managed by property manager / admin, denied to guests', async () => {
  await assertSucceeds(getDoc(doc(asAgentEast(), 'developers/dev-1')));
  await assertSucceeds(setDoc(doc(asPropertyManager(), 'developers/dev-2'), { name: 'مطور جديد', totalScore: 3.8 }));
  await assertFails(setDoc(doc(asGuest(), 'developers/dev-3'), { name: 'مطور وهمي' }));
});

test('1line-os: commission_invoices and collections are strictly finance and admin only', async () => {
  const fin = asFinance();
  const agentA = asAgentEast();
  // Finance reads and creates
  await assertSucceeds(getDoc(doc(fin, 'commission_invoices/inv-1')));
  await assertSucceeds(setDoc(doc(fin, 'commission_invoices/inv-2'), { amount: 30000, status: 'pending' }));
  // Sales agents are blocked from creating or modifying invoices
  await assertFails(setDoc(doc(agentA, 'commission_invoices/inv-1'), { amount: 0 }, { merge: true }));
  await assertFails(deleteDoc(doc(agentA, 'commission_invoices/inv-1')));
});
