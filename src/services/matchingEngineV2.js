// src/services/matchingEngineV2.js
// 1Line OS Multi-Criteria Real Estate Matching Engine (Version 2)
// Implements 1Line Official Playbook: Multi-factor scoring, Negative/Dislike filtering,
// 3-Tier Nomination Pack generation, and Automated SearchRequest fallback with 7-day SLA.

import { createNominationPack, createSearchRequestDraft } from '../models/schema.js';
import { normalizeAreaKey } from '../utils/areasData.js';

export const MATCH_THRESHOLDS = {
  EXCELLENT: 85,
  GOOD: 70,
  SUITABLE: 60,
  MINIMUM_FOR_NOMINATION: 60
};

/**
 * Calculates a multi-factor score (0 - 100) comparing a Buyer Profile or Lead with an Inventory Property.
 * Respects negative filters (rejected options, disliked developers, Gate 1 failures).
 */
export function calculateMatchScore(buyerProfileOrLead, property, options = {}) {
  if (!buyerProfileOrLead || !property) {
    return {
      score: 0,
      isExcluded: true,
      exclusionReason: 'Missing lead or property data',
      breakdown: { area: 0, budget: 0, type: 0, purpose: 0, developer: 0 },
      reasons: []
    };
  }

  // Extract lead / profile criteria
  const profile = buyerProfileOrLead.buyerProfile || buyerProfileOrLead.details || buyerProfileOrLead;
  
  // ── 1. NEGATIVE & EXCLUSION FILTERING ───────────────────────────────────────
  // A) Deleted or Hidden Properties
  if (property.isDeleted || property.status === 'trash' || property.status === 'hidden' || property.status === 'sold') {
    return {
      score: 0,
      isExcluded: true,
      exclusionReason: 'العقار غير متاح أو تم بيعه/حذفه',
      breakdown: { area: 0, budget: 0, type: 0, purpose: 0, developer: 0 },
      reasons: []
    };
  }

  // B) Rejection History (Client previously declined this specific property)
  const rejectedPropertyIds = new Set([
    ...(buyerProfileOrLead.rejectedPropertyIds || []),
    ...(profile.rejectedPropertyIds || []),
    ...((profile.rejectedOptions || []).map(r => r.propertyId))
  ]);

  if (rejectedPropertyIds.has(property.id)) {
    return {
      score: 0,
      isExcluded: true,
      exclusionReason: 'العقار مرفوض مسبقاً من قِبل العميل',
      breakdown: { area: 0, budget: 0, type: 0, purpose: 0, developer: 0 },
      reasons: []
    };
  }

  // C) Developer Exclusion / Disliked Developers
  const dislikedDevs = new Set([
    ...(buyerProfileOrLead.dislikedDeveloperIds || []),
    ...(profile.dislikedDeveloperIds || [])
  ]);

  if (property.developerId && dislikedDevs.has(property.developerId)) {
    return {
      score: 0,
      isExcluded: true,
      exclusionReason: 'المطور العقاري مستبعد برغبة العميل',
      breakdown: { area: 0, budget: 0, type: 0, purpose: 0, developer: 0 },
      reasons: []
    };
  }

  // D) Gate 1 Failure (Unverified or rejected technical/legal check)
  if (property.gate1Passed === false) {
    return {
      score: 0,
      isExcluded: true,
      exclusionReason: 'العقار لم يستوفِ تدقيق البوابة 1 (الفحص القانوني/الفني)',
      breakdown: { area: 0, budget: 0, type: 0, purpose: 0, developer: 0 },
      reasons: []
    };
  }

  // ── 2. MULTI-FACTOR SCORING (100 Points Total) ──────────────────────────────
  let areaScore = 0;
  let budgetScore = 0;
  let typeScore = 0;
  let purposeScore = 0;
  let developerScore = 0;
  const reasons = [];

  // A. AREA FACTOR (25 Points Max)
  const propAreaKey = normalizeAreaKey(property.areaKey || property.area);
  const targetAreas = [
    ...(profile.targetSectors || []),
    ...(profile.targetNeighborhoods || []),
    ...(profile.targetCities || []),
    profile.area,
    buyerProfileOrLead.area
  ].filter(Boolean).map(a => normalizeAreaKey(a));

  if (targetAreas.length > 0) {
    if (targetAreas.includes(propAreaKey) || targetAreas.includes('all')) {
      areaScore = 25;
      reasons.push('نفس المنطقة المستهدفة');
    } else {
      areaScore = 10;
      reasons.push('منطقة قريبة ضمن نطاق المحافظة');
    }
  } else {
    areaScore = 15;
  }

  // B. BUDGET FACTOR (25 Points Max)
  const propPrice = typeof property.price === 'number'
    ? property.price
    : parseInt(String(property.price || 0).replace(/[^0-9]/g, ''), 10) || 0;

  const budgetMin = profile.budgetMin || 0;
  const budgetMax = profile.budgetMax || profile.budget || buyerProfileOrLead.budget || 0;

  if (budgetMax > 0 && propPrice > 0) {
    const diffRatio = (propPrice - budgetMax) / budgetMax;

    if (diffRatio <= 0 && propPrice >= budgetMin) {
      budgetScore = 25;
      reasons.push('مطابق للميزانية المحددة');
    } else if (diffRatio <= 0.10 && diffRatio > 0) {
      budgetScore = 20;
      reasons.push('ضمن هامش التحدي (+10% كحد أقصى)');
    } else if (diffRatio < 0 && propPrice < budgetMin) {
      budgetScore = 22;
      reasons.push('أقل من الحد الأدنى للميزانية (توفير للعميل)');
    } else if (diffRatio <= 0.20) {
      budgetScore = 14;
      reasons.push('يتطلب زيادة ميزانية (+15-20%)');
    } else {
      budgetScore = 0;
    }
  } else {
    budgetScore = 12;
  }

  // C. PROPERTY TYPE FACTOR (20 Points Max)
  const propType = (property.type || property.category || '').toLowerCase();
  const targetTypes = [
    ...(profile.propertyTypes || []),
    profile.propertyType,
    buyerProfileOrLead.propertyType
  ].filter(Boolean).map(t => String(t).toLowerCase());

  if (targetTypes.length > 0) {
    if (targetTypes.includes(propType) || targetTypes.includes('all')) {
      typeScore = 20;
      reasons.push('نفس نوع العقار المطلوب');
    } else if (
      (targetTypes.includes('office') && propType === 'administrative') ||
      (targetTypes.includes('administrative') && propType === 'office') ||
      (targetTypes.includes('retail') && propType === 'commercial')
    ) {
      typeScore = 16;
      reasons.push('نوع عقار متقارب ومناسب للاستخدام');
    } else {
      typeScore = 5;
    }
  } else {
    typeScore = 12;
  }

  // D. PURPOSE & SUITABILITY FACTOR (15 Points Max)
  const purpose = (profile.purpose || 'residence').toLowerCase();
  if (purpose.includes('invest') || purpose.includes('استثمار')) {
    const hasRoi = Boolean(property.expectedRoi || property.rentalYield || property.monthlyInstallment);
    if (hasRoi) {
      purposeScore = 15;
      reasons.push('فرصة استثمارية ذات عائد وخطة سداد ملائمة');
    } else {
      purposeScore = 10;
    }
  } else if (purpose.includes('clinic') || purpose.includes('عيادة') || purpose.includes('commercial') || purpose.includes('تجاري')) {
    if (propType === 'clinic' || propType === 'retail' || propType === 'commercial') {
      purposeScore = 15;
      reasons.push('مرخص ومؤهل للنشاط التجاري/الطبي المطلوب');
    } else {
      purposeScore = 5;
    }
  } else {
    const wantedRooms = profile.roomsMin || 1;
    const propRooms = Number(property.bedrooms || property.rooms || 0);
    if (propRooms >= wantedRooms) {
      purposeScore = 15;
      reasons.push('سكن ملائم بعدد غرف مستوفٍ لاحتياج الأسرة');
    } else {
      purposeScore = 10;
    }
  }

  // E. DEVELOPER & VERIFICATION SCORECARD (15 Points Max)
  if (property.gate1Passed === true) {
    developerScore += 10;
    reasons.push('مفحوص ومجاز رسمياً عبر البوابة 1');
  } else {
    developerScore += 5;
  }

  if (property.developerScorecard?.isApproved || property.developerScorecard?.totalScore >= 3.5) {
    developerScore += 5;
    reasons.push('مطور معتمد بالفئة الأولى');
  } else if (!property.developerId) {
    developerScore += 5;
  }

  const totalScore = Math.min(100, Math.round(areaScore + budgetScore + typeScore + purposeScore + developerScore));

  return {
    score: totalScore,
    isExcluded: false,
    exclusionReason: null,
    breakdown: {
      area: areaScore,
      budget: budgetScore,
      type: typeScore,
      purpose: purposeScore,
      developer: developerScore
    },
    reasons
  };
}

/**
 * Evaluates all inventory properties for a given lead, filters out exclusions,
 * and generates a 3-tier nomination pack (Closest, Value, Challenge).
 * If suitable matches are fewer than 3, auto-generates a SearchRequest with 7-day SLA.
 */
export function rankAndNominateProperties(buyerProfileOrLead, properties = [], options = {}) {
  if (!buyerProfileOrLead) {
    return {
      matches: [],
      nominationPack: [],
      canAssemble3TierPack: false,
      needsSearchRequest: true,
      searchRequestDraft: null
    };
  }

  const personId = buyerProfileOrLead.personId || buyerProfileOrLead.id || 'lead_temp';

  // 1. Score every active property
  const evaluated = properties
    .map(prop => {
      const result = calculateMatchScore(buyerProfileOrLead, prop, options);
      return {
        property: prop,
        ...result
      };
    })
    .filter(item => !item.isExcluded && item.score >= (options.minScore || MATCH_THRESHOLDS.SUITABLE))
    .sort((a, b) => b.score - a.score);

  // 2. Select Tier 1: Closest Match (الأقرب للطلب)
  const closestItem = evaluated[0] || null;

  // 3. Select Tier 2: Best Value (القيمة)
  let valueItem = null;
  if (evaluated.length > 1) {
    const candidates = evaluated.slice(1);
    valueItem = candidates.reduce((best, curr) => {
      const bestPricePerM = (best.property.price || 0) / (best.property.size || 1);
      const currPricePerM = (curr.property.price || 0) / (curr.property.size || 1);
      return currPricePerM < bestPricePerM ? curr : best;
    }, candidates[0]);
  }

  // 4. Select Tier 3: Challenge Option (التحدي)
  let challengeItem = null;
  if (evaluated.length > 2) {
    const remaining = evaluated.filter(i => i.property.id !== closestItem?.property.id && i.property.id !== valueItem?.property.id);
    challengeItem = remaining[0] || evaluated[2];
  }

  // Check if we have 3 distinct properties
  const canAssemble3TierPack = Boolean(closestItem && valueItem && challengeItem &&
    closestItem.property.id !== valueItem.property.id &&
    valueItem.property.id !== challengeItem.property.id &&
    closestItem.property.id !== challengeItem.property.id
  );

  let nominationPack = [];
  if (canAssemble3TierPack) {
    nominationPack = createNominationPack(
      personId,
      {
        id: closestItem.property.id,
        writtenRationale: `الأقرب: يطابق طلبك بنسبة ${closestItem.score}% (${closestItem.reasons.join('، ')})`
      },
      {
        id: valueItem.property.id,
        writtenRationale: `القيمة: أفضل سعر للمتر المربع وخطة سداد ملائمة (${valueItem.score}%)`
      },
      {
        id: challengeItem.property.id,
        writtenRationale: `التحدي: خيار استثماري استثنائي بقيمة مضافة وتسهيلات سداد (${challengeItem.score}%)`
      }
    );
  }

  // 5. Automated SearchRequest Detection (7-Day SLA fallback)
  const needsSearchRequest = !canAssemble3TierPack;
  let searchRequestDraft = null;

  if (needsSearchRequest) {
    const specs = {
      leadName: buyerProfileOrLead.name,
      phone: buyerProfileOrLead.phone,
      targetArea: buyerProfileOrLead.area || buyerProfileOrLead.details?.area || 'سوهاج',
      budget: buyerProfileOrLead.budget || buyerProfileOrLead.details?.budget || 0,
      propertyType: buyerProfileOrLead.propertyType || buyerProfileOrLead.details?.propertyType || 'apartment',
      purpose: buyerProfileOrLead.buyerProfile?.purpose || 'residence',
      matchedInventoryCount: evaluated.length
    };
    searchRequestDraft = createSearchRequestDraft(personId, specs, options.inventoryAssignee || 'Engy');
  }

  return {
    matches: evaluated,
    nominationPack,
    canAssemble3TierPack,
    needsSearchRequest,
    searchRequestDraft,
    count: evaluated.length
  };
}

/**
 * Formats a 3-tier nomination pack into a professional client WhatsApp message.
 */
export function formatNominationWhatsAppPitch(lead, nominationPack, propertiesMap = {}) {
  const clientName = lead.name || 'العميل الكريم';
  
  if (!nominationPack || nominationPack.length < 3) {
    return `مرحباً أستاذ ${clientName}، نقوم حالياً بالبحث في مخزون 1Line لتجهيز باقة الترشيحات الثلاثية المخصصة لطلبكم بدقة.`;
  }

  const [tier1, tier2, tier3] = nominationPack;
  const prop1 = propertiesMap[tier1.propertyId] || { title_ar: 'الخيار الأقرب', price: 0 };
  const prop2 = propertiesMap[tier2.propertyId] || { title_ar: 'خيار القيمة', price: 0 };
  const prop3 = propertiesMap[tier3.propertyId] || { title_ar: 'خيار التحدي', price: 0 };

  return `🏛️ *شركة 1Line للحلول العقارية — باقة الترشيحات العقارية المعتمدة*

أهلاً بك أستاذ *${clientName}* المحترم،
بناءً على جلسة التأهيل المسجلة لطلبكم، يسعدنا تقديم باقة الترشيحات الثلاثية الرسمية (قاعدة 1Line الذهبية):

1️⃣ *الخيار الأقرب (طابق المعايير):*
🏢 ${prop1.title_ar || 'وحدة مطابقة'}
💰 السعر: ${prop1.price ? prop1.price.toLocaleString('en-US') + ' ج.م' : 'متاح عند المعاينة'}
📝 ${tier1.writtenRationale}

2️⃣ *خيار القيمة (أفضل عائد وسعر للمتر):*
🏢 ${prop2.title_ar || 'وحدة القيمة المضافة'}
💰 السعر: ${prop2.price ? prop2.price.toLocaleString('en-US') + ' ج.م' : 'متاح عند المعاينة'}
📝 ${tier2.writtenRationale}

3️⃣ *خيار التحدي (أفق استثماري مميز):*
🏢 ${prop3.title_ar || 'وحدة التحدي'}
💰 السعر: ${prop3.price ? prop3.price.toLocaleString('en-US') + ' ج.م' : 'متاح عند المعاينة'}
📝 ${tier3.writtenRationale}

📍 *الخطوة التالية:* يسعدنا ترتيب موعد المعاينة الميدانية للخيارات المناسبة لحضرتك بصحبة المستشار العقاري المعتمد.
هل يناسبك موعد غداً في الفترة الصباحية أم المسائية؟`;
}
