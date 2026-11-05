// Release-readiness checks on firestore.rules: what an anonymous visitor and each staff role can
// reach, with the focus on client phones, other desks, money and server-only collections.
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { doc, getDoc, getDocs, setDoc, updateDoc, collection, query, limit } from 'firebase/firestore';
import fs from 'node:fs';
import { test, before, after, beforeEach } from 'node:test';

let env;

before(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-release-audit',
    firestore: { rules: fs.readFileSync(new URL('../../firestore.rules', import.meta.url), 'utf8') }
  });
});
after(() => env.cleanup());

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'leads/a1'), { name: 'عميل اختبار أ', status: 'new', assignedTo: 'Sales Team A', type: 'buyer' });
    await setDoc(doc(db, 'lead_contacts/a1'), { phone: '01000000001', assignedTo: 'Sales Team A' });
    await setDoc(doc(db, 'leads/b1'), { name: 'عميل اختبار ب', status: 'new', assignedTo: 'Sales Team B', type: 'buyer' });
    await setDoc(doc(db, 'lead_contacts/b1'), { phone: '01000000002', assignedTo: 'Sales Team B' });
    await setDoc(doc(db, 'audit_logs/l1'), { action: 'x' });
    await setDoc(doc(db, 'notify_log/leads__a1'), { kind: 'leads' });
    await setDoc(doc(db, 'analytics_daily/2026-10-13_0'), { batches: 1 });
    await setDoc(doc(db, 'settings/areas_cms'), { areas: [] });
    await setDoc(doc(db, 'properties/p1'), { title_ar: 'عقار', status: 'published' });
    await setDoc(doc(db, 'commission_invoices/i1'), { amount: 100 });
  });
});

const guest = () => env.unauthenticatedContext().firestore();
const staff = (role, extra = {}) => env.authenticatedContext(`u-${role}`, { role, staff: true, ...extra }).firestore();

test('a visitor cannot read or list leads, phones, logs, analytics or the alert log', async () => {
  const db = guest();
  for (const path of ['leads/a1', 'lead_contacts/a1', 'audit_logs/l1', 'notify_log/leads__a1', 'analytics_daily/2026-10-13_0', 'commission_invoices/i1']) {
    await assertFails(getDoc(doc(db, path)));
  }
  await assertFails(getDocs(query(collection(db, 'leads'), limit(5))));
  await assertFails(getDocs(query(collection(db, 'lead_contacts'), limit(5))));
});

test('a visitor cannot change an existing lead, a listing or site settings', async () => {
  const db = guest();
  await assertFails(updateDoc(doc(db, 'leads/a1'), { status: 'closed' }));
  await assertFails(setDoc(doc(db, 'properties/p1'), { title_ar: 'x', status: 'published' }));
  await assertFails(setDoc(doc(db, 'settings/areas_cms'), { areas: [] }));
});

test('a visitor cannot file a new lead straight into a later stage', async () => {
  const db = guest();
  await assertFails(setDoc(doc(db, 'leads/x1'), { name: 'عميل اختبار', phone: '01000000003', status: 'closed' }));
  await assertSucceeds(setDoc(doc(db, 'leads/x2'), { name: 'عميل اختبار', phone: '01000000003', status: 'new' }));
});

test('read-only and non-sales roles never read client phones', async () => {
  for (const role of ['viewer', 'property_manager', 'finance']) {
    await assertFails(getDoc(doc(staff(role), 'lead_contacts/a1')));
  }
});

test('a desk agent reads its own desk only, phones included', async () => {
  const east = staff('agent_east');
  await assertSucceeds(getDoc(doc(east, 'leads/a1')));
  await assertSucceeds(getDoc(doc(east, 'lead_contacts/a1')));
  await assertFails(getDoc(doc(east, 'leads/b1')));
  await assertFails(getDoc(doc(east, 'lead_contacts/b1')));
});

test('a desk agent cannot move a lead to another desk', async () => {
  await assertFails(updateDoc(doc(staff('agent_east'), 'leads/a1'), { assignedTo: 'Sales Team B' }));
});

test('commission invoices are for finance and the admin only', async () => {
  await assertSucceeds(getDoc(doc(staff('finance'), 'commission_invoices/i1')));
  for (const role of ['viewer', 'sales_manager', 'agent_east']) {
    await assertFails(getDoc(doc(staff(role), 'commission_invoices/i1')));
  }
});
