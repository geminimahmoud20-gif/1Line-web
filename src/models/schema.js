// src/models/schema.js
// 1Line OS Enterprise Real Estate Schema & Data Model
// Conforms to Dr. Mahmoud Elbaz / 1Line Official Company Playbook (Sohag Resale & Cairo Developer Hub)

/**
 * 1. PERSON (Unified Contact: Buyer, Seller, Investor, Developer, Broker, Partner)
 */
export const PERSON_TYPES = ['buyer', 'seller', 'investor', 'developer', 'broker', 'partner'];
export const LEAD_SOURCES = [
  'website',
  'whatsapp',
  'manual',
  'facebook_ads',
  'referral',
  'founder_content',
  'signage',
  'broker_network'
];

export function validatePerson(data) {
  const errors = [];
  if (!data.name || typeof data.name !== 'string' || data.name.trim().length < 2) {
    errors.push('Name is required and must be at least 2 characters');
  }
  if (!data.source || !LEAD_SOURCES.includes(data.source)) {
    errors.push(`Source is required and must be one of: ${LEAD_SOURCES.join(', ')}`);
  }
  // Egyptian Personal Data Protection Law 151/2020 Compliance
  if (data.consent !== true) {
    errors.push('Explicit marketing communication consent is mandatory under Egyptian Law 151/2020');
  }
  return { valid: errors.length === 0, errors };
}

export function createPersonDraft(overrides = {}) {
  const now = new Date().toISOString();
  return {
    name: '',
    types: ['buyer'],
    source: 'website',
    howDidYouHearAboutUs: 'founder_content',
    referralId: null,
    segment: 'B', // VIP, A, B, C
    consent: true,
    consentDate: now,
    city: 'سوهاج',
    sector: 'شرق',
    neighborhood: '',
    assignedTo: 'Sales Team A',
    assignedAgentUid: null,
    status: 'new', // new, qualified, contacted, active, archived
    createdAt: now,
    updatedAt: now,
    ...overrides
  };
}

/**
 * 2. BUYER PROFILE (Comprehensive 5-Question Qualification)
 */
export function validateBuyerProfile(profile) {
  const errors = [];
  if (!profile.budgetMin || profile.budgetMin <= 0) errors.push('Minimum budget is required');
  if (!profile.budgetMax || profile.budgetMax < profile.budgetMin) errors.push('Valid maximum budget is required');
  if (!profile.paymentMethod) errors.push('Payment method (cash/installments/mortgage) is required');
  if (!profile.targetSectors || !Array.isArray(profile.targetSectors) || profile.targetSectors.length === 0) {
    errors.push('At least one target sector/city is required');
  }
  if (!profile.purpose) errors.push('Purpose (residence/investment/clinic/commercial) is required');
  if (!profile.decisionTimeline) errors.push('Decision timeline is required');
  return { valid: errors.length === 0, errors };
}

export function createBuyerProfileDraft(overrides = {}) {
  return {
    budgetMin: 0,
    budgetMax: 0,
    paymentMethod: 'cash', // cash, installments, mortgage
    downPaymentAvailable: 0,
    maxInstallmentYears: 0,
    targetCities: ['سوهاج'],
    targetSectors: ['شرق'],
    targetNeighborhoods: [],
    propertyTypes: ['apartment'], // apartment, villa, commercial, clinic, land
    areaMin: 0,
    areaMax: 0,
    roomsMin: 1,
    purpose: 'residence', // residence, investment, clinic, office, commercial
    decisionTimeline: 'immediate', // immediate, 1_month, 3_months, exploring
    decisionMakers: 'self',
    interestedInCairo: false,
    rejectedOptions: [], // Array of { propertyId, reason, date }
    completedAt: new Date().toISOString(),
    ...overrides
  };
}

/**
 * 3. PROPERTY & GATES (Sohag Resale Checklist & Comparative Valuation)
 */
export const PROPERTY_GRADES = ['A', 'B', 'C', 'D'];

export function generatePropertyCode(city = 'SOH', sector = 'E', sequenceNumber = 1) {
  const seqStr = String(sequenceNumber).padStart(3, '0');
  const sectorCode = sector.toUpperCase().slice(0, 2);
  return `${city}-${sectorCode}-${seqStr}`;
}

export function validateGate1Checklist(gate1) {
<<<<<<< Updated upstream
  // Gate 1 (Before Grade A Classification):
  // 1. Seller identity matches deed
  // 2. Power of attorney valid (if applicable)
  // 3. Inheritance declaration + heirs consent (if inheritance)
  // 4. Deed type recognized (registered, signature validity, validity & enforcement, preliminary)
  // 5. Contract chain continuous
  // 6. Area survey matches
  // 7. Building license & reconciliation or Land allocation installments up-to-date
=======
>>>>>>> Stashed changes
  const requiredChecks = [
    'sellerIdentityMatchesDeed',
    'contractChainContinuous',
    'areaSurveyMatches'
  ];

  const errors = [];
  for (const field of requiredChecks) {
    if (gate1[field] !== true) {
      errors.push(`Gate 1 Check Failed: ${field} must be verified`);
    }
  }

<<<<<<< Updated upstream
  // Deed type must be valid
=======
>>>>>>> Stashed changes
  const validDeeds = ['registered', 'signature_validity', 'validity_and_enforceability', 'preliminary'];
  if (!validDeeds.includes(gate1.deedType)) {
    errors.push('Gate 1 Check Failed: Deed type must be valid');
  }

  return {
    valid: errors.length === 0,
    errors,
    allPassed: errors.length === 0
  };
}

export function validateGate2Checklist(gate2) {
  const errors = [];
  if (gate2.priceAndAvailabilityReconfirmed !== true) errors.push('Price and availability must be reconfirmed');
  if (gate2.negativeCertificateObtained !== true) errors.push('Negative certificate must be obtained');
  if (gate2.propertyMemoReady !== true) errors.push('Property memorandum must be prepared');
  if (gate2.buyerInformedInWritingOfTitleType !== true) errors.push('Buyer must be informed in writing of title type');
  return { valid: errors.length === 0, errors, allPassed: errors.length === 0 };
}

export function validateGate3Checklist(gate3) {
  const errors = [];
  if (gate3.originalDocumentsInspectedByLawyer !== true) errors.push('Original documents must be inspected by lawyer');
  if (gate3.contractDraftedByCompanyLawyer !== true) errors.push('Contract must be drafted by company lawyer');
  if (gate3.paymentMethodVerified !== true) errors.push('Documented payment method must be verified');
  if (gate3.commissionAgreementSigned !== true) errors.push('Commission agreement must be signed');
  if (!gate3.executedPrice || gate3.executedPrice <= 0) errors.push('Executed price must be recorded');
  return { valid: errors.length === 0, errors, allPassed: errors.length === 0 };
}

export function calculateComparativeValuation(comparables = []) {
  if (!Array.isArray(comparables) || comparables.length < 3) {
    return { valid: false, error: 'Comparative valuation requires at least 3-5 comparable properties' };
  }
  const sumPricePerMeter = comparables.reduce((acc, c) => acc + (c.price / c.area), 0);
  const avgPricePerMeter = Math.round(sumPricePerMeter / comparables.length);
  return {
    valid: true,
    avgPricePerMeter,
    minValuationPerMeter: Math.round(avgPricePerMeter * 0.95), // -5%
    maxValuationPerMeter: Math.round(avgPricePerMeter * 1.05), // +5%
    spread: 0.10
  };
}

/**
 * 4. DEVELOPER SCORECARD & EXCLUSION (Cairo Developers Hub)
 */
export function evaluateDeveloperScorecard(criteria, exclusion) {
<<<<<<< Updated upstream
  // Exclusion checks (Zero tolerance)
=======
>>>>>>> Stashed changes
  const isExcluded = (
    exclusion.licensed !== true ||
    exclusion.deliveredAtLeastOnePriorProject !== true ||
    exclusion.writtenCommissionAgreement !== true ||
    exclusion.noMaterialPriceEscalationClause !== true ||
    exclusion.noCashbackGimmicks !== true
  );

  if (isExcluded) {
    return {
      status: 'rejected',
      totalScore: 0,
      reason: 'Exclusion criteria triggered (unlicensed, no past delivery, cashback gimmick, or price variation clause)'
    };
  }

<<<<<<< Updated upstream
  // Weighted score (Weights: Delivery 30%, Construction 20%, Sohag Fit 20%, Commission 15%, Reputation 15%)
=======
>>>>>>> Stashed changes
  const delivery = (criteria.deliveryTrackRecord || 1) * 0.30;
  const construction = (criteria.constructionVsSchedule || 1) * 0.20;
  const sohagFit = (criteria.sohagClientFit || 1) * 0.20;
  const commission = (criteria.commissionRegularity || 1) * 0.15;
  const reputation = (criteria.reputation || 1) * 0.15;

  const totalScore = Number((delivery + construction + sohagFit + commission + reputation).toFixed(2));

  let status = 'rejected';
<<<<<<< Updated upstream
  if (totalScore >= 3.5) status = 'trial_6m'; // Trial partnership 6 months
  else if (totalScore >= 2.5) status = 'review_3m'; // Review after 3 months
=======
  if (totalScore >= 3.5) status = 'trial_6m';
  else if (totalScore >= 2.5) status = 'review_3m';
>>>>>>> Stashed changes

  return {
    status,
    totalScore,
    isApproved: status === 'trial_6m'
  };
}

/**
 * 5. NOMINATIONS & 3-TIER PACK (Closest, Value, Challenge)
 */
export const NOMINATION_ROLES = ['closest', 'value', 'challenge'];

export function createNominationPack(personId, closestProperty, valueProperty, challengeProperty) {
  const now = new Date().toISOString();
  return [
    {
      personId,
      propertyId: closestProperty.id,
      role: 'closest',
      title_ar: 'الأقرب',
      description_ar: 'يطابق المنطقة والميزانية والمساحة والهدف الأساسي بدقة.',
      writtenRationale: closestProperty.writtenRationale || 'الخيار الأقرب لاحتياجاتك المباشرة.',
      status: 'approved',
      sentAt: now
    },
    {
      personId,
      propertyId: valueProperty.id,
      role: 'value',
      title_ar: 'القيمة',
      description_ar: 'أكبر مساحة أو أفضل سعراً مقابل ميزة واضحة.',
      writtenRationale: valueProperty.writtenRationale || 'أعلى عائد وقيمة مقابل كل جنيه مدفوع.',
      status: 'approved',
      sentAt: now
    },
    {
      personId,
      propertyId: challengeProperty.id,
      role: 'challenge',
      title_ar: 'التحدي',
      description_ar: 'أعلى قليلاً في الميزانية (≤ 10%) أو خيار قاهري معتمد بمقارنة مكتوبة يحل مشكلة جوهرية.',
      writtenRationale: challengeProperty.writtenRationale || 'خيار مميز يفتح أفقاً استثمارياً استثنائياً.',
      status: 'approved',
      sentAt: now
    }
  ];
}

/**
 * 6. SEARCH REQUEST (طلب بحث موجّه - 7 Days SLA)
 */
export function createSearchRequestDraft(personId, specifications = {}, inventoryAssignee = 'Engy') {
  const now = new Date();
<<<<<<< Updated upstream
  const deadline = new Date(now.getTime() + (7 * 24 * 60 * 60 * 1000)); // 7 days later
=======
  const deadline = new Date(now.getTime() + (7 * 24 * 60 * 60 * 1000));
>>>>>>> Stashed changes
  return {
    personId,
    specifications,
    inventoryAssignee,
    openedAt: now.toISOString(),
    deadline: deadline.toISOString(),
<<<<<<< Updated upstream
    status: 'open', // open, in_market_search, fulfilled, expired, escalated
=======
    status: 'open',
>>>>>>> Stashed changes
    matchedPropertyIds: [],
    notes: ''
  };
}

/**
 * 7. TASKS & HANDOFFS (Inter-Departmental Deliverables Table 1-10)
 */
export const HANDOFF_DEFINITIONS = {
  1: { from: 'ops', to: 'sales', name: 'عميل مشترٍ مسجّل بمصدره', slaHours: 0.25 },
  2: { from: 'ops', to: 'inventory', name: 'عميل مالك عقار مسجّل', slaHours: 0.25 },
  3: { from: 'sales', to: 'inventory', name: 'طلب بحث موجّه', slaHours: 48 },
  4: { from: 'inventory', to: 'sales', name: 'عقارات A مطابقة + مذكراتها', slaHours: 168 },
  5: { from: 'sales', to: 'founder', name: 'عميل مؤهل للقاهرة + ملفه', slaHours: 168 },
  6: { from: 'founder', to: 'developer', name: 'تسجيل العميل باسم 1Line', slaHours: 24 },
  7: { from: 'sales', to: 'founder', name: 'عرض فوق الحد أو خارج الهامش', slaHours: 2 },
  8: { from: 'inventory', to: 'founder', name: 'المستندات الأصلية (البوابة 3)', slaHours: 48 },
  9: { from: 'founder', to: 'ops', name: 'صفقة مغلقة وبيانات العمولة', slaHours: 12 },
  10: { from: 'ops', to: 'client', name: 'متابعة ما بعد البيع وطلب الإحالة', slaHours: 720 }
};

export function createHandoffTask(handoffNumber, relatedEntityId, assignee = null) {
  const def = HANDOFF_DEFINITIONS[handoffNumber];
  if (!def) throw new Error(`Unknown handoff number: ${handoffNumber}`);
  const now = new Date();
  const dueAt = new Date(now.getTime() + (def.slaHours * 60 * 60 * 1000));
  return {
    handoffNumber,
    name: def.name,
    fromDept: def.from,
    toDept: def.to,
    assignee,
    relatedEntityId,
    createdAt: now.toISOString(),
    dueAt: dueAt.toISOString(),
<<<<<<< Updated upstream
    status: 'pending', // pending, in_progress, completed, escalated_manager, escalated_founder
=======
    status: 'pending',
>>>>>>> Stashed changes
    completedAt: null
  };
}

/**
 * 8. FINANCIAL DEAL & COMMISSION INCENTIVE MODEL
 * Rule: Sales agent incentive = 5,000 EGP per 1,000,000 EGP upon COLLECTED amount only!
 */
export function calculateDealFinances(executedPrice, buyerCommissionRate = 0.025, sellerCommissionRate = 0, expenses = 0, partnerShareRate = 0) {
  const buyerCommission = Math.round(executedPrice * buyerCommissionRate);
  const sellerCommission = Math.round(executedPrice * sellerCommissionRate);
  const totalCommission = buyerCommission + sellerCommission;
  const netBeforePartner = totalCommission - expenses;
  const partnerShare = Math.round(netBeforePartner * partnerShareRate);
  const companyGrossShare = netBeforePartner - partnerShare;

  return {
    executedPrice,
    buyerCommission,
    sellerCommission,
    totalCommission,
    expenses,
    partnerShare,
    companyGrossShare
  };
}

export function calculateAgentIncentiveOnCollection(collectedAmount) {
  if (!collectedAmount || collectedAmount <= 0) return 0;
<<<<<<< Updated upstream
  // 5,000 EGP per 1,000,000 EGP of deal value
  // Ratio = 5,000 / 1,000,000 = 0.005 (0.5% of executed/collected transaction value)
=======
>>>>>>> Stashed changes
  return Math.round((collectedAmount / 1_000_000) * 5_000);
}
