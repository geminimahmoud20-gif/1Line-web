// =============================================================
//  1LINE SOLUTIONS CRM - ENTERPRISE CANONICAL LEAD SCHEMA
// =============================================================

export const CANONICAL_LEAD_FIELDS = [
  'id',
  'name',
  'phone',
  'whatsapp',
  'email',
  'source',
  'type',
  'budget',
  'area',
  'propertyType',
  'notes',
  'status',
  'temperature',
  'score',
  'assignedTo',
  'nextFollowUpAt',
  'createdAt',
  'updatedAt',
  'createdBy',
  'lastActivityAt'
];

/**
 * Normalizes any lead input to the canonical 20-field schema
 * Ensures backward compatibility with legacy fields while guaranteeing full canonical consistency.
 */
export const normalizeCanonicalLead = (raw = {}, options = {}) => {
  const nowIso = new Date().toISOString();
  const details = raw.details || {};

  const name = (raw.name || raw.clientName || 'عميل مسجل').trim();
  const phone = (raw.phone || raw.whatsapp || '').trim();
  const whatsapp = (raw.whatsapp || raw.phone || '').trim();
  const email = (raw.email || '').trim();
  const source = raw.source || raw.sourceLabel || 'website';
  const type = raw.type || 'buyer';
  const budget = raw.budget || details.budget || details.expectedPrice || '';
  const area = raw.area || details.area || raw.location || 'sohag_jadida';
  const propertyType = raw.propertyType || details.propertyType || raw.targetType || 'apartment';
  const notes = raw.notes || '';
  const status = raw.status || 'new';
  const temperature = raw.temperature || 'hot';
  const score = typeof raw.score === 'number' ? raw.score : 85;
  const assignedTo = raw.assignedTo || 'Unassigned';
  const nextFollowUpAt = raw.nextFollowUpAt || null;
  const createdAt = raw.createdAt || raw.timestamp || nowIso;
  const updatedAt = raw.updatedAt || nowIso;
  const createdBy = raw.createdBy || options.currentUserName || 'system';
  const lastActivityAt = raw.lastActivityAt || nowIso;

  return {
    // 20 Canonical Fields
    id: raw.id || `lead-${Date.now()}`,
    name,
    phone,
    whatsapp,
    email,
    source,
    type,
    budget,
    area,
    propertyType,
    notes,
    status,
    temperature,
    score,
    assignedTo,
    nextFollowUpAt,
    createdAt,
    updatedAt,
    createdBy,
    lastActivityAt,

    // Auxiliary & telemetry fields preserved for backward compatibility
    timestamp: createdAt,
    followUp: raw.followUp || 'Pending Contact',
    activityLogs: Array.isArray(raw.activityLogs) ? raw.activityLogs : [],
    digitalJourney: Array.isArray(raw.digitalJourney) ? raw.digitalJourney : [],
    dwellTimeFormatted: raw.dwellTimeFormatted || '',
    dwellTimeSeconds: raw.dwellTimeSeconds || 0,
    isLiveTracked: Boolean(raw.isLiveTracked),
    details: {
      ...details,
      budget,
      area,
      propertyType
    }
  };
};

/**
 * Validates canonical lead data before persistence
 */
export const validateCanonicalLead = (lead) => {
  const errors = [];
  if (!lead.name || !lead.name.trim()) {
    errors.push('Name is required');
  }
  if (!lead.phone && !lead.whatsapp) {
    errors.push('Phone or WhatsApp number is required');
  }
  return {
    isValid: errors.length === 0,
    errors
  };
};
