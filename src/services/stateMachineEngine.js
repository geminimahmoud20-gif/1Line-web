// src/services/stateMachineEngine.js
// 1Line OS Stage Machine (State Machine with Stage Gate Deliverables & Inter-Departmental Handoffs)
// Implements Dr. Mahmoud Elbaz / 1Line Official Company Playbook rules.

import { createHandoffTask } from '../models/schema.js';

export const HIGH_VALUE_DEAL_THRESHOLD = 5_000_000; // 5 Million EGP threshold requires Founder Sign-off

export const STAGE_DEFINITIONS = {
  // ── BUYER PIPELINE ──────────────────────────────────────────────────────────
  new: {
    id: 'new',
    title_ar: 'جديد (طلب وارد)',
    title_en: 'New Inquiry',
    ownerDept: 'ops',
    slaHours: 0.25, // 15 mins during business hours
    requiredDeliverable: 'تسجيل المصدر وموافقة العميل (قانون 151/2020)',
    handoffTo: 1
  },
  qualified: {
    id: 'qualified',
    title_ar: 'مؤهل (ملف مشترٍ)',
    title_en: 'Qualified',
    ownerDept: 'sales',
    slaHours: 24, // 24 hours
    requiredDeliverable: 'استبيان التأهيل الخماسي (الميزانية، طريقة الدفع، المنطقة، الغرض، مهلة القرار)',
    handoffTo: 3
  },
  matched: {
    id: 'matched',
    title_ar: 'مطابق (3 ترشيحات / طلب بحث)',
    title_en: 'Matched',
    ownerDept: 'sales',
    slaHours: 48, // 48 hours
    requiredDeliverable: '3 ترشيحات مكتوبة (الأقرب/القيمة/التحدي) أو فتح طلب بحث موجّه للمخزون',
    handoffTo: 4
  },
  site_visit: {
    id: 'site_visit',
    title_ar: 'معاينة (مجدولة / منفذة)',
    title_en: 'Site Visit',
    ownerDept: 'sales',
    slaHours: 168, // 7 days
    requiredDeliverable: 'تقرير معاينة مكتوب وتغذية راجعة من العميل',
    handoffTo: null
  },
  negotiating: {
    id: 'negotiating',
    title_ar: 'عرض وتفاوض',
    title_en: 'Negotiation & Offer',
    ownerDept: 'sales',
    slaHours: 72,
    requiredDeliverable: 'عرض شراء مكتوب واستيفاء بنود البوابة 2',
    handoffTo: 7
  },
  closing: {
    id: 'closing',
    title_ar: 'حجز وعقود (البوابة 3)',
    title_en: 'Contract & Gate 3',
    ownerDept: 'founder',
    slaHours: 48,
    requiredDeliverable: 'قائمة تدقيق البوابة 3 موثقة من المؤسس والمحامي',
    handoffTo: 8
  },
  closed: {
    id: 'closed',
    title_ar: 'صفقة مغلقة وتحصيل',
    title_en: 'Closed Won',
    ownerDept: 'founder',
    slaHours: 24,
    requiredDeliverable: 'تسجيل السعر المنفذ وفاتورة العمولة وجدول التحصيل',
    handoffTo: 9
  },
  lost: {
    id: 'lost',
    title_ar: 'صفقة خاسرة / مغلقة',
    title_en: 'Closed Lost',
    ownerDept: 'sales',
    slaHours: null,
    requiredDeliverable: 'سبب الخسارة الإلزامي وملاحظات التحليل',
    handoffTo: null
  }
};

export const VALID_LOST_REASONS = [
  'price', // سعر
  'timing', // توقيت
  'competitor', // منافس
  'not_interested', // لم يعد مهتماً
  'no_response' // لا يوجد رد
];

/**
 * Validates whether a lead/opportunity can transition to a target stage.
 * Enforces mandatory deliverables, high-value founder escalation, and validation gates.
 */
export function validateStageTransition(lead, targetStageId, context = {}) {
  const currentStageId = lead.status || 'new';

  // 1. Same stage is a no-op
  if (currentStageId === targetStageId) {
    return { allowed: true, reason: null, nextTask: null };
  }

  // 2. Transitioning to 'lost' requires mandatory lost reason
  if (targetStageId === 'lost') {
    const lostReason = context.lostReason || lead.lostReason;
    if (!lostReason || !VALID_LOST_REASONS.includes(lostReason)) {
      return {
        allowed: false,
        deliverableKey: 'lost_reason',
        missingDeliverable: 'سبب الخسارة إلزامي (سعر، توقيت، منافس، لم يعد مهتماً، لا رد)',
        reason: 'Missing mandatory lost reason'
      };
    }
    return { allowed: true, reason: null, nextTask: null };
  }

  // 3. Transition to 'qualified' requires the 5 qualification questions (BuyerProfile)
  if (targetStageId === 'qualified') {
    const profile = lead.buyerProfile || context.buyerProfile || lead.details;
    const hasBudget = profile?.budget || (profile?.budgetMin && profile?.budgetMax);
    const hasPayment = profile?.paymentMethod;
    const hasArea = profile?.area || profile?.targetSectors?.length > 0;
    const hasPurpose = profile?.purpose;

    if (!hasBudget || !hasPayment || !hasArea || !hasPurpose) {
      return {
        allowed: false,
        deliverableKey: 'buyer_profile',
        missingDeliverable: 'ملف المشتري المؤهل غير مكتمل: يلزم تسجيل الميزانية، وطريقة الدفع، والمنطقة، والغرض.',
        reason: 'Incomplete buyer qualification questions'
      };
    }
  }

  // 4. Transition to 'matched' requires at least 3 nominations OR an open search request
  if (targetStageId === 'matched') {
    const nominationsCount = (lead.nominations?.length || 0) + (context.nominations?.length || 0);
    const hasSearchRequest = lead.hasOpenSearchRequest || context.hasOpenSearchRequest;

    if (nominationsCount < 3 && !hasSearchRequest) {
      return {
        allowed: false,
        deliverableKey: 'nominations_or_search_request',
        missingDeliverable: 'المخرج الإلزامي: يلزم اعتماد 3 ترشيحات مكتوبة (الأقرب/القيمة/التحدي) أو فتح طلب بحث موجّه للمخزون.',
        reason: 'Requires 3 written nominations or an open SearchRequest'
      };
    }
  }

  // 5. Transition to 'proposal' / 'negotiating' requires completed site visit report
  if (targetStageId === 'negotiating' || targetStageId === 'proposal') {
    const hasVisitReport = lead.siteVisitReport || context.siteVisitReport || lead.siteVisit?.completed;
    if (!hasVisitReport) {
      return {
        allowed: false,
        deliverableKey: 'site_visit_report',
        missingDeliverable: 'المخرج الإلزامي: يلزم تسجيل تقرير المعاينة وتغذية راجعة من العميل قبل الانتقال للتفاوض.',
        reason: 'Missing completed site visit report'
      };
    }

    // High value threshold check: if deal >= 5M, founder escalation is mandatory
    const expectedValue = lead.details?.budget || lead.expectedValue || context.offerValue || 0;
    if (expectedValue >= HIGH_VALUE_DEAL_THRESHOLD) {
      const isFounderApproved = context.isFounderApproved || context.userRole === 'super_admin';
      if (!isFounderApproved) {
        return {
          allowed: false,
          deliverableKey: 'founder_high_value_approval',
          missingDeliverable: `صفقة كبرى (≥ ${HIGH_VALUE_DEAL_THRESHOLD.toLocaleString('ar-EG')} ج): يلزم تصعيد العرض للمؤسس (د. محمود الباز) واعتماده قبل المتابعة.`,
          reason: 'High-value deal requires Founder sign-off'
        };
      }
    }
  }

  // 6. Transition to 'closing' / 'contract' requires Gate 2 passed and written offer
  if (targetStageId === 'closing') {
    const gate2Passed = lead.gate2Passed || context.gate2Passed;
    const hasOffer = lead.writtenOffer || context.writtenOffer;
    if (!gate2Passed || !hasOffer) {
      return {
        allowed: false,
        deliverableKey: 'gate2_and_written_offer',
        missingDeliverable: 'المخرج الإلزامي: يلزم استيفاء بنود البوابة 2 (تأكيد السعر والتوفر ومذكرة العقار) ووجود عرض شراء مكتوب.',
        reason: 'Requires Gate 2 checklist and written purchase offer'
      };
    }
  }

  // 7. Transition to 'closed' requires Gate 3 checklist passed and executed price
  if (targetStageId === 'closed') {
    const gate3Passed = lead.gate3Passed || context.gate3Passed;
    const executedPrice = lead.executedPrice || context.executedPrice;
    if (!gate3Passed || !executedPrice || executedPrice <= 0) {
      return {
        allowed: false,
        deliverableKey: 'gate3_and_executed_price',
        missingDeliverable: 'المخرج الإلزامي: يلزم استيفاء البوابة 3 القانونية الموقّعة وتسجيل السعر المنفذ وفاتورة العمولة.',
        reason: 'Requires Gate 3 checklist signed and executed price recorded'
      };
    }
  }

  // Generate the corresponding Next Task for the next department
  let nextTask = null;
  const targetDef = STAGE_DEFINITIONS[targetStageId];
  if (targetDef?.handoffTo) {
    try {
      nextTask = createHandoffTask(targetDef.handoffTo, lead.id, lead.assignedTo);
    } catch {
      nextTask = null;
    }
  }

  return {
    allowed: true,
    reason: null,
    nextTask
  };
}
