// =============================================================
//  Display labels for CRM values that are stored as English keys.
//  Translate at render time: stored records (including existing Firestore leads)
//  keep their original values, so nothing needs migrating.
// =============================================================

const FOLLOW_UP_AR = {
  'Pending Contact': 'بانتظار التواصل',
  'First Call Done': 'تمت المكالمة الأولى',
  'Valuation Shared': 'أُرسل التقييم',
  'Contract Review': 'مراجعة العقد',
  'ROI Presentation Sent': 'أُرسل عرض العائد',
  'Site Visit Scheduled': 'معاينة مجدولة',
  'Negotiation': 'قيد التفاوض',
  'Closed': 'تم الإغلاق'
};

const LEAD_TYPE_AR = {
  buyer: 'مشتري',
  seller: 'بائع',
  investor: 'مستثمر',
  broker: 'وسيط عقاري',
  buyer_demand: 'طلب شراء',
  reservation_request: 'طلب حجز',
  viewing_request: 'طلب معاينة'
};

/** Follow-up / next-action note in the UI language (free text passes through unchanged) */
export function formatFollowUp(value, isAr = true) {
  if (!value) return '';
  const v = String(value).trim();
  return isAr ? (FOLLOW_UP_AR[v] || v) : v;
}

export function formatLeadType(value, isAr = true) {
  if (!value) return '';
  return isAr ? (LEAD_TYPE_AR[value] || value) : value;
}

/** Budget as "3,500,000 ج.م" whether stored as a number or a formatted string */
export function formatBudget(value, isAr = true) {
  if (value === undefined || value === null || value === '') return '';
  const n = typeof value === 'number' ? value : Number(String(value).replace(/[^\d.]/g, ''));
  if (!Number.isFinite(n) || n <= 0) return String(value);
  return `${Math.round(n).toLocaleString('en-US')} ${isAr ? 'ج.م' : 'EGP'}`;
}
