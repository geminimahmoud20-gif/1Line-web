// src/services/referenceCustomerJourney.js
// 1Line OS End-to-End Reference Customer Journey (رحلة عميل مرجعية كاملة)
// Implements the official 7-phase real estate lifecycle from advertising inquiry to post-sale collections and referrals.
// Strictly adheres to Egyptian Law 151/2020 (Marketing Consent), Contact Isolation, Stage Gate Deliverables,
// Inter-Departmental Tasks (1-10), Gate 1/2/3 checks, and the 5,000 EGP / 1M collection incentive model.

import {
  validatePerson,
  createPersonDraft,
  validateBuyerProfile,
  createBuyerProfileDraft,
  validateGate2Checklist,
  validateGate3Checklist,
  createHandoffTask,
  calculateDealFinances,
  calculateAgentIncentiveOnCollection
} from '../models/schema.js';

import {
  validateStageTransition,
  STAGE_DEFINITIONS,
  HIGH_VALUE_DEAL_THRESHOLD
} from './stateMachineEngine.js';

import {
  rankAndNominateProperties,
  formatNominationWhatsAppPitch
} from './matchingEngineV2.js';

/**
 * 7 Sequential Phases of the 1Line OS Customer Journey
 */
export const JOURNEY_PHASES = {
  1: {
    id: 'inquiry_intake',
    stage: 'new',
    name_ar: 'الاستفسار وقناة الدخول',
    name_en: 'Inquiry Intake',
    ownerDept: 'ops',
    slaHours: 0.25, // 15 mins
    handoffTaskNumber: 1,
    requiredDeliverable: 'تسجيل الشخص بموافقة قانون 151/2020 وعزل رقم الهاتف'
  },
  2: {
    id: 'qualification',
    stage: 'qualified',
    name_ar: 'التأهيل وملف المشتري',
    name_en: 'Qualification & Buyer Profile',
    ownerDept: 'sales',
    slaHours: 24,
    handoffTaskNumber: 3,
    requiredDeliverable: 'استبيان التأهيل الخماسي (الميزانية، طريقة الدفع، المنطقة، الغرض، مهلة القرار)'
  },
  3: {
    id: 'matching_and_nomination',
    stage: 'matched',
    name_ar: 'الترشيح والمطابقة الذكية',
    name_en: 'Matching & 3-Tier Nomination',
    ownerDept: 'inventory',
    slaHours: 48,
    handoffTaskNumber: 4,
    requiredDeliverable: 'باقة الترشيحات الثلاثية (الأقرب/القيمة/التحدي) أو فتح طلب بحث 7 أيام'
  },
  4: {
    id: 'site_visit_and_inspection',
    stage: 'site_visit',
    nextStage: 'negotiating',
    name_ar: 'المعاينة الميدانية والاعتراضات',
    name_en: 'Site Visit & Inspection',
    ownerDept: 'sales',
    slaHours: 168, // 7 days
    handoffTaskNumber: 7,
    requiredDeliverable: 'تقرير معاينة ميدانية مكتوب وتصعيد المؤسس إذا كانت الصفقة ≥ 5 مليون'
  },
  5: {
    id: 'offer_and_gate2',
    stage: 'negotiating',
    nextStage: 'closing',
    name_ar: 'تقديم العرض وفحص البوابة 2',
    name_en: 'Offer & Gate 2 Technical/Financial Review',
    ownerDept: 'sales',
    slaHours: 72,
    handoffTaskNumber: 8,
    requiredDeliverable: 'عرض شراء مكتوب واستيفاء قائمة تدقيق البوابة 2 الفنية والقانونية'
  },
  6: {
    id: 'contract_and_gate3',
    stage: 'closing',
    nextStage: 'closed',
    name_ar: 'التعاقد النهائي واعتماد البوابة 3',
    name_en: 'Contract Execution & Gate 3 Sign-off',
    ownerDept: 'founder',
    slaHours: 48,
    handoffTaskNumber: 9,
    requiredDeliverable: 'تدقيق المحامي للبوابة 3، السعر المنفذ، وتوقيع عقد الوساطة'
  },
  7: {
    id: 'collection_and_after_sales',
    stage: 'closed',
    nextStage: 'after_sales',
    name_ar: 'التحصيل والمكافأة وما بعد البيع',
    name_en: 'Collection, Incentive & After-Sales',
    ownerDept: 'ops',
    slaHours: 720, // 30 days
    handoffTaskNumber: 10,
    requiredDeliverable: 'فاتورة العمولة، إيصال التحصيل الفعلي، مكافأة 5 آلاف/مليون، ومتابعة الإحالة'
  }
};

/**
 * Phase 1: Inquiry Intake & Person Registration
 * Enforces Egyptian Law 151/2020 marketing consent and contact number isolation in person_contacts.
 * Generates SLA Task 1 (Handoff 1: Ops -> Sales, 15 min SLA).
 */
export function step1_executeInquiryIntake(input) {
  const {
    id = `lead-${Date.now()}`,
    name,
    source,
    consent,
    phone,
    whatsapp,
    city = 'سوهاج',
    sector = 'شرق',
    neighborhood = '',
    segment = 'B',
    assignedTo = 'Sales Team A',
    assignedAgentUid = null,
    notes = ''
  } = input;

  // 1. Egyptian Law 151/2020 Consent & Validation
  const personValidation = validatePerson({ name, source, consent });
  if (!personValidation.valid) {
    return {
      success: false,
      step: 1,
      errors: personValidation.errors,
      lead: null,
      contact: null,
      task: null
    };
  }

  const now = new Date().toISOString();

  // 2. Lead / Person entity (PII masked or stored with isolated contact pointer)
  const lead = createPersonDraft({
    id,
    name: name.trim(),
    source,
    consent: true,
    consentDate: now,
    city,
    sector,
    neighborhood,
    segment,
    assignedTo,
    assignedAgentUid,
    status: 'new',
    notes,
    createdAt: now,
    updatedAt: now
  });

  // 3. Isolated contact record (stored in person_contacts collection)
  const contact = {
    id: `contact-${id}`,
    personId: id,
    phone: phone ? String(phone).trim() : null,
    whatsapp: whatsapp ? String(whatsapp).trim() : (phone ? String(phone).trim() : null),
    accessRoleRequired: 'ld.phone',
    createdAt: now,
    updatedAt: now
  };

  // 4. Generate Task 1: First Response (Ops -> Sales, 15-minute SLA)
  const task1 = createHandoffTask(1, lead.id, lead.assignedTo);

  return {
    success: true,
    step: 1,
    lead,
    contact,
    task1,
    auditLog: `[${now}] المرحلة 1 مكتملة: تم تسجيل العميل "${lead.name}" بموافقة قانون 151/2020، وعزل رقم الهاتف، وتوليد مهمة الاستجابة السريعة (SLA: 15 دقيقة).`
  };
}

/**
 * Phase 2: Qualification & 5-Question Buyer Profile
 * Validates the 5 essential qualification criteria.
 * Enforces deliverable gate for 'qualified' and generates Task 3 (Sales -> Inventory, 48h SLA).
 */
export function step2_executeQualification(lead, profileInput) {
  const profileDraft = createBuyerProfileDraft(profileInput);
  const profileValidation = validateBuyerProfile(profileDraft);

  if (!profileValidation.valid) {
    return {
      success: false,
      step: 2,
      errors: profileValidation.errors,
      lead,
      task: null
    };
  }

  // Validate State Machine Stage Transition
  const transition = validateStageTransition(lead, 'qualified', { buyerProfile: profileDraft });
  if (!transition.allowed) {
    return {
      success: false,
      step: 2,
      errors: [transition.missingDeliverable || transition.reason],
      lead,
      task: null
    };
  }

  const now = new Date().toISOString();
  const updatedLead = {
    ...lead,
    status: 'qualified',
    buyerProfile: profileDraft,
    details: {
      ...(lead.details || {}),
      budget: profileDraft.budgetMax,
      budgetMin: profileDraft.budgetMin,
      budgetMax: profileDraft.budgetMax,
      paymentMethod: profileDraft.paymentMethod,
      area: profileDraft.targetSectors?.[0] || 'شرق',
      purpose: profileDraft.purpose
    },
    updatedAt: now
  };

  // Generate Handoff Task 3 (Sales -> Inventory, 48h SLA)
  const task3 = transition.nextTask || createHandoffTask(3, lead.id, 'Inventory Desk');

  return {
    success: true,
    step: 2,
    lead: updatedLead,
    buyerProfile: profileDraft,
    task3,
    auditLog: `[${now}] المرحلة 2 مكتملة: تم تأهيل العميل بملف المشترى الخماسي ونقله لمرحلة "مؤهل"، وتوليد مهمة طلب البحث الموجه (SLA: 48 ساعة).`
  };
}

/**
 * Phase 3: Matching & 3-Tier Nomination Pack
 * Runs matchingEngineV2 to generate 3-Tier Pack (Closest, Value, Challenge) with WhatsApp Pitch.
 * If < 3 matches, automatically opens an internal SearchRequest with 7-day SLA.
 * Transitions to 'matched' and generates Task 4 (Inventory -> Sales, 168h SLA).
 */
export function step3_executeMatchingAndNomination(lead, availableProperties = [], options = {}) {
  const matchingResult = rankAndNominateProperties(lead, availableProperties, options);
  const isFallbackToSearch = Boolean(matchingResult.needsSearchRequest);
  const nominationPack = matchingResult.nominationPack || [];
  const searchRequest = matchingResult.searchRequestDraft;
  const scoredMatches = matchingResult.matches || [];

  const transitionContext = isFallbackToSearch
    ? { hasOpenSearchRequest: true }
    : { nominations: nominationPack };

  const transition = validateStageTransition(lead, 'matched', transitionContext);
  if (!transition.allowed) {
    return {
      success: false,
      step: 3,
      errors: [transition.missingDeliverable || transition.reason],
      lead,
      matchingResult,
      task: null
    };
  }

  const now = new Date().toISOString();
  const updatedLead = {
    ...lead,
    status: 'matched',
    nominations: nominationPack || [],
    hasOpenSearchRequest: Boolean(isFallbackToSearch),
    searchRequestId: searchRequest?.id || null,
    updatedAt: now
  };

  // Generate WhatsApp pitch if nomination pack exists
  let pitchMessage = null;
  if (nominationPack && nominationPack.length === 3) {
    const propertiesMap = (availableProperties || []).reduce((acc, p) => {
      acc[p.id] = p;
      return acc;
    }, {});
    pitchMessage = formatNominationWhatsAppPitch(lead, nominationPack, propertiesMap);
  }

  // Generate Handoff Task 4 (Inventory -> Sales, 168h SLA)
  const task4 = transition.nextTask || createHandoffTask(4, lead.id, lead.assignedTo);

  return {
    success: true,
    step: 3,
    lead: updatedLead,
    nominationPack,
    searchRequest,
    pitchMessage,
    scoredMatches,
    task4,
    auditLog: `[${now}] المرحلة 3 مكتملة: ${isFallbackToSearch ? 'تم فتح طلب بحث موجّه للمخزون بمهلة 7 أيام لعدم كفاية المطابقات.' : 'تم اعتماد باقة الترشيحات الثلاثية وتوليد رسالة العرض المكتوبة.'} (المرحلة الحالية: مطابقة، المهمة المولدة: Task 4).`
  };
}

/**
 * Phase 4: Site Visit & Inspection
 * Records site visit execution, feedback, and customer objections.
 * Enforces High-Value Threshold (≥ 5M EGP) Founder sign-off requirement.
 * Transitions to 'negotiating' and generates Task 7 (Sales -> Founder, 2h SLA).
 */
export function step4_executeSiteVisit(lead, visitData, userContext = {}) {
  const {
    propertyId,
    visitDate = new Date().toISOString(),
    completed = true,
    clientFeedback = '',
    clientObjections = [],
    selectedPropertyTitle = ''
  } = visitData;

  const siteVisitReport = {
    propertyId,
    visitDate,
    completed,
    clientFeedback,
    clientObjections,
    selectedPropertyTitle,
    recordedAt: new Date().toISOString()
  };

  const offerValue = lead.buyerProfile?.budgetMax || lead.details?.budget || 0;
  const isHighValue = offerValue >= HIGH_VALUE_DEAL_THRESHOLD;
  const isFounderApproved = Boolean(userContext.isFounderApproved || userContext.userRole === 'super_admin');

  // Enforce deliverable gate
  const transition = validateStageTransition(lead, 'negotiating', {
    siteVisitReport,
    offerValue,
    isFounderApproved: isHighValue ? isFounderApproved : true,
    userRole: userContext.userRole
  });

  if (!transition.allowed) {
    return {
      success: false,
      step: 4,
      errors: [transition.missingDeliverable || transition.reason],
      deliverableKey: transition.deliverableKey,
      lead,
      task: null
    };
  }

  const now = new Date().toISOString();
  const updatedLead = {
    ...lead,
    status: 'negotiating',
    siteVisitReport,
    viewingPropertyId: propertyId,
    isFounderApproved: isHighValue ? true : (lead.isFounderApproved || false),
    updatedAt: now
  };

  // Generate Handoff Task 7 (Sales -> Founder, 2h SLA)
  const task7 = transition.nextTask || createHandoffTask(7, lead.id, 'Dr. Mahmoud Elbaz');

  return {
    success: true,
    step: 4,
    lead: updatedLead,
    siteVisitReport,
    task7,
    auditLog: `[${now}] المرحلة 4 مكتملة: تم توثيق تقرير المعاينة الميدانية بنجاح${isHighValue ? ' واعتماد موافقة المؤسس للصفقة الكبرى' : ''}، ونقل الصفقة لمرحلة التفاوض (Task 7 المولدة).`
  };
}

/**
 * Phase 5: Written Offer & Gate 2 Technical/Financial Review
 * Verifies purchase offer and Gate 2 checklist (Price/availability, negative certificate, property memo, title notice).
 * Transitions to 'closing' and generates Task 8 (Inventory -> Founder, 48h SLA).
 */
export function step5_executeOfferAndGate2(lead, offerData, gate2Data) {
  const {
    offeredPrice,
    downPayment,
    installmentYears = 0,
    validUntil = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString()
  } = offerData;

  if (!offeredPrice || offeredPrice <= 0) {
    return {
      success: false,
      step: 5,
      errors: ['Valid offered price is required'],
      lead,
      task: null
    };
  }

  const writtenOffer = {
    offeredPrice,
    downPayment,
    installmentYears,
    validUntil,
    submittedAt: new Date().toISOString()
  };

  const gate2Check = validateGate2Checklist(gate2Data);
  if (!gate2Check.valid) {
    return {
      success: false,
      step: 5,
      errors: gate2Check.errors,
      lead,
      task: null
    };
  }

  // Validate State Machine Stage Transition to 'closing'
  const transition = validateStageTransition(lead, 'closing', {
    gate2Passed: true,
    writtenOffer
  });

  if (!transition.allowed) {
    return {
      success: false,
      step: 5,
      errors: [transition.missingDeliverable || transition.reason],
      lead,
      task: null
    };
  }

  const now = new Date().toISOString();
  const updatedLead = {
    ...lead,
    status: 'closing',
    writtenOffer,
    gate2Passed: true,
    gate2Details: gate2Data,
    expectedValue: offeredPrice,
    updatedAt: now
  };

  // Generate Handoff Task 8 (Inventory -> Founder, 48h SLA)
  const task8 = transition.nextTask || createHandoffTask(8, lead.id, 'Founder & Legal Desk');

  return {
    success: true,
    step: 5,
    lead: updatedLead,
    writtenOffer,
    gate2Check,
    task8,
    auditLog: `[${now}] المرحلة 5 مكتملة: تم تقديم العرض المكتوب بقيمة ${offeredPrice.toLocaleString('ar-EG')} ج.م، واجتياز تدقيق البوابة 2 الفنية، ونقل الصفقة للحجز والعقود (Task 8).`
  };
}

/**
 * Phase 6: Contract Execution & Gate 3 Legal Sign-off
 * Lawyer document inspection, contract drafted, payment method verified, commission agreement signed.
 * Transitions to 'closed' and generates Task 9 (Founder -> Ops, 12h SLA).
 */
export function step6_executeContractAndGate3(lead, contractData, gate3Data) {
  const {
    executedPrice,
    contractDate = new Date().toISOString(),
    lawyerName = 'Company Lawyer',
    unitCode = null
  } = contractData;

  if (!executedPrice || executedPrice <= 0) {
    return {
      success: false,
      step: 6,
      errors: ['Executed price is required and must be greater than zero'],
      lead,
      task: null
    };
  }

  const gate3Payload = {
    ...gate3Data,
    executedPrice
  };

  const gate3Check = validateGate3Checklist(gate3Payload);
  if (!gate3Check.valid) {
    return {
      success: false,
      step: 6,
      errors: gate3Check.errors,
      lead,
      task: null
    };
  }

  // Validate State Machine Stage Transition to 'closed'
  const transition = validateStageTransition(lead, 'closed', {
    gate3Passed: true,
    executedPrice
  });

  if (!transition.allowed) {
    return {
      success: false,
      step: 6,
      errors: [transition.missingDeliverable || transition.reason],
      lead,
      task: null
    };
  }

  const now = new Date().toISOString();
  const contractRecord = {
    executedPrice,
    contractDate,
    lawyerName,
    unitCode,
    gate3Passed: true,
    executedAt: now
  };

  const updatedLead = {
    ...lead,
    status: 'closed',
    contractRecord,
    gate3Passed: true,
    gate3Details: gate3Data,
    executedPrice,
    closedAt: now,
    updatedAt: now
  };

  // Generate Handoff Task 9 (Founder -> Ops, 12h SLA)
  const task9 = transition.nextTask || createHandoffTask(9, lead.id, 'Operations & Finance');

  return {
    success: true,
    step: 6,
    lead: updatedLead,
    contractRecord,
    gate3Check,
    task9,
    auditLog: `[${now}] المرحلة 6 مكتملة: تم توقيع العقد النهائي بسعر منفذ ${executedPrice.toLocaleString('ar-EG')} ج.م، واعتماد تدقيق المحامي للبوابة 3، وإغلاق الصفقة بنجاح (Task 9).`
  };
}

/**
 * Phase 7: Commission Invoicing, Collection & After-Sales
 * Issues commission invoice (standard 2.5% or custom).
 * Records actual payment collection receipt.
 * Strictly calculates sales incentive (5,000 EGP per 1M collected) UPON COLLECTION ONLY!
 * Generates Task 10 (Ops -> Client, 720h / 30-day SLA for after-sales onboarding and 90-day referral).
 */
export function step7_executeCollectionAndAfterSales(lead, collectionInput) {
  const {
    executedPrice = lead.executedPrice || lead.contractRecord?.executedPrice || 0,
    buyerCommissionRate = 0.025,
    sellerCommissionRate = 0,
    expenses = 0,
    partnerShareRate = 0,
    collectedAmount = 0,
    receiptNumber = `REC-${Date.now()}`,
    collectorUid = 'finance_desk'
  } = collectionInput;

  if (!executedPrice || executedPrice <= 0) {
    return {
      success: false,
      step: 7,
      errors: ['Cannot calculate commission without a valid executed price'],
      lead,
      task: null
    };
  }

  // 1. Calculate Deal Finances
  const finances = calculateDealFinances(
    executedPrice,
    buyerCommissionRate,
    sellerCommissionRate,
    expenses,
    partnerShareRate
  );

  const now = new Date().toISOString();

  // 2. Draft Commission Invoice
  const invoice = {
    id: `inv-${lead.id}`,
    personId: lead.id,
    executedPrice,
    buyerCommission: finances.buyerCommission,
    sellerCommission: finances.sellerCommission,
    totalCommission: finances.totalCommission,
    companyGrossShare: finances.companyGrossShare,
    partnerShare: finances.partnerShare,
    status: collectedAmount >= finances.totalCommission ? 'paid' : (collectedAmount > 0 ? 'partially_paid' : 'unpaid'),
    issuedAt: now
  };

  // 3. Strict Sales Agent Incentive Rule
  // 5,000 EGP per 1,000,000 EGP of COLLECTED amount only!
  const agentIncentivePayable = calculateAgentIncentiveOnCollection(collectedAmount);

  // 4. Collection Receipt Record
  const collectionRecord = {
    id: `col-${lead.id}`,
    invoiceId: invoice.id,
    personId: lead.id,
    collectedAmount,
    receiptNumber,
    collectorUid,
    agentIncentiveAwarded: agentIncentivePayable,
    isFullyCollected: collectedAmount >= finances.totalCommission,
    collectedAt: now
  };

  // 5. Generate Handoff Task 10: After-Sales Follow-up & Referral (Ops -> Client, 720h / 30-day SLA)
  const task10 = createHandoffTask(10, lead.id, 'Operations / Client Care');

  const updatedLead = {
    ...lead,
    finances,
    invoice,
    collectionRecord,
    agentIncentivePayable,
    lifecycleStatus: 'after_sales',
    deliveredAt: now,
    updatedAt: now
  };

  return {
    success: true,
    step: 7,
    lead: updatedLead,
    finances,
    invoice,
    collectionRecord,
    agentIncentivePayable,
    task10,
    auditLog: `[${now}] المرحلة 7 مكتملة: تم إصدار فاتورة العمولة (${finances.totalCommission.toLocaleString('ar-EG')} ج.م)، وتسجيل تحصيل مبلغ ${collectedAmount.toLocaleString('ar-EG')} ج.م برقم إيصال ${receiptNumber}. استحقاق حافز مسؤول المبيعات: ${agentIncentivePayable.toLocaleString('ar-EG')} ج.م فوراً بعد التحصيل. وتوليد مهمة ما بعد البيع وطلب الإحالة (Task 10).`
  };
}

/**
 * End-to-End Reference Customer Journey Simulator
 * Simulates the complete 7-step buyer customer journey from intake to after-sales collection.
 * Validates each step, audits deliverables, and returns an exhaustive execution report.
 */
export function runReferenceCustomerJourneySimulation(config = {}) {
  const logs = [];
  const generatedTasks = [];

  // Step 1: Intake
  const intakeInput = {
    name: config.clientName || 'م. كريم الشريف',
    source: config.source || 'founder_content',
    consent: config.consent !== undefined ? config.consent : true,
    phone: config.phone || '01012345678',
    whatsapp: config.whatsapp || '01012345678',
    city: config.city || 'سوهاج',
    sector: config.sector || 'شرق',
    assignedTo: config.assignedTo || 'Sales Team A'
  };

  const step1 = step1_executeInquiryIntake(intakeInput);
  if (!step1.success) {
    return { success: false, failedAtStep: 1, errors: step1.errors, logs };
  }
  logs.push(step1.auditLog);
  generatedTasks.push(step1.task1);

  // Step 2: Qualification
  const profileInput = {
    budgetMin: config.budgetMin || 2500000,
    budgetMax: config.budgetMax || 3000000,
    paymentMethod: config.paymentMethod || 'cash',
    targetSectors: config.targetSectors || ['شرق'],
    purpose: config.purpose || 'residence',
    decisionTimeline: config.decisionTimeline || 'immediate'
  };

  const step2 = step2_executeQualification(step1.lead, profileInput);
  if (!step2.success) {
    return { success: false, failedAtStep: 2, errors: step2.errors, logs };
  }
  logs.push(step2.auditLog);
  generatedTasks.push(step2.task3);

  // Step 3: Matching & Nomination
  const properties = config.properties || [
    {
      id: 'p-closest',
      title_ar: 'شقة 180م² تشطيب ألترا سوبر لوكس حي شرق',
      area: 'east',
      price: 2700000,
      size: 180,
      propertyType: 'apartment',
      purpose: 'residence',
      gate1Passed: true,
      developerName: 'شركة النيل للتطوير'
    },
    {
      id: 'p-value',
      title_ar: 'شقة 210م² نصف تشطيب بحري صريح حي شرق',
      area: 'east',
      price: 2600000,
      size: 210,
      propertyType: 'apartment',
      purpose: 'residence',
      gate1Passed: true,
      developerName: 'شركة الصفا للاستثمار'
    },
    {
      id: 'p-challenge',
      title_ar: 'دوبلكس 240م² بحديقة خاصة حي شرق سوهاج',
      area: 'east',
      price: 2950000,
      size: 240,
      propertyType: 'apartment',
      purpose: 'residence',
      gate1Passed: true,
      developerName: 'شركة النيل للتطوير'
    }
  ];

  const step3 = step3_executeMatchingAndNomination(step2.lead, properties, {
    agentName: config.agentName || 'أحمد رضوان'
  });
  if (!step3.success) {
    return { success: false, failedAtStep: 3, errors: step3.errors, logs };
  }
  logs.push(step3.auditLog);
  generatedTasks.push(step3.task4);

  // Step 4: Site Visit & Inspection
  const visitData = {
    propertyId: properties[0]?.id || 'p-closest',
    visitDate: new Date().toISOString(),
    completed: true,
    clientFeedback: 'العميل معجب جداً بالموقع والتقسيم الداخلي، ويطلب مهلة يومين للتفاوض.',
    clientObjections: ['طريقة سداد الدفعة الأخيرة']
  };

  const step4 = step4_executeSiteVisit(step3.lead, visitData, {
    isFounderApproved: config.isFounderApproved || false,
    userRole: config.userRole || 'sales_agent'
  });
  if (!step4.success) {
    return { success: false, failedAtStep: 4, errors: step4.errors, logs };
  }
  logs.push(step4.auditLog);
  generatedTasks.push(step4.task7);

  // Step 5: Written Offer & Gate 2
  const offerData = {
    offeredPrice: config.offeredPrice || 2650000,
    downPayment: config.downPayment || 1000000,
    installmentYears: 1
  };

  const gate2Data = {
    priceAndAvailabilityReconfirmed: true,
    negativeCertificateObtained: true,
    propertyMemoReady: true,
    buyerInformedInWritingOfTitleType: true
  };

  const step5 = step5_executeOfferAndGate2(step4.lead, offerData, gate2Data);
  if (!step5.success) {
    return { success: false, failedAtStep: 5, errors: step5.errors, logs };
  }
  logs.push(step5.auditLog);
  generatedTasks.push(step5.task8);

  // Step 6: Contract & Gate 3
  const contractData = {
    executedPrice: config.executedPrice || 2650000,
    contractDate: new Date().toISOString(),
    lawyerName: 'الأستاذ سامح (المستشار القانوني)',
    unitCode: 'SOH-E-014'
  };

  const gate3Data = {
    originalDocumentsInspectedByLawyer: true,
    contractDraftedByCompanyLawyer: true,
    paymentMethodVerified: true,
    commissionAgreementSigned: true
  };

  const step6 = step6_executeContractAndGate3(step5.lead, contractData, gate3Data);
  if (!step6.success) {
    return { success: false, failedAtStep: 6, errors: step6.errors, logs };
  }
  logs.push(step6.auditLog);
  generatedTasks.push(step6.task9);

  // Step 7: Collection & After-Sales
  const collectionData = {
    executedPrice: config.executedPrice || 2650000,
    buyerCommissionRate: 0.025,
    sellerCommissionRate: 0,
    expenses: 0,
    partnerShareRate: 0,
    collectedAmount: config.collectedAmount !== undefined ? config.collectedAmount : 66250, // 2.5% of 2.65M
    receiptNumber: 'REC-2026-SOH-089',
    collectorUid: 'finance_ops_01'
  };

  const step7 = step7_executeCollectionAndAfterSales(step6.lead, collectionData);
  if (!step7.success) {
    return { success: false, failedAtStep: 7, errors: step7.errors, logs };
  }
  logs.push(step7.auditLog);
  generatedTasks.push(step7.task10);

  return {
    success: true,
    lead: step7.lead,
    logs,
    tasks: generatedTasks,
    summary: {
      clientName: step7.lead.name,
      finalStage: step7.lead.status,
      executedPrice: step7.lead.executedPrice,
      totalCommission: step7.finances.totalCommission,
      collectedAmount: step7.collectionRecord.collectedAmount,
      agentIncentive: step7.agentIncentivePayable,
      tasksGeneratedCount: generatedTasks.length
    }
  };
}

/**
 * Audits a lead's current compliance and progress across all 7 stages of 1Line OS.
 */
export function auditLeadJourney(lead, _context = {}) {
  const currentStage = lead?.status || 'new';
  const stageKeys = Object.keys(STAGE_DEFINITIONS);
  const currentIndex = stageKeys.indexOf(currentStage);

  const gatesStatus = {
    consentLaw151: Boolean(lead?.consent === true),
    buyerProfileComplete: Boolean(
      lead?.buyerProfile?.budgetMax &&
      lead?.buyerProfile?.paymentMethod &&
      (lead?.buyerProfile?.targetSectors?.length > 0 || lead?.buyerProfile?.area) &&
      lead?.buyerProfile?.purpose
    ),
    matchingComplete: Boolean(
      (lead?.nominations?.length >= 3) || lead?.hasOpenSearchRequest
    ),
    siteVisitCompleted: Boolean(
      lead?.siteVisitReport?.completed || lead?.siteVisit?.completed
    ),
    highValueFounderApproved: (
      (lead?.buyerProfile?.budgetMax || lead?.details?.budget || 0) < HIGH_VALUE_DEAL_THRESHOLD
    ) || Boolean(lead?.isFounderApproved),
    gate2ChecklistPassed: Boolean(lead?.gate2Passed),
    gate3ChecklistPassed: Boolean(lead?.gate3Passed),
    commissionCollected: Boolean(lead?.collectionRecord?.collectedAmount > 0)
  };

  const passedGatesCount = Object.values(gatesStatus).filter(Boolean).length;
  const totalGates = Object.keys(gatesStatus).length;
  const progressPercent = Math.round((passedGatesCount / totalGates) * 100);

  return {
    currentStage,
    currentIndex,
    gatesStatus,
    passedGatesCount,
    totalGates,
    progressPercent,
    isCompliant: passedGatesCount === totalGates
  };
}
