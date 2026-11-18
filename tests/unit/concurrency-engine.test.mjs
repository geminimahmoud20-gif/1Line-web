// tests/unit/concurrency-engine.test.mjs
// Unit tests for 1Line OS Concurrency & Optimistic Locking Engine
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  isLeaseActive,
  acquireEntityLease,
  renewEntityLease,
  releaseEntityLease,
  validateOptimisticUpdate,
  validateAtomicClaim,
  validatePropertyBooking,
  CONCURRENCY_ERRORS
} from '../../src/services/concurrencyEngine.js';

test('concurrency: isLeaseActive validates unexpired vs expired leases', () => {
  const future = new Date(Date.now() + 60000).toISOString();
  const past = new Date(Date.now() - 60000).toISOString();

  assert.equal(isLeaseActive({ expiresAt: future }), true);
  assert.equal(isLeaseActive({ expiresAt: past }), false);
  assert.equal(isLeaseActive(null), false);
  assert.equal(isLeaseActive({}), false);
});

test('concurrency: acquireEntityLease grants lock to first user and blocks competitor until expiry', () => {
  const lead = { id: 'l-1', name: 'عميل سوهاج' };
  const user1 = { uid: 'u-1', name: 'أحمد رضوان', role: 'sales_agent' };
  const user2 = { uid: 'u-2', name: 'محمود المصري', role: 'sales_agent' };

  // User 1 acquires lease
  const res1 = acquireEntityLease(lead, user1, { durationMs: 120000 });
  assert.equal(res1.acquired, true);
  assert.equal(res1.lease.uid, 'u-1');

  const lockedLead = res1.updatedEntity;

  // User 2 attempts to acquire lease while active -> BLOCKED
  const res2 = acquireEntityLease(lockedLead, user2);
  assert.equal(res2.acquired, false);
  assert.equal(res2.reason, CONCURRENCY_ERRORS.ACTIVE_LEASE_HELD);
  assert.equal(res2.heldBy, 'أحمد رضوان');

  // Same user re-acquiring -> SUCCEEDS
  const res1Refresh = acquireEntityLease(lockedLead, user1);
  assert.equal(res1Refresh.acquired, true);

  // Super Admin override -> SUCCEEDS
  const adminUser = { uid: 'u-admin', name: 'د. محمود الباز', role: 'super_admin' };
  const resAdmin = acquireEntityLease(lockedLead, adminUser);
  assert.equal(resAdmin.acquired, true);
  assert.equal(resAdmin.lease.uid, 'u-admin');
});

test('concurrency: renewEntityLease extends expiry for holder and rejects competitor', () => {
  const now = new Date('2026-10-15T12:00:00Z');
  const leadWithLease = {
    id: 'l-1',
    activeEditor: {
      uid: 'u-1',
      name: 'أحمد رضوان',
      lockedAt: now.toISOString(),
      expiresAt: new Date('2026-10-15T12:03:00Z').toISOString()
    }
  };

  const user1 = { uid: 'u-1', name: 'أحمد رضوان' };
  const user2 = { uid: 'u-2', name: 'مستخدم آخر' };

  // Competitor cannot renew
  const competitorRenew = renewEntityLease(leadWithLease, user2, { now });
  assert.equal(competitorRenew.renewed, false);

  // Holder renews successfully
  const holderRenew = renewEntityLease(leadWithLease, user1, { now, durationMs: 180000 });
  assert.equal(holderRenew.renewed, true);
  assert.equal(holderRenew.lease.expiresAt, new Date('2026-10-15T12:03:00Z').toISOString());
});

test('concurrency: releaseEntityLease clears activeEditor', () => {
  const lead = {
    id: 'l-1',
    activeEditor: { uid: 'u-1', name: 'أحمد رضوان', expiresAt: new Date(Date.now() + 60000).toISOString() }
  };

  // Competitor cannot release
  const compRelease = releaseEntityLease(lead, { uid: 'u-2', role: 'sales_agent' });
  assert.equal(compRelease.released, false);

  // Holder can release
  const holderRelease = releaseEntityLease(lead, { uid: 'u-1', role: 'sales_agent' });
  assert.equal(holderRelease.released, true);
  assert.equal(holderRelease.updatedEntity.activeEditor, null);
});

test('concurrency: validateOptimisticUpdate enforces version matching and detects stale overwrites', () => {
  const currentLead = {
    id: 'l-1',
    name: 'عميل تجريبي',
    status: 'new',
    version: 3,
    lastEditedBy: 'أحمد رضوان'
  };

  // Stale update (expected version 2, current is 3) -> CONFLICT
  const staleRes = validateOptimisticUpdate(
    currentLead,
    { status: 'qualified' },
    2,
    { uid: 'u-2', name: 'محمود المصري' }
  );
  assert.equal(staleRes.success, false);
  assert.equal(staleRes.conflict, true);
  assert.equal(staleRes.reason, CONCURRENCY_ERRORS.VERSION_CONFLICT);
  assert.equal(staleRes.currentVersion, 3);
  assert.ok(staleRes.message_ar.includes('تم تعديل هذا السجل بواسطة زميل آخر'));

  // Fresh update (expected version 3, current is 3) -> SUCCEEDS and bumps to 4
  const freshRes = validateOptimisticUpdate(
    currentLead,
    { status: 'qualified', notes: 'تم استكمال التأهيل' },
    3,
    { uid: 'u-1', name: 'أحمد رضوان' }
  );
  assert.equal(freshRes.success, true);
  assert.equal(freshRes.conflict, false);
  assert.equal(freshRes.nextVersion, 4);
  assert.equal(freshRes.updatedEntity.version, 4);
  assert.equal(freshRes.updatedEntity.status, 'qualified');
  assert.equal(freshRes.updatedEntity.lastEditedBy, 'أحمد رضوان');
});

test('concurrency: validateAtomicClaim rejects competitor and preserves status "new" (الاستلام ≠ تواصل)', () => {
  const unassignedLead = {
    id: 'l-inbox',
    name: 'طلب وارد جديد',
    status: 'new',
    assignedTo: 'Unassigned'
  };

  // First claim succeeds
  const claim1 = validateAtomicClaim(unassignedLead, 'أحمد رضوان');
  assert.equal(claim1.success, true);
  assert.equal(claim1.lead.assignedTo, 'أحمد رضوان');
  // CRITICAL: Status must stay 'new'
  assert.equal(claim1.lead.status, 'new');

  // Competitor tries to claim the already claimed lead
  const claim2 = validateAtomicClaim(claim1.lead, 'محمود المصري');
  assert.equal(claim2.success, false);
  assert.equal(claim2.reason, CONCURRENCY_ERRORS.ALREADY_CLAIMED);
  assert.equal(claim2.claimedBy, 'أحمد رضوان');
});

test('concurrency: validatePropertyBooking prevents double-booking on reserved or sold properties', () => {
  const availableProp = {
    id: 'p-101',
    title_ar: 'شقة 180م حي شرق',
    status: 'available'
  };

  // First booking succeeds
  const book1 = validatePropertyBooking(availableProp, {
    clientName: 'د. سمير',
    agentName: 'أحمد رضوان',
    depositAmount: 50000
  });
  assert.equal(book1.success, true);
  assert.equal(book1.property.status, 'reserved');
  assert.equal(book1.property.reservedFor, 'د. سمير');

  // Second booking on the same reserved property is strictly blocked
  const book2 = validatePropertyBooking(book1.property, {
    clientName: 'م. خالد',
    agentName: 'محمود المصري',
    depositAmount: 60000
  });
  assert.equal(book2.success, false);
  assert.equal(book2.conflict, true);
  assert.equal(book2.reason, CONCURRENCY_ERRORS.ALREADY_RESERVED);
  assert.ok(book2.message_ar.includes('منع البيع المزدوج'));
});
