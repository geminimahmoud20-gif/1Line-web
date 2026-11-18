// Two short badges a listing can show to visitors, each one optional (set in the CRM):
//   availability: follows the publishing status (متاح / قيد التفاوض / تم البيع), or hidden
//   review:       مراجَع ومعتمد / قيد المراجعة / لم يُراجَع بعد, or hidden
// Pure; used by the card, the unit page and the CRM preview.

export const AVAILABILITY_MODES = ['auto', 'hide'];
export const REVIEW_STATES = ['verified', 'in_review', 'not_reviewed', 'none'];

const AVAILABILITY = {
  available: { tone: 'available', ar: 'متاح', en: 'Available', hint_ar: 'الوحدة متاحة للمعاينة والحجز', hint_en: 'Open for viewing and reservation' },
  negotiating: { tone: 'negotiating', ar: 'قيد التفاوض', en: 'Under offer', hint_ar: 'فيه تفاوض جاري عليها دلوقتي، ممكن تسجّل اهتمامك', hint_en: 'An offer is being negotiated; you can still register interest' },
  sold: { tone: 'sold', ar: 'تم البيع', en: 'Sold', hint_ar: 'الوحدة اتباعت، اطلب وحدة مشابهة', hint_en: 'This unit is sold; ask for a similar one' }
};

const REVIEW = {
  verified: { tone: 'verified', ar: 'مراجَع ومعتمد', en: 'Reviewed & approved', hint_ar: 'راجعنا المستندات والوحدة على الطبيعة', hint_en: 'Documents and the unit were checked on site' },
  in_review: { tone: 'in-review', ar: 'قيد المراجعة', en: 'Under review', hint_ar: 'بنراجع المستندات دلوقتي', hint_en: 'Documents are being reviewed now' },
  not_reviewed: { tone: 'not-reviewed', ar: 'لم يُراجَع بعد', en: 'Not reviewed yet', hint_ar: 'المستندات لسه متراجعتش، بنراجعها معاك قبل أي حجز', hint_en: 'Documents not reviewed yet; we review them with you before any reservation' }
};

const availabilityKey = (status) => {
  if (status === 'sold') return 'sold';
  if (status === 'under_negotiation') return 'negotiating';
  if (!status || status === 'published') return 'available';
  return null; // hidden / draft / trash never reach visitors
};

/** The review state stored on a listing. Older listings with a legal record count as verified. */
export const reviewState = (p = {}) => {
  if (REVIEW_STATES.includes(p.reviewBadge)) return p.reviewBadge;
  return p.legalStatus ? 'verified' : 'none';
};

const shape = (def, key, isAr) => def && { key, tone: def.tone, label: isAr ? def.ar : def.en, hint: isAr ? def.hint_ar : def.hint_en };

/**
 * { availability, review }: each { key, tone, label, hint } or null when hidden.
 * Sample listings (isDemo) show neither.
 */
export function listingBadges(p = {}, isAr = true) {
  if (!p || p.isDemo) return { availability: null, review: null };
  const aKey = p.availabilityBadge === 'hide' ? null : availabilityKey(p.status);
  const rKey = reviewState(p);
  // "لم يُراجَع بعد" only puts visitors off; it stays a CRM note and never shows on the site
  return {
    availability: aKey ? shape(AVAILABILITY[aKey], aKey, isAr) : null,
    review: rKey !== 'none' && rKey !== 'not_reviewed' ? shape(REVIEW[rKey], rKey, isAr) : null
  };
}

/** Labels for the CRM selects. */
export const REVIEW_OPTIONS = [
  { value: 'verified', ar: 'مراجَع ومعتمد', en: 'Reviewed & approved' },
  { value: 'in_review', ar: 'قيد المراجعة', en: 'Under review' },
  { value: 'not_reviewed', ar: 'لم يُراجَع بعد (للفريق بس، مش بتظهر للزوار)', en: 'Not reviewed yet (staff only, not shown)' },
  { value: 'none', ar: 'بدون شارة (مخفية)', en: 'No badge (hidden)' }
];
export const AVAILABILITY_OPTIONS = [
  { value: 'auto', ar: 'تظهر حسب حالة النشر (متاح / قيد التفاوض / تم البيع)', en: 'Show from the status (available / under offer / sold)' },
  { value: 'hide', ar: 'مخفية', en: 'Hidden' }
];
