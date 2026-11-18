// Property kinds beyond homes and shops: agricultural (أراضي زراعية، مزارع) and industrial
// (مصانع، مخازن، أراضي صناعية). One place that says, for a type id, which family it belongs to,
// whether rooms/floors make sense, how its size is read (feddan for farmland) and which extra
// fields the CRM asks for and the unit page shows. Pure; shared by the site, the CRM and imports.

export const AGRICULTURAL_TYPES = ['agri_land', 'farm'];
export const INDUSTRIAL_TYPES = ['factory', 'warehouse', 'industrial_land'];

const LAND_TYPES = new Set(['land', 'agri_land', 'industrial_land']);
const NO_ROOM_TYPES = new Set(['commercial', 'office', ...LAND_TYPES, ...AGRICULTURAL_TYPES, ...INDUSTRIAL_TYPES]);

export const isAgriculturalType = (type) => AGRICULTURAL_TYPES.includes(type);
export const isIndustrialType = (type) => INDUSTRIAL_TYPES.includes(type);
/** Bare land: no rooms, bathrooms, floors or finishing */
export const isLandType = (type) => LAND_TYPES.has(type);
/** No bedrooms (land, shops, offices, farms, factories, warehouses) */
export const hasNoRooms = (type) => NO_ROOM_TYPES.has(type);

export const isAgricultural = (p) => isAgriculturalType(p?.type) || p?.category === 'agricultural';
export const isIndustrial = (p) => isIndustrialType(p?.type) || p?.category === 'industrial';

/** The category stored next to the type (filters, reports, market stats) */
export function categoryOfType(type) {
  if (isAgriculturalType(type)) return 'agricultural';
  if (isIndustrialType(type)) return 'industrial';
  if (type === 'commercial') return 'commercial';
  if (type === 'office') return 'administrative';
  if (type === 'land') return 'land';
  if (type === 'building') return 'building';
  return 'residential';
}

// Egyptian land measures: 1 feddan = 24 qirat = 4,200.83 m²
export const FEDDAN_M2 = 4200.83;
export const QIRAT_M2 = FEDDAN_M2 / 24;

/** { feddan, qirat } from square metres, qirat rounded to the nearest whole one */
export function feddanParts(m2) {
  const totalQirat = Math.round((Number(m2) || 0) / QIRAT_M2);
  return { feddan: Math.floor(totalQirat / 24), qirat: totalQirat % 24 };
}

/** "3 فدان و12 قيراط" / "3 feddan 12 qirat"; '' when there is no size */
export function formatFeddan(m2, isAr = true) {
  if (!(Number(m2) > 0)) return '';
  const { feddan, qirat } = feddanParts(m2);
  if (feddan === 0 && qirat === 0) return isAr ? 'أقل من قيراط' : 'under 1 qirat';
  const parts = [];
  if (feddan > 0) parts.push(isAr ? `${feddan} فدان` : `${feddan} feddan`);
  if (qirat > 0) parts.push(isAr ? `${qirat} قيراط` : `${qirat} qirat`);
  return parts.join(isAr ? ' و' : ' ');
}

/** Size the way buyers read it: feddan for farmland, m² for everything else */
export function sizeLabel(p, isAr = true) {
  const m2 = Number(p?.size);
  if (!(m2 > 0)) return '';
  const metres = `${m2.toLocaleString('en-US')} ${isAr ? 'م²' : 'm²'}`;
  return isAgricultural(p) && m2 >= QIRAT_M2 ? formatFeddan(m2, isAr) : metres;
}

/** Price per feddan for farmland (0 when price or size is missing) */
export function pricePerFeddan(p) {
  const price = Number(p?.price);
  const m2 = Number(p?.size);
  return price > 0 && m2 > 0 ? Math.round((price / m2) * FEDDAN_M2) : 0;
}

// Extra details per family: asked in the CRM form, shown on the unit page when filled
export const SPEC_FIELDS = {
  agricultural: [
    { key: 'agriWater', ar: 'مصدر الري', en: 'Irrigation', hint_ar: 'نيلي / بئر / تنقيط / رش', hint_en: 'Nile canal / well / drip' },
    { key: 'agriSoil', ar: 'نوع التربة', en: 'Soil', hint_ar: 'طينية / صفراء / رملية مستصلحة', hint_en: 'Clay / sandy, reclaimed' },
    { key: 'agriCrops', ar: 'المزروع حالياً', en: 'Current crops', hint_ar: 'نخيل، موالح، قمح، فاضية', hint_en: 'Palms, citrus, wheat, empty' },
    { key: 'agriPapers', ar: 'الأوراق والحيازة', en: 'Papers & holding', hint_ar: 'حيازة زراعية / عقد مسجل / وضع يد', hint_en: 'Farm holding / registered deed' },
    { key: 'roadAccess', ar: 'الطريق', en: 'Road access', hint_ar: 'على طريق أسفلت / مدق 200م', hint_en: 'On a paved road / 200m track' },
    { key: 'agriBuildings', ar: 'المباني والملحقات', en: 'Buildings', hint_ar: 'استراحة، حظيرة، مخزن، ماكينة ري', hint_en: 'Rest house, barn, store, pump' }
  ],
  industrial: [
    { key: 'indActivity', ar: 'النشاط / الترخيص', en: 'Activity / licence', hint_ar: 'مصنع مواد غذائية مرخص', hint_en: 'Licensed food factory' },
    { key: 'indBuiltArea', ar: 'المساحة المبنية', en: 'Built area', hint_ar: '1200 م² هناجر + 200 م² إداري', hint_en: '1,200 m² hangars + 200 m² offices' },
    { key: 'indPower', ar: 'قدرة الكهرباء', en: 'Power supply', hint_ar: 'محول 500 ك.ف.أ', hint_en: '500 kVA transformer' },
    { key: 'indCeiling', ar: 'ارتفاع السقف', en: 'Ceiling height', hint_ar: '8 متر', hint_en: '8 m' },
    { key: 'indUtilities', ar: 'المرافق', en: 'Utilities', hint_ar: 'غاز طبيعي، مياه، صرف صناعي', hint_en: 'Gas, water, industrial drainage' },
    { key: 'roadAccess', ar: 'الطريق والتحميل', en: 'Access & loading', hint_ar: 'على الطريق الدائري، بوابة تريلات', hint_en: 'On the ring road, truck gate' }
  ]
};

/** The extra fields for a type ([] for homes, shops, offices, building land) */
export const specFieldsFor = (type) =>
  isAgriculturalType(type) ? SPEC_FIELDS.agricultural : isIndustrialType(type) ? SPEC_FIELDS.industrial : [];

/** Filled extra details of a listing: [{ key, label, value }] */
export const filledSpecs = (p, isAr = true) =>
  specFieldsFor(p?.type)
    .filter((f) => String(p?.[f.key] || '').trim())
    .map((f) => ({ key: f.key, label: isAr ? f.ar : f.en, value: String(p[f.key]).trim() }));
