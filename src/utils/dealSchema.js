// =============================================================
//  1LINE SOLUTIONS CRM - ENTERPRISE CANONICAL DEAL SCHEMA
// =============================================================

export const CANONICAL_DEAL_FIELDS = [
  'hid',
  'leadId',
  'propertyId',
  'stage',
  'estimatedValue',
  'probability',
  'expectedCloseDate',
  'assignedTo',
  'createdAt',
  'updatedAt'
];

export const DEAL_STAGES = [
  { id: 'qualification', label_ar: 'تأهيل العميل', label_en: 'Qualification', defaultProbability: 20 },
  { id: 'proposal', label_ar: 'تقديم العروض', label_en: 'Proposal', defaultProbability: 40 },
  { id: 'site_visit', label_ar: 'معاينة ميدانية', label_en: 'Site Visit', defaultProbability: 60 },
  { id: 'negotiation', label_ar: 'تفاوض وتقييم', label_en: 'Negotiation', defaultProbability: 75 },
  { id: 'closing', label_ar: 'توقيع وحجز', label_en: 'Closing / Deposit', defaultProbability: 90 },
  { id: 'won', label_ar: 'صفقة ناجحة (مغلقة)', label_en: 'Closed Won', defaultProbability: 100 },
  { id: 'lost', label_ar: 'صفقة ملغاة / مفقودة', label_en: 'Closed Lost', defaultProbability: 0 }
];

/**
 * Generates a Human-Readable Identifier (hid) for deals (e.g. DL-2026-4819)
 */
export const generateDealHid = () => {
  const year = new Date().getFullYear();
  const randSeq = Math.floor(1000 + Math.random() * 9000);
  return `DL-${year}-${randSeq}`;
};

/**
 * Normalizes any deal input to the canonical schema
 * Guarantees 'hid' (Human ID) and all 10 canonical fields
 */
export const normalizeCanonicalDeal = (raw = {}, options = {}) => {
  const nowIso = new Date().toISOString();
  const stage = raw.stage || 'qualification';
  const stageObj = DEAL_STAGES.find(s => s.id === stage);
  const defaultProb = stageObj ? stageObj.defaultProbability : 20;

  // Clean numerical value from string or number
  let numericValue = 0;
  if (typeof raw.estimatedValue === 'number') {
    numericValue = raw.estimatedValue;
  } else if (typeof raw.estimatedValue === 'string') {
    numericValue = Number(raw.estimatedValue.replace(/[^0-9.]/g, '')) || 0;
  }

  const hid = raw.hid || (raw.id && String(raw.id).startsWith('DL-') ? raw.id : generateDealHid());
  const id = raw.id || hid;

  return {
    // Canonical 10 Fields
    hid,
    leadId: raw.leadId || '',
    propertyId: raw.propertyId || null,
    stage,
    estimatedValue: numericValue,
    probability: typeof raw.probability === 'number' ? raw.probability : defaultProb,
    expectedCloseDate: raw.expectedCloseDate || null,
    assignedTo: raw.assignedTo || options.assignedTo || 'Unassigned',
    createdAt: raw.createdAt || raw.timestamp || nowIso,
    updatedAt: raw.updatedAt || nowIso,

    // Internal ID compatibility
    id
  };
};

/**
 * Creates a Canonical Deal from a Lead and optional Property
 */
export const createDealFromLead = (lead = {}, property = null, options = {}) => {
  const nowIso = new Date().toISOString();
  let estimatedValue = 0;
  if (property && property.price) {
    estimatedValue = Number(property.price) || 0;
  } else if (lead.budget) {
    estimatedValue = typeof lead.budget === 'number' 
      ? lead.budget 
      : (Number(String(lead.budget).replace(/[^0-9.]/g, '')) || 0);
  }

  const hid = generateDealHid();

  return normalizeCanonicalDeal({
    id: hid,
    hid,
    leadId: lead.id,
    propertyId: property ? property.id : null,
    stage: 'qualification',
    estimatedValue,
    probability: 20,
    expectedCloseDate: options.expectedCloseDate || null,
    assignedTo: lead.assignedTo || 'Sales Advisor Team',
    createdAt: nowIso,
    updatedAt: nowIso
  });
};

/**
 * Validates canonical deal fields
 */
export const validateCanonicalDeal = (deal) => {
  const errors = [];
  if (!deal.hid) {
    errors.push('hid (Human ID) is required');
  }
  if (!deal.leadId) {
    errors.push('leadId is required');
  }
  if (typeof deal.estimatedValue !== 'number' || deal.estimatedValue < 0) {
    errors.push('estimatedValue must be a non-negative number');
  }
  if (typeof deal.probability !== 'number' || deal.probability < 0 || deal.probability > 100) {
    errors.push('probability must be between 0 and 100');
  }
  return {
    isValid: errors.length === 0,
    errors
  };
};
