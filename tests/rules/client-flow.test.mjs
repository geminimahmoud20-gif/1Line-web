// The real client service (src/firebaseService.js) against the Firestore + Auth emulators:
// the batches it sends must pass firestore.rules, and each role must get the right merged list.
//   npm run test:rules
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { connectFirestoreEmulator, doc, getDoc } from 'firebase/firestore';
import { connectAuthEmulator, signInWithCustomToken, signOut } from 'firebase/auth';

globalThis.localStorage ??= (() => {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) };
})();

const { db, auth } = await import('../../src/firebase.js');
connectFirestoreEmulator(db, '127.0.0.1', 8080);
connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
const svc = await import('../../src/firebaseService.js');

const PROJECT = 'line-c9601'; // the app's own project id; only the local emulator is touched
let env;
before(async () => {
  env = await initializeTestEnvironment({ projectId: PROJECT, firestore: { rules: fs.readFileSync(new URL('../../firestore.rules', import.meta.url), 'utf8'), host: '127.0.0.1', port: 8080 } });
  await env.clearFirestore();
});
after(async () => { await signOut(auth); await env.cleanup(); setTimeout(() => process.exit(0), 100); });

// The Auth emulator accepts unsigned custom tokens
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const signInAs = async (uid, claims) => {
  await signOut(auth);
  const token = `${b64({ alg: 'none', typ: 'JWT' })}.${b64({
    iss: 'test', sub: 'test', aud: 'https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit',
    iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 3600, uid, claims
  })}.`;
  await signInWithCustomToken(auth, token);
};
const raw = async (path) => {
  let data;
  await env.withSecurityRulesDisabled(async (ctx) => { const s = await getDoc(doc(ctx.firestore(), path)); data = s.exists() ? s.data() : null; });
  return data;
};
const nextLeads = (pred) => new Promise((resolve, reject) => {
  const timer = setTimeout(() => { unsub(); reject(new Error('timed out waiting for leads')); }, 8000);
  const unsub = svc.subscribeToLeads((leads, meta) => {
    if (meta?.fromCache || meta?.signedOut || !pred(leads)) return;
    clearTimeout(timer); unsub(); resolve(leads);
  });
});

test('a visitor\'s lead is stored without contacts, which go to lead_contacts', async () => {
  await signOut(auth);
  const saved = await svc.saveLead({ id: 'lead-flow-1', name: 'زائر', phone: '+201012345678', whatsapp: '+201012345678', email: '', status: 'new', assignedTo: 'Sales Team A', notes: 'x' });
  assert.equal(saved.id, 'lead-flow-1');
  const lead = await raw('leads/lead-flow-1');
  const contact = await raw('lead_contacts/lead-flow-1');
  assert.ok(lead, 'lead saved');
  assert.equal(lead.phone, undefined);
  assert.equal(contact.phone, '+201012345678');
  assert.equal(contact.assignedTo, 'Sales Team A');
  await svc.saveLead({ id: 'lead-flow-2', name: 'آخر', phone: '+201099999999', status: 'new', assignedTo: 'Sales Team B' });
});

test('a desk agent gets their lead with its phone merged in, and not the other desk\'s', async () => {
  await signInAs('agent-east-1', { role: 'agent_east' });
  const leads = await nextLeads((l) => l.some((x) => x.id === 'lead-flow-1' && x.phone));
  assert.equal(leads.find((x) => x.id === 'lead-flow-1').phone, '+201012345678');
  assert.equal(leads.some((x) => x.id === 'lead-flow-2'), false);
});

test('a viewer lists leads but receives no phones', async () => {
  await signInAs('viewer-1', { role: 'viewer' });
  const leads = await nextLeads((l) => l.length >= 2);
  assert.ok(leads.every((x) => !x.phone), 'viewer got a phone');
});

test('a manager moves a lead to another desk; the contact follows', async () => {
  await signInAs('manager-1', { role: 'sales_manager' });
  assert.equal(await svc.updateLeadField('lead-flow-1', { assignedTo: 'Sales Team B' }), true);
  assert.equal((await raw('lead_contacts/lead-flow-1')).assignedTo, 'Sales Team B');
  assert.equal(await svc.updateLeadField('lead-flow-1', { whatsapp: '+201000000001', status: 'contacted' }), true);
  assert.equal((await raw('lead_contacts/lead-flow-1')).whatsapp, '+201000000001');
  assert.equal((await raw('leads/lead-flow-1')).whatsapp, undefined);
});

test('a manager session migrates an inline (legacy) phone', async () => {
  await env.withSecurityRulesDisabled(async (ctx) => {
    const { setDoc } = await import('firebase/firestore');
    await setDoc(doc(ctx.firestore(), 'leads/legacy-1'), { name: 'قديم', phone: '+201055555555', assignedTo: 'Unassigned', createdAt: 1 });
  });
  await signInAs('manager-1', { role: 'sales_manager' });
  const moved = await svc.migrateInlineLeadContacts([{ id: 'legacy-1', _inlineContact: true }]);
  assert.equal(moved, 1);
  assert.equal((await raw('leads/legacy-1')).phone, undefined);
  assert.equal((await raw('lead_contacts/legacy-1')).phone, '+201055555555');
});
