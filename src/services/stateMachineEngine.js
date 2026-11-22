// src/services/stateMachineEngine.js
// 1Line OS Stage Machine (State Machine with Stage Gate Deliverables & Inter-Departmental Handoffs)
// Implements Dr. Mahmoud Elbaz / 1Line Official Company Playbook rules.

import { createHandoffTask } from '../models/schema.js';
import { pipelineKind, askingPriceOf } from '../utils/leadPipeline.js';
import { LOST_REASONS } from '../utils/crmLeadViews.js';

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
  inactive: {
    id: 'inactive',
    title_ar: 'غير متفاعل',
    title_en: 'Unresponsive',
    ownerDept: 'sales',
    slaHours: null,
    requiredDeliverable: null,
    handoffTo: null
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

// Every reason the team can pick in the lost-reason window (utils/crmLeadViews LOST_REASONS: buyer, owner and shared),
// plus the older ids saved on past records. The list used to be five fixed ids, so most picks were refused.
export const VALID_LOST_REASONS = [
  ...LOST_REASONS.map((r) => r.id),
  'timing', // توقيت
  'competitor', // منافس
  'not_interested' // لم يعد مهتماً
];

/**
 * Validates whether a lead/opportunity can transition to a target stage.
 * Enforces mandatory deliverables, high-value founder escalation, and validation gates.
 */
export function validateStageTransition(lead, targetStageId, context = {}) {
  const currentStageId = lead.status || 'new';

  // Same stage is a no-op
  if (currentStageId === targetStageId) {
    return { allowed: true, reason: null, nextTask: null };
  }

  // Transitioning to 'lost' requires mandatory lost reason
  if (targetStageId === 'lost') {
    const lostReason = context.lostReason || lead.lostReason;
    if (!lostReason || !VALID_LOST_REASONS.includes(lostReason)) {
      return {
        allowed: false,
        deliverableKey: 'lost_reason',
        missingDeliverable: 'سبب الخسارة إلزامي: اختار السبب من القايمة',
        reason: 'Missing mandatory lost reason'
      };
    }
    return { allowed: true, reason: null, nextTask: null };
  }

  // An owner selling a property has its own pipeline (utils/leadPipeline): no buyer profile,
  // no 3 nominations and no viewing report, but a price to list it at before it is offered
  const isSeller = pipelineKind(lead) === 'seller';
  if (isSeller && targetStageId === 'negotiating') {
    const asking = askingPriceOf(lead) || Number(context.askingPrice) || 0;
    if (!asking) {
      return {
        allowed: false,
        deliverableKey: 'seller_asking_price',
        missingDeliverable: 'قبل ما نعرض العقار: سجّل السعر اللي المالك عايزه بعد المعاينة والتقييم.',
        reason: 'Seller needs an asking price before the unit is listed'
      };
    }
  }

  // A buyer reaches negotiation only after a completed site visit report
  if (!isSeller && targetStageId === 'negotiating') {
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

  // Transition to 'closing' / 'contract' requires Gate 2 passed and written offer
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

  // Transition to 'closed' requires Gate 3 checklist passed and executed price.
  //    «إغلاق» is one stage now: a deal that did not go through the old «closing» step still has to show
  //    the Gate 2 checklist and the written offer, so no control is lost by skipping that step.
  if (targetStageId === 'closed') {
    if (currentStageId !== 'closing') {
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
