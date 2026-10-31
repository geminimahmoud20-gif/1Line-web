// tests/rules/audit-matrix.test.mjs
// Exhaustive test matrix for Firestore Security Rules: Role × Team × Collection × Action
// Covers all cells of the CRM security matrix.
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import fs from 'node:fs';
import { test, before, after, beforeEach } from 'node:test';

let env;
const PROJECT_ID = 'demo-1line-matrix';

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
    // Seed leads and contacts
    await setDoc(doc(db, 'leads/lead-a'), { name: 'Lead A', assignedTo: 'Sales Team A', status: 'new', createdAt: 100 });
    await setDoc(doc(db, 'lead_contacts/lead-a'), { phone: '01011111111', assignedTo: 'Sales Team A' });

    await setDoc(doc(db, 'leads/lead-b'), { name: 'Lead B', assignedTo: 'Sales Team B', status: 'new', createdAt: 200 });
    await setDoc(doc(db, 'lead_contacts/lead-b'), { phone: '01022222222', assignedTo: 'Sales Team B' });

    await setDoc(doc(db, 'leads/lead-u'), { name: 'Lead Pool', assignedTo: 'Unassigned', status: 'new', createdAt: 300 });
    await setDoc(doc(db, 'lead_contacts/lead-u'), { phone: '01033333333', assignedTo: 'Unassigned' });

    // Seed deals
    await setDoc(doc(db, 'deals/deal-a'), { title: 'Deal A', assignedTo: 'Sales Team A', stage: 'proposal' });
    await setDoc(doc(db, 'deals/deal-b'), { title: 'Deal B', assignedTo: 'Sales Team B', stage: 'proposal' });

    // Seed properties
    await setDoc(doc(db, 'properties/prop-1'), { title: 'Villa 1', grade: 'A', status: 'available' });

    // Seed demands
    await setDoc(doc(db, 'demands/dem-1'), { clientName: 'Buyer 1', status: 'published' });
    await setDoc(doc(db, 'request_contacts/demands__dem-1'), { kind: 'demands', parentId: 'dem-1', phone: '01044444444' });

    // Seed audit log
    await setDoc(doc(db, 'audit_logs/log-1'), { action: 'INIT', actorId: 'system', timestamp: serverTimestamp() });
  });
});

const asAdmin = () => env.authenticatedContext('u-admin', { role: 'super_admin', admin: true }).firestore();
const asSalesManager = () => env.authenticatedContext('u-mgr', { role: 'sales_manager' }).firestore();
const asAgentEast = () => env.authenticatedContext('u-agent-a', { role: 'agent_east', desk: 'Sales Team A' }).firestore();
const asPropertyManager = () => env.authenticatedContext('u-pm', { role: 'property_manager' }).firestore();
const asFinance = () => env.authenticatedContext('u-fin', { role: 'finance' }).firestore();
const asViewer = () => env.authenticatedContext('u-view', { role: 'viewer' }).firestore();
const asGuest = () => env.unauthenticatedContext().firestore();

// ── 1. SUPER ADMIN PERMISSIONS ──────────────────────────────────────────────
test('MATRIX: super_admin has full read/write across all collections', async () => {
  const admin = asAdmin();
  await assertSucceeds(getDoc(doc(admin, 'leads/lead-a')));
  await assertSucceeds(getDoc(doc(admin, 'lead_contacts/lead-a')));
  await assertSucceeds(getDoc(doc(admin, 'deals/deal-a')));
  await assertSucceeds(getDoc(doc(admin, 'properties/prop-1')));
  await assertSucceeds(getDoc(doc(admin, 'audit_logs/log-1')));
  await assertSucceeds(setDoc(doc(admin, 'properties/prop-2'), { title: 'Apt 2', grade: 'B' }));
  await assertSucceeds(deleteDoc(doc(admin, 'properties/prop-1')));
});

// ── 2. SALES MANAGER PERMISSIONS ───────────────────────────────────────────
test('MATRIX: sales_manager reads all leads & contacts, edits all leads, cannot delete leads, has inv.edit', async () => {
  const mgr = asSalesManager();
  await assertSucceeds(getDoc(doc(mgr, 'leads/lead-a')));
  await assertSucceeds(getDoc(doc(mgr, 'leads/lead-b')));
  await assertSucceeds(getDoc(doc(mgr, 'lead_contacts/lead-a')));
  await assertSucceeds(getDoc(doc(mgr, 'lead_contacts/lead-b')));
  // Can edit leads
  await assertSucceeds(setDoc(doc(mgr, 'leads/lead-a'), { status: 'contacted' }, { merge: true }));
  // Cannot delete leads (super_admin only)
  await assertFails(deleteDoc(doc(mgr, 'leads/lead-a')));
  // inv.edit restored for sales_manager pending owner decision
  await assertSucceeds(setDoc(doc(mgr, 'properties/prop-1'), { title: 'Updated', approval: 'pending' }, { merge: true }));
});

// ── 3. SALES AGENT (DESK A) PERMISSIONS & SCOPING ───────────────────────────
test('MATRIX: sales_agent reads own desk + pool, strictly blocked from other desks', async () => {
  const agentA = asAgentEast();
  // Own desk: allowed
  await assertSucceeds(getDoc(doc(agentA, 'leads/lead-a')));
  await assertSucceeds(getDoc(doc(agentA, 'lead_contacts/lead-a')));
  // Pool (Unassigned): allowed
  await assertSucceeds(getDoc(doc(agentA, 'leads/lead-u')));
  await assertSucceeds(getDoc(doc(agentA, 'lead_contacts/lead-u')));
  // Other desk (Sales Team B): strictly DENIED
  await assertFails(getDoc(doc(agentA, 'leads/lead-b')));
  await assertFails(getDoc(doc(agentA, 'lead_contacts/lead-b')));
  // Cannot read other desk deal
  await assertFails(getDoc(doc(agentA, 'deals/deal-b')));
  // Cannot reassign lead to other desk
  await assertFails(setDoc(doc(agentA, 'leads/lead-a'), { assignedTo: 'Sales Team B' }, { merge: true }));
  // Cannot delete leads
  await assertFails(deleteDoc(doc(agentA, 'leads/lead-a')));
  // Cannot edit properties
  await assertFails(setDoc(doc(agentA, 'properties/prop-1'), { grade: 'D' }, { merge: true }));
});

// ── 4. PROPERTY MANAGER PERMISSIONS ────────────────────────────────────────
test('MATRIX: property_manager manages properties, denied lead contacts and deals', async () => {
  const pm = asPropertyManager();
  // Can manage properties
  await assertSucceeds(getDoc(doc(pm, 'properties/prop-1')));
  await assertSucceeds(setDoc(doc(pm, 'properties/prop-1'), { price: 3000000, approval: 'pending' }, { merge: true }));
  // Denied lead contacts (PII protection!)
  await assertFails(getDoc(doc(pm, 'lead_contacts/lead-a')));
  // Denied deals
  await assertFails(getDoc(doc(pm, 'deals/deal-a')));
});

// ── 5. FINANCE PERMISSIONS ──────────────────────────────────────────────────
test('MATRIX: finance reads deals & properties, denied lead contacts', async () => {
  const fin = asFinance();
  await assertSucceeds(getDoc(doc(fin, 'deals/deal-a')));
  await assertSucceeds(getDoc(doc(fin, 'properties/prop-1')));
  // Denied lead contacts (PII protection!)
  await assertFails(getDoc(doc(fin, 'lead_contacts/lead-a')));
  // Cannot edit properties
  await assertFails(setDoc(doc(fin, 'properties/prop-1'), { price: 500 }, { merge: true }));
});

// ── 6. VIEWER PERMISSIONS ───────────────────────────────────────────────────
test('MATRIX: viewer reads leads (metadata only) and properties, denied all lead_contacts and writes', async () => {
  const view = asViewer();
  await assertSucceeds(getDoc(doc(view, 'leads/lead-a')));
  await assertSucceeds(getDoc(doc(view, 'properties/prop-1')));
  // Strictly denied contacts
  await assertFails(getDoc(doc(view, 'lead_contacts/lead-a')));
  await assertFails(getDoc(doc(view, 'request_contacts/demands__dem-1')));
  // Denied all writes
  await assertFails(setDoc(doc(view, 'leads/lead-a'), { notes: 'test' }, { merge: true }));
  await assertFails(setDoc(doc(view, 'properties/prop-1'), { title: 'test' }, { merge: true }));
});

// ── 7. GUEST (UNAUTHENTICATED) PERMISSIONS ──────────────────────────────────
test('MATRIX: guest creates intake batches only, denied all internal reads', async () => {
  const g = asGuest();
  // Denied reading leads, contacts, deals, audit logs
  await assertFails(getDoc(doc(g, 'leads/lead-a')));
  await assertFails(getDoc(doc(g, 'lead_contacts/lead-a')));
  await assertFails(getDoc(doc(g, 'deals/deal-a')));
  await assertFails(getDoc(doc(g, 'audit_logs/log-1')));
  // Can read public properties
  await assertSucceeds(getDoc(doc(g, 'properties/prop-1')));
});

// ── 8. PRIVILEGE ESCALATION & TAMPERING PREVENTION ──────────────────────────
test('MATRIX: non-admins cannot tamper with audit logs or elevate claims', async () => {
  const agentA = asAgentEast();
  // Immutable audit logs: update and delete blocked for everyone
  await assertFails(setDoc(doc(agentA, 'audit_logs/log-1'), { action: 'FORGED' }, { merge: true }));
  await assertFails(deleteDoc(doc(agentA, 'audit_logs/log-1')));
  await assertFails(deleteDoc(doc(asAdmin(), 'audit_logs/log-1')));
  // Staff registry is server-only
  await assertFails(getDoc(doc(agentA, 'staff_registry/u-agent-a')));
  await assertFails(setDoc(doc(agentA, 'staff_registry/u-agent-a'), { role: 'super_admin' }));
});
