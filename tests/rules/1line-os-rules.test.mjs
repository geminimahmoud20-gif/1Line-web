// tests/rules/1line-os-rules.test.mjs
// Rules tests for 1Line OS Enterprise Collections: Persons, Search Requests, Nominations, Tasks, Developers, Financials, Complaints, and Referrals.
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

    // Seed Tasks (Team A task and Team B task)
    await setDoc(doc(db, 'tasks/t-1'), {
      name: 'طلب بحث موجّه',
      status: 'pending',
      assignedTo: 'Sales Team A',
      assignedDesk: 'Sales Team A',
      createdBy: 'u-admin',
      createdAt: '2026-10-13T10:00:00Z'
    });
    await setDoc(doc(db, 'tasks/t-2'), {
      name: 'مهمة فريق ب',
      status: 'pending',
      assignedTo: 'Sales Team B',
      assignedDesk: 'Sales Team B',
      createdBy: 'u-admin',
      createdAt: '2026-10-13T10:00:00Z'
    });

    // Seed Invoice and Collection
    await setDoc(doc(db, 'commission_invoices/inv-1'), { amount: 50000, status: 'pending' });
    await setDoc(doc(db, 'collections/col-1'), { amount: 25000, status: 'collected' });
  });
});

const asAdmin = () => env.authenticatedContext('u-admin', { role: 'super_admin', admin: true }).firestore();
const asSalesManager = () => env.authenticatedContext('u-mgr', { role: 'sales_manager' }).firestore();
const asAgentEast = () => env.authenticatedContext('u-agent-a', { role: 'agent_east', desk: 'Sales Team A' }).firestore();
const asPropertyManager = () => env.authenticatedContext('u-pm', { role: 'property_manager' }).firestore();
const asFinance = () => env.authenticatedContext('u-fin', { role: 'finance' }).firestore();
const asViewer = () => env.authenticatedContext('u-view', { role: 'viewer' }).firestore();
const asGuest = () => env.unauthenticatedContext().firestore();

test('1line-os: persons and person_contacts respect desk scoping, ld.phone enforcement, and PII masking', async () => {
  const agentA = asAgentEast();
  // Own desk: allowed
  await assertSucceeds(getDoc(doc(agentA, 'persons/p-a')));
  await assertSucceeds(getDoc(doc(agentA, 'person_contacts/p-a')));
  // Other desk: agent_east is strictly blocked from reading contact in another desk
  await assertFails(getDoc(doc(agentA, 'persons/p-b')));
  await assertFails(getDoc(doc(agentA, 'person_contacts/p-b')));

  // agent_east cannot create person contact for a person in another desk
  await assertFails(setDoc(doc(agentA, 'person_contacts/p-b'), { phone: '01099999999', assignedTo: 'Sales Team A' }));
  await assertFails(setDoc(doc(agentA, 'person_contacts/p-b'), { phone: '01099999999', assignedTo: 'Sales Team B' }));

  // Read-only / finance / pm roles: see person metadata, but contacts are strictly blocked (no ld.phone)
  await assertSucceeds(getDoc(doc(asViewer(), 'persons/p-a')));
  await assertFails(getDoc(doc(asViewer(), 'person_contacts/p-a')));
  await assertFails(getDoc(doc(asFinance(), 'person_contacts/p-a')));
  await assertFails(getDoc(doc(asPropertyManager(), 'person_contacts/p-a')));
});

test('1line-os: sales_manager has inv.edit restored pending owner decision', async () => {
  const mgr = asSalesManager();
  // Manager reads properties
  await assertSucceeds(getDoc(doc(mgr, 'properties/prop-1')));
  // Manager can edit property because inv.edit was restored
  await assertSucceeds(setDoc(doc(mgr, 'properties/prop-1'), { price: 999999 }, { merge: true }));
  // Property manager can also edit properties
  await assertSucceeds(setDoc(doc(asPropertyManager(), 'properties/prop-1'), { price: 2500000 }, { merge: true }));
});

test('1line-os: tasks access scoping, editor restriction, and createdBy/createdAt immutability', async () => {
  const agentA = asAgentEast();
  const viewer = asViewer();

  // Viewer is strictly DENIED from creating or updating tasks
  await assertFails(setDoc(doc(viewer, 'tasks/t-viewer'), { name: 'مهمة المشاهد', status: 'pending' }));
  await assertFails(setDoc(doc(viewer, 'tasks/t-1'), { status: 'completed' }, { merge: true }));

  // Employee can update their own team's assigned task
  await assertSucceeds(setDoc(doc(agentA, 'tasks/t-1'), { status: 'completed' }, { merge: true }));

  // Employee CANNOT update task assigned to another team
  await assertFails(setDoc(doc(agentA, 'tasks/t-2'), { status: 'completed' }, { merge: true }));

  // No one can alter createdBy or createdAt after creation
  await assertFails(setDoc(doc(agentA, 'tasks/t-1'), { createdBy: 'u-hacker' }, { merge: true }));
  await assertFails(setDoc(doc(agentA, 'tasks/t-1'), { createdAt: '2026-10-13T12:00:00Z' }, { merge: true }));
});

test('1line-os: complaints and referrals are editor-only and immutable for provenance', async () => {
  const agentA = asAgentEast();
  const viewer = asViewer();

  // Viewer cannot create complaints or referrals
  await assertFails(setDoc(doc(viewer, 'complaints/comp-1'), { title: 'شكوى المشاهد' }));
  await assertFails(setDoc(doc(viewer, 'referrals/ref-1'), { name: 'إحالة المشاهد' }));

  // Editor can create complaints and referrals
  await assertSucceeds(setDoc(doc(agentA, 'complaints/comp-1'), { title: 'شكوى عميل', createdBy: 'u-agent-a', createdAt: '2026-10-13' }));
  await assertSucceeds(setDoc(doc(agentA, 'referrals/ref-1'), { name: 'إحالة وسيط', createdBy: 'u-agent-a', createdAt: '2026-10-13' }));

  // Provenance keys cannot be changed
  await assertFails(setDoc(doc(agentA, 'complaints/comp-1'), { createdBy: 'u-other' }, { merge: true }));
  await assertFails(setDoc(doc(agentA, 'referrals/ref-1'), { createdAt: '2026-10-14' }, { merge: true }));
});

test('1line-os: search_requests, nominations, and developers are protected', async () => {
  const agentA = asAgentEast();

  await assertSucceeds(getDoc(doc(agentA, 'search_requests/sr-1')));
  await assertSucceeds(getDoc(doc(agentA, 'nominations/nom-1')));
  await assertSucceeds(getDoc(doc(agentA, 'developers/dev-1')));

  // Unauthenticated guests are denied
  await assertFails(getDoc(doc(asGuest(), 'search_requests/sr-1')));
  await assertFails(getDoc(doc(asGuest(), 'nominations/nom-1')));
  await assertFails(getDoc(doc(asGuest(), 'developers/dev-1')));
});

test('1line-os: commission_invoices and collections are strictly finance and admin only', async () => {
  const fin = asFinance();
  const viewer = asViewer();
  const mgr = asSalesManager();
  const agentA = asAgentEast();

  // Finance reads invoice and collection
  await assertSucceeds(getDoc(doc(fin, 'commission_invoices/inv-1')));
  await assertSucceeds(getDoc(doc(fin, 'collections/col-1')));
  await assertSucceeds(setDoc(doc(fin, 'commission_invoices/inv-2'), { amount: 30000, status: 'pending' }));
  await assertSucceeds(setDoc(doc(fin, 'collections/col-2'), { amount: 30000, status: 'collected' }));

  // Viewer is strictly DENIED from reading invoices or collections
  await assertFails(getDoc(doc(viewer, 'commission_invoices/inv-1')));
  await assertFails(getDoc(doc(viewer, 'collections/col-1')));

  // Sales manager is strictly DENIED from reading invoices or collections
  await assertFails(getDoc(doc(mgr, 'commission_invoices/inv-1')));
  await assertFails(getDoc(doc(mgr, 'collections/col-1')));

  // Sales agents are blocked from reading or writing invoices
  await assertFails(getDoc(doc(agentA, 'commission_invoices/inv-1')));
  await assertFails(setDoc(doc(agentA, 'commission_invoices/inv-1'), { amount: 0 }, { merge: true }));
  await assertFails(deleteDoc(doc(agentA, 'commission_invoices/inv-1')));
});
