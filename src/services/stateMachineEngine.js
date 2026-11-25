// src/services/stateMachineEngine.js
// 1Line OS Stage Machine (State Machine with Stage Gate Deliverables & Inter-Departmental Handoffs)
// Implements Dr. Mahmoud Elbaz / 1Line Official Company Playbook rules.

import { createHandoffTask } from '../models/schema.js';
import { pipelineKind, askingPriceOf } from '../utils/leadPipeline.js';
import { LOST_REASONS } from '../utils/crmLeadViews.js';

export const HIGH_VALUE_DEAL_THRESHOLD = 5_000_000; // 5 Million EGP threshold requires Founder Sign-off

/**
 * Checks whether a lead represents a property seller/owner rather than a buyer.
 */
export function isSellerLead(lead = {}) {
  const type = String(lead?.type || '').trim().toLowerCase();
  if (type === 'seller' || type === 'owner') return true;
  if (lead?.landingPage === '/sell') return true;
  if (lead?.details?.isSeller || lead?.isSeller) return true;
  if (lead?.details?.askingPrice || lead?.askingPrice) return true;
  if (lead?.details?.propertyType && (lead?.details?.size || lead?.details?.address)) return true;
  return false;
}

export const SELLER_STAGE_DEFINITIONS = {
  // ── SELLER / LISTING PIPELINE ──────────────────────────────────────────────
  new: {
    id: 'new',
    title_ar: 'عروض بيع جديدة (طلب وارد)',
    title_en: 'New Listing Inquiries',
    ownerDept: 'ops',
    slaHours: 0.25, // 15 mins during business hours
    requiredDeliverable: 'تسجيل مصدر العرض وبيانات الاتصال بالمالك',
    handoffTo: 1
  },
  qualified: {
    id: 'qualified',
    title_ar: 'مؤهل (تأكيد الملكية والمواصفات)',
    title_en: 'Qualified Seller',
    ownerDept: 'inventory',
    slaHours: 24, // 24 hours
    requiredDeliverable: 'تأكيد السعر المطلوب، المنطقة، نوع العقار والمساحة وسند الملكية الأولي',
    handoffTo: 3
  },
  site_visit: {
    id: 'site_visit',
    title_ar: 'معاينة وتقييم وتصوير العقار',
    title_en: 'Inspection & Valuation',
    ownerDept: 'inventory',
    slaHours: 72, // 3 days
    requiredDeliverable: 'تقرير معاينة الوحدة وتحديد السعر العادل ورفع الصور',
    handoffTo: 4
  },
  negotiating: {
    id: 'negotiating',
    title_ar: 'عقد وساطة / اتفاقية حصرية',
    title_en: 'Mandate & Exclusivity Agreement',
    ownerDept: 'sales',
    slaHours: 48,
    requiredDeliverable: 'توقيع عقد الوساطة العقارية أو تفويض البيع والاتفاق النهائي على السعر',
    handoffTo: 7
  },
  closing: {
    id: 'closing',
    title_ar: 'معروض للتسويق واستقبال المشترين',
    title_en: 'Active Marketing & Buyer Matching',
    ownerDept: 'marketing',
    slaHours: 168,
    requiredDeliverable: 'نشر العقار بالمحفظة أو المنصة ومطابقته بطلبات المشترين',
    handoffTo: 8
  },
  closed: {
    id: 'closed',
    title_ar: 'صفقة ناجحة (تم البيع والتحصيل)',
    title_en: 'Sold & Commission Collected',
    ownerDept: 'founder',
    slaHours: 24,
    requiredDeliverable: 'تسجيل السعر المنفذ النهائي وتوقيع العقد واستلام عمولة الوساطة',
    handoffTo: 9
  },
  lost: {
    id: 'lost',
    title_ar: 'عرض ملغي / بيع خارجي',
    title_en: 'Listing Cancelled / Lost',
    ownerDept: 'inventory',
    slaHours: null,
    requiredDeliverable: 'سبب إلغاء العرض أو البيع خارج الشركة',
    handoffTo: null
  }
};

export const STAGE_DEFINITIONS = {
  // ── BUYER PIPELINE ──────────────────────────────────────────────────────────
  new: {
    id: 'new',
    title_ar: 'جديد (طلب وارد)',
    title_en: 'New Inquiry',
    ownerDept: 'ops',
    requiredDeliverable: 'تسجيل المصدر وموافقة العميل (قانون 151/2020)',
    handoffTo: 1
  },
  site_visit: {
    id: 'site_visit',
    title_ar: 'معاينة (مجدولة / منفذة)',
    title_en: 'Site Visit',
    ownerDept: 'sales',
    requiredDeliverable: 'تقرير معاينة مكتوب وتغذية راجعة من العميل',
    handoffTo: null
  },
  negotiating: {
    id: 'negotiating',
    title_ar: 'عرض وتفاوض',
    title_en: 'Negotiation & Offer',
    ownerDept: 'sales',
    requiredDeliverable: 'عرض شراء مكتوب واستيفاء بنود البوابة 2',
    handoffTo: 7
  },
  closing: {
    id: 'closing',
    title_ar: 'حجز وعقود (البوابة 3)',
    title_en: 'Contract & Gate 3',
    ownerDept: 'founder',
    requiredDeliverable: 'قائمة تدقيق البوابة 3 موثقة من المؤسس والمحامي',
    handoffTo: 8
  },
  closed: {
    id: 'closed',
    title_ar: 'صفقة مغلقة وتحصيل',
    title_en: 'Closed Won',
    ownerDept: 'founder',
    requiredDeliverable: 'تسجيل السعر المنفذ وفاتورة العمولة وجدول التحصيل',
    handoffTo: 9
  },
  inactive: {
    id: 'inactive',
    title_ar: 'غير متفاعل',
    title_en: 'Unresponsive',
    ownerDept: 'sales',
    requiredDeliverable: null,
    handoffTo: null
  },
  lost: {
    id: 'lost',
    title_ar: 'صفقة خاسرة / مغلقة',
    title_en: 'Closed Lost',
    ownerDept: 'sales',
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

  const isSeller = isSellerLead(lead);

  // ── SELLER PIPELINE VALIDATIONS ──────────────────────────────────────────
  if (isSeller) {
    // Transition to 'qualified' requires seller property facts (Property type, Area, and Price or Size)
    if (targetStageId === 'qualified') {
      const details = lead.details || {};
      const hasPropType = lead.propertyType || details.propertyType;
      const hasArea = lead.area || details.area || lead.location || details.district;
      const hasPriceOrSize = details.askingPrice || details.expectedPrice || lead.budget || details.budget || details.size || details.estimatedAvg || lead.expectedValue;

      if (!hasPropType || !hasArea || !hasPriceOrSize) {
        return {
          allowed: false,
          deliverableKey: 'seller_property_profile',
          missingDeliverable: 'ملف عقار المالك غير مكتمل: يلزم تسجيل نوع العقار، والمنطقة، والسعر المطلوب أو المساحة.',
          reason: 'Incomplete seller property facts'
        };
      }
    }

    // Transition to 'negotiating' requires property valuation or completed inspection
    if (targetStageId === 'negotiating' || targetStageId === 'proposal') {
      const details = lead.details || {};
      const hasValuation = lead.askingPrice || details.askingPrice || details.expectedPrice || details.estimatedAvg || lead.siteVisit?.completed || lead.siteVisitReport || context.hasValuation;
      if (!hasValuation) {
        return {
          allowed: false,
          deliverableKey: 'seller_asking_price',
          missingDeliverable: 'المخرج الإلزامي: يلزم تسجيل تقرير معاينة وتقييم العقار أو الاتفاق على السعر قبل التفاوض على العقد.',
          reason: 'Missing seller property valuation or inspection'
        };
      }

      // High value threshold check: if seller deal >= 5M, founder escalation is mandatory
      const expectedValue = details.askingPrice || details.expectedPrice || lead.expectedValue || context.offerValue || 0;
      if (expectedValue >= HIGH_VALUE_DEAL_THRESHOLD) {
        const isFounderApproved = context.isFounderApproved || context.userRole === 'super_admin';
        if (!isFounderApproved) {
          return {
            allowed: false,
            deliverableKey: 'founder_high_value_approval',
            missingDeliverable: `صفقة عقار كبرى (≥ ${HIGH_VALUE_DEAL_THRESHOLD.toLocaleString('ar-EG')} ج): يلزم تصعيد العقار للمؤسس (د. محمود الباز) واعتماده قبل المتابعة.`,
            reason: 'High-value seller deal requires Founder sign-off'
          };
        }
      }
    }

    // Transition to 'closed' requires executed price
    if (targetStageId === 'closed') {
      const executedPrice = lead.executedPrice || context.executedPrice || lead.details?.askingPrice;
      if (!executedPrice || Number(executedPrice) <= 0) {
        return {
          allowed: false,
          deliverableKey: 'seller_executed_price',
          missingDeliverable: 'المخرج الإلزامي: يلزم تسجيل السعر المنفذ النهائي لصفقة البيع لحساب عمولة الوساطة.',
          reason: 'Requires executed sale price'
        };
      }
    }

    // Generate Next Task from SELLER_STAGE_DEFINITIONS
    let nextTask = null;
    const targetDef = SELLER_STAGE_DEFINITIONS[targetStageId];
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

  // ── BUYER PIPELINE VALIDATIONS ──────────────────────────────────────────

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

/**
 * Transforms an inter-departmental handoff deliverable into an actionable CRM Task in crm_tasks collection.
 */
export function handoffToCrmTask(nextTask, lead = {}, currentUser = {}) {
  if (!nextTask) return null;
  const deptLabelsAr = {
    ops: 'إدارة العمليات',
    inventory: 'قسم حصر وتثمين العقارات',
    sales: 'فريق المبيعات',
    marketing: 'فريق التسويق',
    founder: 'الإدارة العليا / المؤسس'
  };
  const dept = deptLabelsAr[nextTask.toDept] || nextTask.toDept || 'الفريق المختص';
  const due = nextTask.dueAt ? nextTask.dueAt.slice(0, 10) : new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  return {
    title: `[تسليم ${dept}] ${nextTask.name}`,
    note: `إحالة رسمية بين الإدارات: من ${deptLabelsAr[nextTask.fromDept] || nextTask.fromDept} إلى ${dept}. مهلة الإنجاز: ${nextTask.slaHours || 24} ساعة.`,
    dueAt: due,
    priority: (nextTask.slaHours && nextTask.slaHours <= 24) ? 'high' : 'normal',
    status: 'open',
    kind: 'other',
    leadId: String(lead.id || nextTask.relatedEntityId || ''),
    leadName: String(lead.name || 'عميل').slice(0, 40),
    assigneeUid: String(currentUser?.uid || 'system'),
    assigneeName: dept,
    createdBy: String(currentUser?.uid || 'system'),
    createdByName: String(currentUser?.displayName || '1Line OS'),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

