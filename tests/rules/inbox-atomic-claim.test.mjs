// tests/rules/inbox-atomic-claim.test.mjs
// Test: Concurrent atomic claim transactions on Firestore emulator
// Requirement: "على الـ emulator، استلامان متزامنان، واحد فقط ينجح" & "الاستلام ≠ تواصل"
import { initializeTestEnvironment, assertSucceeds } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import fs from 'node:fs';
import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { claimLeadAtomic } from '../../src/services/leads.js';

let env;
const PROJECT_ID = 'demo-1line-inbox-claim';

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
    // Seed an unassigned incoming lead
    await setDoc(doc(db, 'leads/lead-unassigned-1'), {
      name: 'أحمد علي',
      status: 'new',
      assignedTo: 'Unassigned',
      createdAt: new Date().toISOString()
    });
  });
});

const asMgr1 = () => env.authenticatedContext('u-mgr-1', { role: 'sales_manager' }).firestore();
const asMgr2 = () => env.authenticatedContext('u-mgr-2', { role: 'sales_manager' }).firestore();

test('inbox-claim: concurrent atomic claims on the emulator allow exactly one winner and preserve status', async () => {
  const db1 = asMgr1();
  const db2 = asMgr2();

  // Two staff members attempt to claim the exact same unassigned lead concurrently using real claimLeadAtomic
  const [res1, res2] = await Promise.all([
    claimLeadAtomic('lead-unassigned-1', 'عمر السوهاجي', { db: db1 }),
    claimLeadAtomic('lead-unassigned-1', 'محمود المصري', { db: db2 })
  ]);

  const successCount = (res1.ok ? 1 : 0) + (res2.ok ? 1 : 0);
  const failureCount = (!res1.ok ? 1 : 0) + (!res2.ok ? 1 : 0);

  // Exactly one claim transaction must succeed
  assert.equal(successCount, 1, 'Exactly one concurrent claim must succeed');
  assert.equal(failureCount, 1, 'The competing claim must fail');

  const failedResult = res1.ok ? res2 : res1;
  const winningResult = res1.ok ? res1 : res2;

  assert.equal(failedResult.reason, 'already_claimed');
  assert.equal(failedResult.claimedBy, winningResult.staffName);

  // Verify final document state in Firestore
  const adminDb = env.authenticatedContext('u-admin', { role: 'super_admin', admin: true }).firestore();
  const finalDoc = await assertSucceeds(getDoc(doc(adminDb, 'leads/lead-unassigned-1')));
  const finalData = finalDoc.data();

  // Claimed assignee must be the winner
  assert.equal(finalData.assignedTo, winningResult.staffName);
  assert.ok(finalData.assignedAt, 'assignedAt timestamp must be recorded');

  // CRITICAL REQUIREMENT 2: الاستلام ≠ تواصل (Status must REMAIN 'new', NOT changed to 'contacted')
  assert.equal(finalData.status, 'new', 'Status must stay "new" upon claiming; status changes only upon actual contact');
});
