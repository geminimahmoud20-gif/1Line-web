import { isAgriculturalType, isIndustrialType } from '../../utils/propertyKinds.js';

/**
 * The kinds of buyer request, shared by the «عندك عقار للبيع؟» search and the category pills,
 * so a search and a pill with the same name always show the same requests.
 */
export const DEMAND_CATEGORIES = [
  { id: 'apartment', label_ar: 'شقق سكنية', single_ar: 'شقة سكنية', label_en: 'Apartments', test: (t) => t === 'apartment' },
  { id: 'villa', label_ar: 'فيلات ومنازل', single_ar: 'فيلا أو بيت', label_en: 'Villas & houses', test: (t) => t === 'villa' || t === 'house' },
  { id: 'retail', label_ar: 'محلات وتجاري', single_ar: 'محل تجاري', label_en: 'Shops & retail', test: (t) => ['retail', 'commercial', 'shop', 'showroom'].includes(t) },
  { id: 'office', label_ar: 'مكاتب وعيادات', single_ar: 'مكتب أو عيادة', label_en: 'Offices & clinics', test: (t) => ['office', 'administrative', 'clinic', 'medical'].includes(t) },
  { id: 'land', label_ar: 'أراضي', single_ar: 'أرض', label_en: 'Land', test: (t) => t === 'land' || t === 'building' },
  { id: 'agricultural', label_ar: 'زراعي', single_ar: 'أرض زراعية', label_en: 'Agricultural', test: (t) => isAgriculturalType(t) },
  { id: 'industrial', label_ar: 'صناعي', single_ar: 'مصنع أو مخزن', label_en: 'Industrial', test: (t) => isIndustrialType(t) }
];

/** Whether a request of `type` belongs to category `id` ('all' or '' = every request) */
export const inDemandCategory = (type, id) => {
  if (!id || id === 'all') return true;
  const cat = DEMAND_CATEGORIES.find((c) => c.id === id);
  return cat ? cat.test(type) : type === id;
};

/** «طلب واحد» / «طلبين» / «3 طلبات» / «11 طلب»: Arabic counts read naturally */
export const requestsCountAr = (n) => {
  if (n === 1) return 'طلب واحد مطابق';
  if (n === 2) return 'طلبين مطابقين';
  if (n >= 3 && n <= 10) return `${n} طلبات مطابقة`;
  return `${n} طلب مطابق`;
};
