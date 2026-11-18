// src/services/concurrencyEngine.js
// 1Line OS Concurrency & Optimistic Locking Engine
// Guarantees data integrity for multi-agent real estate operations:
// 1. Optimistic Locking (versioning & collision detection)
// 2. Pessimistic Soft Lease / Active Editing Presence (2-3 min heartbeat)
// 3. Atomic Claim Validation (concurrency-safe with "الاستلام ≠ تواصل")
// 4. Double-Booking Prevention on Properties (prevents selling/reserving same unit twice)

export const DEFAULT_LEASE_DURATION_MS = 3 * 60 * 1000; // 3 minutes

export const CONCURRENCY_ERRORS = {
  VERSION_CONFLICT: 'version_conflict',
  ACTIVE_LEASE_HELD: 'active_lease_held',
  ALREADY_CLAIMED: 'already_claimed',
  ALREADY_RESERVED: 'already_reserved',
  NOT_FOUND: 'not_found'
};

/**
 * Checks if a soft lease is active and unexpired.
 */
export function isLeaseActive(activeEditor, nowMs = Date.now()) {
  if (!activeEditor || !activeEditor.expiresAt) return false;
  const expiresMs = new Date(activeEditor.expiresAt).getTime();
  return expiresMs > nowMs;
}

/**
 * Attempts to acquire an editing lease for a user on an entity (Lead, Property, Deal).
 * Returns { acquired: true, lease, updatedEntity } or { acquired: false, reason, heldBy, remainingSeconds }.
 */
export function acquireEntityLease(entity, user, options = {}) {
  const now = options.now ? new Date(options.now) : new Date();
  const nowMs = now.getTime();
  const leaseDurationMs = options.durationMs || DEFAULT_LEASE_DURATION_MS;

  const currentEditor = entity.activeEditor;
  const isHeldByAnother = isLeaseActive(currentEditor, nowMs) && currentEditor.uid !== user.uid;

  // If held by another user and not forced by super_admin
  if (isHeldByAnother && !options.forceOverride && user.role !== 'super_admin') {
    const expiresMs = new Date(currentEditor.expiresAt).getTime();
    const remainingSeconds = Math.max(0, Math.ceil((expiresMs - nowMs) / 1000));

    return {
      acquired: false,
      reason: CONCURRENCY_ERRORS.ACTIVE_LEASE_HELD,
      heldBy: currentEditor.name || 'مستخدم آخر',
      heldByUid: currentEditor.uid,
      remainingSeconds,
      expiresAt: currentEditor.expiresAt
    };
  }

  // Acquire or refresh lease
  const expiresAt = new Date(nowMs + leaseDurationMs).toISOString();
  const newLease = {
    uid: user.uid,
    name: user.name || 'موظف 1Line',
    role: user.role || 'sales_agent',
    lockedAt: now.toISOString(),
    expiresAt
  };

  const updatedEntity = {
    ...entity,
    activeEditor: newLease,
    updatedAt: now.toISOString()
  };

  return {
    acquired: true,
    lease: newLease,
    updatedEntity
  };
}

/**
 * Renews an active lease (Heartbeat while user has drawer/modal open).
 */
export function renewEntityLease(entity, user, options = {}) {
  const now = options.now ? new Date(options.now) : new Date();
  const nowMs = now.getTime();
  const leaseDurationMs = options.durationMs || DEFAULT_LEASE_DURATION_MS;

  const currentEditor = entity.activeEditor;
  // Can only renew if current user owns the lease or lease has expired
  if (isLeaseActive(currentEditor, nowMs) && currentEditor.uid !== user.uid) {
    return {
      renewed: false,
      reason: CONCURRENCY_ERRORS.ACTIVE_LEASE_HELD,
      heldBy: currentEditor.name
    };
  }

  const expiresAt = new Date(nowMs + leaseDurationMs).toISOString();
  const renewedLease = {
    uid: user.uid,
    name: user.name || 'موظف 1Line',
    role: user.role || 'sales_agent',
    lockedAt: currentEditor?.lockedAt || now.toISOString(),
    expiresAt
  };

  return {
    renewed: true,
    lease: renewedLease,
    updatedEntity: {
      ...entity,
      activeEditor: renewedLease,
      updatedAt: now.toISOString()
    }
  };
}

/**
 * Releases an active lease when drawer/modal is closed or saved.
 */
export function releaseEntityLease(entity, user, options = {}) {
  const now = options.now ? new Date(options.now) : new Date();
  const currentEditor = entity.activeEditor;

  // If not locked, or locked by another user and not super_admin, do not release
  if (currentEditor && currentEditor.uid !== user.uid && user.role !== 'super_admin' && !options.forceOverride) {
    return {
      released: false,
      reason: 'not_lease_owner'
    };
  }

  return {
    released: true,
    updatedEntity: {
      ...entity,
      activeEditor: null,
      updatedAt: now.toISOString()
    }
  };
}

/**
 * Optimistic Locking Update Validator.
 * Compares expectedVersion with current entity version.
 * If match: increments version and applies updates.
 * If mismatch: rejects update with conflict details.
 */
export function validateOptimisticUpdate(currentEntity, updates, expectedVersion, user = {}) {
  const currentVersion = currentEntity.version || 1;

  if (expectedVersion !== undefined && expectedVersion !== null && expectedVersion !== currentVersion) {
    return {
      success: false,
      conflict: true,
      reason: CONCURRENCY_ERRORS.VERSION_CONFLICT,
      message_ar: `تم تعديل هذا السجل بواسطة زميل آخر (${currentEntity.lastEditedBy || 'مستخدم آخر'}) قبل قليل. يرجى إعادة تحميل أحدث نسخة لتجنب فقدان البيانات.`,
      currentVersion,
      expectedVersion,
      currentEntity
    };
  }

  const now = new Date().toISOString();
  const nextVersion = currentVersion + 1;

  const merged = {
    ...currentEntity,
    ...updates,
    version: nextVersion,
    lastEditedBy: user.name || 'مستخدم 1Line',
    lastEditedUid: user.uid || null,
    updatedAt: now
  };

  return {
    success: true,
    conflict: false,
    nextVersion,
    updatedEntity: merged
  };
}

/**
 * Atomic Claim Validator (In-memory & pre-transaction logic).
 * Ensures a lead can only be claimed once, preserving status='new' ("الاستلام ≠ تواصل").
 */
export function validateAtomicClaim(lead, claimantName, options = {}) {
  const currentAssignee = lead.assignedTo;
  const isClaimed = Boolean(
    currentAssignee &&
    currentAssignee !== 'Unassigned' &&
    currentAssignee !== 'غير مسند'
  );

  if (isClaimed && currentAssignee !== claimantName && !options.override) {
    return {
      success: false,
      reason: CONCURRENCY_ERRORS.ALREADY_CLAIMED,
      claimedBy: currentAssignee,
      message_ar: `عذراً! تم استلام هذا الطلب بالفعل بواسطة زميلك "${currentAssignee}".`
    };
  }

  const now = new Date().toISOString();
  const updatedLead = {
    ...lead,
    assignedTo: claimantName,
    assignedAt: now,
    // CRITICAL: Status must stay exactly as it is (usually 'new'), NEVER changed to 'contacted'!
    status: lead.status || 'new',
    updatedAt: now
  };

  return {
    success: true,
    lead: updatedLead
  };
}

/**
 * Double-Booking Prevention Validator for Properties.
 * Prevents two sales consultants from reserving or taking deposits on the same unit.
 */
export function validatePropertyBooking(property, bookingRequest = {}) {
  const currentStatus = property.status || 'available';
  const isAlreadyBooked = ['reserved', 'deposit_paid', 'contracted', 'sold'].includes(currentStatus);

  if (isAlreadyBooked) {
    return {
      success: false,
      conflict: true,
      reason: CONCURRENCY_ERRORS.ALREADY_RESERVED,
      currentStatus,
      reservedFor: property.reservedFor || property.buyerName || null,
      message_ar: `تنبيه حازم لمنع البيع المزدوج: هذه الوحدة محجوزة بالفعل بحالة "${currentStatus}". لا يمكن إتمام حجز جديد عليها.`
    };
  }

  const now = new Date().toISOString();
  const updatedProperty = {
    ...property,
    status: bookingRequest.targetStatus || 'reserved',
    reservedFor: bookingRequest.clientName || 'عميل حجز',
    reservedByAgent: bookingRequest.agentName || 'مستشار المبيعات',
    reservedAt: now,
    depositAmount: bookingRequest.depositAmount || 0,
    updatedAt: now
  };

  return {
    success: true,
    conflict: false,
    property: updatedProperty
  };
}
