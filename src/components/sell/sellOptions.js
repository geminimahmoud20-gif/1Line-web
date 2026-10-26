import { Building, Home, Store, Briefcase, MapPin, Sprout, Trees, Factory, Warehouse, LandPlot } from 'lucide-react';

export const PROPERTY_TYPES = [
  { id: 'apartment', ar: 'شقة', en: 'Apartment', icon: Building },
  { id: 'villa', ar: 'بيت أو فيلا', en: 'House / villa', icon: Home },
  { id: 'retail', ar: 'محل', en: 'Shop', icon: Store },
  { id: 'office', ar: 'مكتب أو عيادة', en: 'Office / clinic', icon: Briefcase },
  { id: 'land', ar: 'أرض مباني', en: 'Building land', icon: MapPin },
  { id: 'agri_land', ar: 'أرض زراعية', en: 'Farmland', icon: Sprout },
  { id: 'farm', ar: 'مزرعة أو حديقة فاكهة', en: 'Farm / orchard', icon: Trees },
  { id: 'factory', ar: 'مصنع أو ورشة', en: 'Factory / workshop', icon: Factory },
  { id: 'warehouse', ar: 'مخزن', en: 'Warehouse', icon: Warehouse },
  { id: 'industrial_land', ar: 'أرض صناعية', en: 'Industrial land', icon: LandPlot }
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
  { id: 'core', ar: 'على الطوب (من غير تشطيب)', en: 'Core & shell', multiplier: 0.86 },
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
  agri_land: [
    {
      field: 'agriWater', ar: 'الري', en: 'Irrigation', def: 'nile', options: [
        { value: 'nile', ar: 'ري نيلي (ترعة)', en: 'Nile canal' },
        { value: 'well', ar: 'بئر', en: 'Well' },
        { value: 'drip', ar: 'تنقيط أو رش', en: 'Drip / sprinkler' },
        { value: 'none', ar: 'مفيش مصدر ري لسه', en: 'No water yet' }
      ]
    },
    {
      field: 'agriPapers', ar: 'الأوراق', en: 'Papers', def: 'holding', options: [
        { value: 'holding', ar: 'حيازة زراعية', en: 'Farm holding' },
        { value: 'registered', ar: 'عقد مسجل', en: 'Registered deed' },
        { value: 'preliminary', ar: 'عقد ابتدائي', en: 'Preliminary contract' },
        { value: 'reclaimed', ar: 'استصلاح / تقنين', en: 'Reclaimed / legalised' }
      ]
    }
  ],
  farm: [
    {
      field: 'agriCrops', ar: 'المزروع', en: 'Planted with', def: 'palms', options: [
        { value: 'palms', ar: 'نخيل', en: 'Palms' },
        { value: 'citrus', ar: 'موالح', en: 'Citrus' },
        { value: 'mango', ar: 'مانجو', en: 'Mango' },
        { value: 'mixed', ar: 'فاكهة متنوعة', en: 'Mixed fruit' },
        { value: 'field', ar: 'محاصيل (قمح، برسيم…)', en: 'Field crops' }
      ]
    },
    {
      field: 'agriWater', ar: 'الري', en: 'Irrigation', def: 'nile', options: [
        { value: 'nile', ar: 'ري نيلي (ترعة)', en: 'Nile canal' },
        { value: 'well', ar: 'بئر', en: 'Well' },
        { value: 'drip', ar: 'تنقيط أو رش', en: 'Drip / sprinkler' },
        { value: 'none', ar: 'مفيش مصدر ري لسه', en: 'No water yet' }
      ]
    }
  ],
  factory: [
    {
      field: 'indActivity', ar: 'النشاط', en: 'Activity', def: 'food', options: [
        { value: 'food', ar: 'مواد غذائية', en: 'Food' },
        { value: 'building', ar: 'مواد بناء', en: 'Building materials' },
        { value: 'textile', ar: 'ملابس ونسيج', en: 'Textiles' },
        { value: 'workshop', ar: 'ورشة (نجارة، حدادة…)', en: 'Workshop' },
        { value: 'other', ar: 'نشاط تاني', en: 'Other' }
      ]
    },
    {
      field: 'indLicensed', ar: 'الترخيص', en: 'Licence', def: 'licensed', options: [
        { value: 'licensed', ar: 'مرخص وشغال', en: 'Licensed, operating' },
        { value: 'licensed_idle', ar: 'مرخص ومتوقف', en: 'Licensed, idle' },
        { value: 'unlicensed', ar: 'من غير ترخيص', en: 'Not licensed' }
      ]
    }
  ],
  warehouse: [
    {
      field: 'indCeiling', ar: 'ارتفاع السقف', en: 'Ceiling height', def: 'mid', options: [
        { value: 'low', ar: 'أقل من 5 متر', en: 'Under 5 m' },
        { value: 'mid', ar: 'من 5 لـ 8 متر', en: '5-8 m' },
        { value: 'high', ar: 'أكتر من 8 متر', en: 'Over 8 m' }
      ]
    },
    {
      field: 'indAccess', ar: 'دخول العربيات', en: 'Vehicle access', def: 'truck', options: [
        { value: 'truck', ar: 'تريلا تدخل', en: 'Trailers' },
        { value: 'light', ar: 'نقل خفيف بس', en: 'Light trucks only' }
      ]
    }
  ],
  industrial_land: [
    {
      field: 'indZone', ar: 'المكان', en: 'Location', def: 'zone', options: [
        { value: 'zone', ar: 'منطقة صناعية حكومية', en: 'Government industrial zone' },
        { value: 'desert', ar: 'ظهير صحراوي', en: 'Desert hinterland' },
        { value: 'other', ar: 'مكان تاني', en: 'Elsewhere' }
      ]
    },
    {
      field: 'indUtilities', ar: 'المرافق', en: 'Utilities', def: 'full', options: [
        { value: 'full', ar: 'كهرباء ومياه وصرف', en: 'Power, water, drainage' },
        { value: 'partial', ar: 'مرافق جزئية', en: 'Partial' },
        { value: 'none', ar: 'مفيش مرافق لسه', en: 'None yet' }
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
  if (type === 'agri_land' || type === 'farm') return optLabel('agriWater', 'أرض زراعية');
  if (type === 'warehouse') return optLabel('indCeiling', '');
  if (type === 'factory' || type === 'industrial_land') return '';
  if (type === 'villa') return `${answers.totalFloors || '2'} أدوار`;
  return optLabel('floor', '');
}
