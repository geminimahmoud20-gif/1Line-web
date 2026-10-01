// Constants shared by ClientAccountPage.jsx and its extracted sections.
import { getAreas, normalizeAreaKey } from '../utils/areasData';

export const LEAD_TYPE_NAMES = {
  buyer: 'شراء عقار',
  seller: 'عرض عقار للبيع',
  investor: 'استثمار عقاري VIP',
  bespoke_request: 'طلب عقار خاص VIP',
  financing: 'استفسار تمويل وتقسيط',
  valuation: 'طلب تقييم عقاري',
  client_account_verified: 'تفعيل حساب عميل'
};

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
  administrative: 'إداري'
};

export const STAGE_CONFIG = {
  new: { ar: 'طلب جديد (قيد التعيين)', en: 'New Inquiry', color: '#0284c7', bg: 'rgba(2, 132, 199, 0.12)' },
  contacted: { ar: 'تم التواصل الأولي', en: 'Contacted', color: '#7c3aed', bg: 'rgba(124, 58, 237, 0.12)' },
  site_visit: { ar: 'معاينة مجدولة مؤكدة 🚗', en: 'Site Visit Scheduled', color: '#d97706', bg: 'rgba(217, 119, 6, 0.14)' },
  negotiating: { ar: 'قيد التفاوض والتقييم', en: 'Negotiation', color: '#ea580c', bg: 'rgba(234, 88, 12, 0.14)' },
  closing: { ar: 'إجراءات حجز وتعاقد', en: 'Closing / Deposit', color: '#059669', bg: 'rgba(5, 150, 105, 0.14)' },
  closed: { ar: 'صفقة ناجحة ومكتملة 🎉', en: 'Completed', color: '#16a34a', bg: 'rgba(22, 163, 74, 0.14)' }
};

export function getAreaDisplayName(areaKey, lang = 'ar') {
  if (!areaKey) return lang === 'ar' ? 'سوهاج' : 'Sohag';
  const normKey = normalizeAreaKey(areaKey);
  const areas = getAreas();
  const found = areas.find(a => a.id === normKey || a.id === areaKey);
  if (found) {
    return lang === 'ar' ? (found.name_ar || found.label_ar) : (found.name_en || found.label_en);
  }
  return areaKey;
}
