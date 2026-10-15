import { Building, Home, Store, Briefcase, MapPin } from 'lucide-react';

export const PROPERTY_TYPES = [
  { id: 'apartment', ar: 'شقة', en: 'Apartment', icon: Building },
  { id: 'villa', ar: 'بيت أو فيلا', en: 'House / villa', icon: Home },
  { id: 'retail', ar: 'محل', en: 'Shop', icon: Store },
  { id: 'office', ar: 'مكتب أو عيادة', en: 'Office / clinic', icon: Briefcase },
  { id: 'land', ar: 'أرض', en: 'Land', icon: MapPin }
];

// Greater Cairo: no automated benchmark yet, valued by hand
export const CAIRO_AREAS = [
  { id: 'cairo_new_cairo', ar: 'القاهرة الجديدة والتجمع', en: 'New Cairo' },
  { id: 'cairo_zayed', ar: 'الشيخ زايد', en: 'Sheikh Zayed' },
  { id: 'cairo_october', ar: 'السادس من أكتوبر', en: '6th of October' },
  { id: 'cairo_capital', ar: 'العاصمة الإدارية', en: 'New Administrative Capital' },
  { id: 'cairo_other', ar: 'منطقة تانية في القاهرة الكبرى', en: 'Other Greater Cairo area' }
];

// Per-m² fallback when a district has no average set in the CRM
export const FALLBACK_M2 = { east: 21500, new_sohag: 17800, corniche: 31000, thakafa: 15200, center: 18500, kawthar: 12000 };

export const FINISHING = [
  { id: 'ultra_lux', ar: 'ألترا سوبر لوكس', en: 'Ultra super lux', multiplier: 1.25 },
  { id: 'super_lux', ar: 'سوبر لوكس', en: 'Super lux', multiplier: 1.15 },
  { id: 'lux', ar: 'لوكس', en: 'Lux', multiplier: 1.05 },
  { id: 'semi', ar: 'نص تشطيب (محارة وحلوق)', en: 'Semi-finished', multiplier: 1 },
  { id: 'core', ar: 'طوب أحمر (من غير تشطيب)', en: 'Core & shell', multiplier: 0.86 },
  { id: 'furnished', ar: 'مفروش بالكامل', en: 'Fully furnished', multiplier: 1.35 },
  { id: 'mixed', ar: 'أدوار متشطبة وأدوار لأ', en: 'Partly finished', multiplier: 1.08 },
  { id: 'under_construction', ar: 'تحت الإنشاء', en: 'Under construction', multiplier: 0.9 }
];

export const LEGAL_DOCS = [
  { id: 'registered_deed', ar: 'عقد مسجل شهر عقاري', en: 'Registered deed' },
  { id: 'cadastral_registry', ar: 'سجل عيني', en: 'Cadastral registry' },
  { id: 'court_valid_enforceable', ar: 'حكم صحة ونفاذ', en: 'Validity & enforcement ruling' },
  { id: 'signature_validity', ar: 'حكم صحة توقيع', en: 'Signature validity ruling' },
  { id: 'preliminary_contract', ar: 'عقد بيع ابتدائي', en: 'Preliminary contract' },
  { id: 'city_authority_allocation', ar: 'تخصيص من جهاز المدينة', en: 'City authority allocation' },
  { id: 'building_permit', ar: 'رخصة بناء', en: 'Building permit' },
  { id: 'form10_reconciliation', ar: 'نموذج 10 تصالح', en: 'Form 10 reconciliation' },
  { id: 'power_of_attorney', ar: 'توكيل بالبيع', en: 'Power of attorney' },
  { id: 'inheritance_deed', ar: 'إعلام وراثة', en: 'Inheritance deed' },
  { id: 'utility_meters', ar: 'عدادات باسم المالك', en: 'Utility meters in owner name' }
];

const floors = (max) => [
  { value: 'ground', ar: 'أرضي', en: 'Ground' },
  ...Array.from({ length: max }, (_, i) => ({ value: String(i + 1), ar: `الدور ${i + 1}`, en: `Floor ${i + 1}` })),
  { value: `${max + 1}+`, ar: `الدور ${max + 1} أو أعلى`, en: `Floor ${max + 1}+` }
];

// The two type-specific questions on step 2: [field, label, options]
export const SPEC_FIELDS = {
  apartment: [
    { field: 'floor', ar: 'الدور', en: 'Floor', def: '3', options: [...floors(12), { value: 'top', ar: 'دور أخير وروف', en: 'Top floor + roof' }] },
    { field: 'rooms', ar: 'عدد الأوض', en: 'Bedrooms', def: '3', options: ['1', '2', '3', '4', '5+'].map((v) => ({ value: v, ar: v, en: v })) }
  ],
  villa: [
    { field: 'totalFloors', ar: 'عدد الأدوار', en: 'Floors', def: '2', options: ['1', '2', '3', '4', '5', '6', '7+'].map((v) => ({ value: v, ar: v, en: v })) },
    { field: 'rooms', ar: 'عدد الأوض', en: 'Bedrooms', def: '5', options: ['3', '5', '7', '9', '12+'].map((v) => ({ value: v, ar: v, en: v })) }
  ],
  retail: [
    {
      field: 'retailFloor', ar: 'مكان المحل', en: 'Position', def: 'ground', options: [
        { value: 'ground', ar: 'أرضي على الشارع', en: 'Street level' },
        { value: 'mezzanine', ar: 'ميزانين', en: 'Mezzanine' },
        { value: 'mall_ground', ar: 'أرضي في مول', en: 'Mall ground floor' },
        { value: 'mall_upper', ar: 'دور علوي في مول', en: 'Mall upper floor' },
        { value: 'basement', ar: 'بدروم', en: 'Basement' }
      ]
    }
  ],
  office: [
    { field: 'floor', ar: 'الدور', en: 'Floor', def: '2', options: floors(12) },
    {
      field: 'divisionCount', ar: 'التقسيم', en: 'Layout', def: '2', options: [
        { value: 'open', ar: 'مساحة مفتوحة', en: 'Open space' },
        { value: '1', ar: 'أوضة واحدة', en: '1 room' },
        { value: '2', ar: 'أوضتين وريسبشن', en: '2 rooms + reception' },
        { value: '3', ar: '3 أوض وريسبشن', en: '3 rooms + reception' },
        { value: '4+', ar: '4 أوض أو أكتر', en: '4+ rooms' }
      ]
    }
  ],
  land: [
    {
      field: 'landStreet', ar: 'الشارع', en: 'Street', def: 'wide_20', options: [
        { value: 'wide_20', ar: 'رئيسي 20 متر أو أكتر', en: 'Main, 20 m+' },
        { value: 'mid_16', ar: '16 متر', en: '16 m' },
        { value: 'internal_12', ar: 'داخلي 10 - 12 متر', en: 'Internal 10-12 m' }
      ]
    },
    {
      field: 'landZoning', ar: 'الاستخدام', en: 'Zoning', def: 'residential_license', options: [
        { value: 'residential_license', ar: 'مباني سكنية', en: 'Residential' },
        { value: 'commercial_mixed', ar: 'سكني تجاري', en: 'Mixed use' },
        { value: 'investment', ar: 'استثماري', en: 'Investment' }
      ]
    }
  ]
};

/** The floor text the CRM shows for each kind (it reads details.floor as a label). */
export function floorLabel(answers) {
  const type = answers.propertyType || 'apartment';
  const pick = (field) => SPEC_FIELDS[type]?.find((f) => f.field === field);
  const optLabel = (field, fallback) => {
    const spec = pick(field);
    const value = answers[field] || spec?.def;
    return spec?.options.find((o) => o.value === value)?.ar || fallback;
  };
  if (type === 'retail') return optLabel('retailFloor', 'أرضي على الشارع');
  if (type === 'land') return optLabel('landStreet', 'أرض فضاء');
  if (type === 'villa') return `${answers.totalFloors || '2'} أدوار`;
  return optLabel('floor', '');
}
