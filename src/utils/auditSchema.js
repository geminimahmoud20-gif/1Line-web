// =============================================================
//  1LINE SOLUTIONS CRM - ENTERPRISE CANONICAL AUDIT LOG SCHEMA
// =============================================================

export const CANONICAL_AUDIT_FIELDS = [
  'id',
  'actorId',
  'action',
  'entityType',
  'entityId',
  'before',
  'after',
  'ipHashOrMetadata',
  'createdAt'
];

/**
 * Normalizes any audit log entry to the 9-field forensic audit schema
 * Guarantees all 9 canonical fields while preserving backward-compatible aliases.
 */
export const normalizeCanonicalAuditLog = (raw = {}) => {
  const nowIso = new Date().toISOString();
  const id = raw.id || `audit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const actorId = raw.actorId || raw.actorUid || raw.actor?.uid || 'system';
  const action = raw.action || raw.actionType || raw.type || 'GENERAL_ACTION';
  const entityType = raw.entityType || raw.targetCollection || 'system';
  const entityId = raw.entityId || raw.targetId || 'global';
  const before = raw.before !== undefined ? raw.before : (raw.previousState || null);
  const after = raw.after !== undefined ? raw.after : (raw.newState || null);
  
  // Masked or hashed IP / metadata container
  const ipHashOrMetadata = raw.ipHashOrMetadata || raw.metadata || raw.details || {
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'server',
    timestamp: nowIso
  };
  const createdAt = raw.createdAt || raw.timestamp || nowIso;

  return {
    // 9 Canonical Fields
    id,
    actorId,
    action,
    entityType,
    entityId,
    before,
    after,
    ipHashOrMetadata,
    createdAt,

    // Backward-compatibility aliases
    type: action,
    actionType: action,
    targetCollection: entityType,
    targetId: entityId,
    actorUid: actorId,
    metadata: ipHashOrMetadata,
    details: ipHashOrMetadata
  };
};

/**
 * Validates canonical audit log entry
 */
export const validateCanonicalAuditLog = (log) => {
  const errors = [];
  if (!log.actorId) errors.push('actorId is required');
  if (!log.action) errors.push('action is required');
  if (!log.entityType) errors.push('entityType is required');
  if (!log.entityId) errors.push('entityId is required');
  return {
    isValid: errors.length === 0,
    errors
  };
};
