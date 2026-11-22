// src/models/schema.js
// 1Line OS Enterprise Real Estate Schema & Data Model
// Conforms to Dr. Mahmoud Elbaz / 1Line Official Company Playbook (Sohag Resale & Cairo Developer Hub)

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

export function generatePropertyCode(city = 'SOH', sector = 'E', sequenceNumber = 1) {
  const seqStr = String(sequenceNumber).padStart(3, '0');
  const sectorCode = sector.toUpperCase().slice(0, 2);
  return `${city}-${sectorCode}-${seqStr}`;
}

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
  const deadline = new Date(now.getTime() + (7 * 24 * 60 * 60 * 1000));
  return {
    personId,
    specifications,
    inventoryAssignee,
    openedAt: now.toISOString(),
    deadline: deadline.toISOString(),
    status: 'open',
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
    slaHours: def.slaHours,
    assignee,
    relatedEntityId,
    createdAt: now.toISOString(),
    dueAt: dueAt.toISOString(),
    status: 'pending',
    completedAt: null
  };
}

