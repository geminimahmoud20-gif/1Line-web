// Constants shared by ClientAccountPage.jsx and its extracted sections.
import { getAreas, normalizeAreaKey } from '../utils/areasData';
import { areaLabel } from '../utils/placeLabels';

export const LEAD_TYPE_NAMES = {
  buyer: 'شراء عقار',
  seller: 'عرض عقار للبيع',
  buyer_instant: 'ترشيح عقار فوري',
  buyer_demand: 'طلب شراء معلن',
  viewing_request: 'طلب معاينة ميدانية',
  visit: 'طلب معاينة ميدانية',
  investor: 'استثمار عقاري VIP',
  bespoke_request: 'طلب عقار خاص VIP',
  special_request: 'طلب عقار خاص VIP',
  financing: 'استفسار تمويل وتقسيط',
  valuation: 'طلب تقييم عقاري',
  broker: 'انضمام وسيط عقاري',
  trade_in: 'طلب تبديل عقار',
  instant_quote: 'طلب تسعير فوري',
  client_account: 'تسجيل حساب عميل',
  client_account_verified: 'تفعيل حساب عميل' // older leads
};

export function getLeadTypeDisplayName(type, isAr = true) {
  if (!type) return isAr ? 'استشارة عقارية' : 'Inquiry';
  const cleanKey = String(type).trim().toLowerCase();
  if (LEAD_TYPE_NAMES[cleanKey]) return isAr ? LEAD_TYPE_NAMES[cleanKey] : cleanKey;
  if (cleanKey.startsWith('buyer')) return isAr ? 'طلب شراء عقار' : 'Buyer Request';
  if (cleanKey.startsWith('seller')) return isAr ? 'عرض عقار للبيع' : 'Seller Offer';
  if (cleanKey.includes('invest')) return isAr ? 'استثمار عقاري VIP' : 'VIP Investment';
  if (cleanKey.includes('visit') || cleanKey.includes('view')) return isAr ? 'طلب معاينة ميدانية' : 'Viewing Request';
  return isAr ? 'استشارة عقارية' : cleanKey.replace(/_/g, ' ');
}

export const PROPERTY_TYPE_NAMES = {
  apartment: 'شقة سكنية',
  retail: 'محل تجاري',
  villa: 'فيلا / تاون هاوس',
  office: 'مكتب إداري / عيادة',
  land: 'قطعة أرض',
  building: 'عمارة سكنية / تجارية',
  clinic: 'عيادة طبية',
  chalet: 'شاليه',
  commercial: 'تجاري',
  residential: 'سكني',
  administrative: 'إداري',
  industrial_land: 'أرض صناعية',
  agri_land: 'أرض زراعية',
  farm: 'مزرعة / حديقة فاكهة',
  factory: 'مصنع / ورشة',
  warehouse: 'مخزن / مستودع',
  townhouse: 'تاون هاوس',
  duplex: 'دوبلكس',
  penthouse: 'بنتهاوس',
  roof: 'رووف',
  studio: 'استوديو',
  medical: 'مركز طبي / صيدلية'
};

export function getPropertyTypeDisplayName(propType, isAr = true) {
  if (!propType) return '';
  const cleanKey = String(propType).trim().toLowerCase().replace(/[-\s]+/g, '_');
  if (PROPERTY_TYPE_NAMES[cleanKey]) return isAr ? PROPERTY_TYPE_NAMES[cleanKey] : cleanKey;
  if (cleanKey.includes('industrial')) return isAr ? 'أرض صناعية' : 'Industrial Land';
  if (cleanKey.includes('agri') || cleanKey.includes('farm')) return isAr ? 'أرض زراعية' : 'Agricultural Land';
  if (cleanKey.includes('villa')) return isAr ? 'فيلا / تاون هاوس' : 'Villa';
  if (cleanKey.includes('apart')) return isAr ? 'شقة سكنية' : 'Apartment';
  if (cleanKey.includes('land')) return isAr ? 'قطعة أرض' : 'Land';
  if (cleanKey.includes('shop') || cleanKey.includes('retail') || cleanKey.includes('commercial')) return isAr ? 'محل تجاري' : 'Retail / Shop';
  if (cleanKey.includes('office') || cleanKey.includes('admin')) return isAr ? 'مكتب إداري' : 'Office';
  if (/[؀-ۿ]/.test(propType)) return propType;
  return isAr ? 'عقار متنوع' : cleanKey.replace(/_/g, ' ');
}

export const STAGE_CONFIG = {
  new: { ar: 'طلب جديد (قيد التعيين)', en: 'New Inquiry', color: '#0284c7', bg: 'rgba(2, 132, 199, 0.12)' },
  contacted: { ar: 'تم التواصل الأولي', en: 'Contacted', color: '#7c3aed', bg: 'rgba(124, 58, 237, 0.12)' },
  site_visit: { ar: 'معاينة مجدولة مؤكدة 🚗', en: 'Site Visit Scheduled', color: '#d97706', bg: 'rgba(217, 119, 6, 0.14)' },
  negotiating: { ar: 'قيد التفاوض والتقييم', en: 'Negotiation', color: '#ea580c', bg: 'rgba(234, 88, 12, 0.14)' },
  closing: { ar: 'إجراءات حجز وتعاقد', en: 'Closing / Deposit', color: '#059669', bg: 'rgba(5, 150, 105, 0.14)' },
  closed: { ar: 'صفقة ناجحة ومكتملة 🎉', en: 'Completed', color: '#16a34a', bg: 'rgba(22, 163, 74, 0.14)' },
  inactive: { ar: 'غير متفاعل / معلق', en: 'Inactive / On Hold', color: '#64748b', bg: 'rgba(100, 116, 139, 0.12)' },
  lost: { ar: 'ملغي / غير متاح', en: 'Cancelled / Archived', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.12)' }
};

// A listed unit's own status (set in CRM → العقارات), shown to its owner/broker in «وحداتي»
export const LISTING_STATUS_CONFIG = {
  published: { ar: 'معروضة ومتاحة', en: 'Live & available', color: '#059669', bg: 'rgba(5, 150, 105, 0.12)' },
  under_negotiation: { ar: 'تحت التفاوض', en: 'Under negotiation', color: '#d97706', bg: 'rgba(217, 119, 6, 0.14)' },
  sold: { ar: 'اتباعت', en: 'Sold', color: '#64748b', bg: 'rgba(100, 116, 139, 0.12)' },
  hidden: { ar: 'مخفية حالياً (قيد المراجعة)', en: 'Hidden (under review)', color: '#b91c1c', bg: 'rgba(185, 28, 28, 0.1)' }
};

export function getAreaDisplayName(areaKey, lang = 'ar') {
  if (!areaKey) return lang === 'ar' ? 'سوهاج' : 'Sohag';
  const normKey = normalizeAreaKey(areaKey);
  const areas = getAreas();
  const found = areas.find(a => a.id === normKey || a.id === areaKey);
  if (found) {
    return lang === 'ar' ? (found.name_ar || found.label_ar) : (found.name_en || found.label_en || found.name_ar);
  }
  // An old id (east, kawthar…) shows its old name, never a code; anything else is just "Sohag"
  const legacy = areaLabel(areaKey, lang === 'ar');
  if (legacy && legacy !== areaKey) return legacy;
  return /[؀-ۿ]/.test(areaKey) ? areaKey : (lang === 'ar' ? 'سوهاج' : 'Sohag');
}
