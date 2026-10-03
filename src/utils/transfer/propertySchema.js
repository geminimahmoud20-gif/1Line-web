// =============================================================
//  Properties ⇄ spreadsheets.
//  • FIELDS: each 1Line field with the column names it is recognised by (Arabic, English, other
//    systems' exports such as Notion). The export uses the first name, so an exported file
//    imports back with every column matched.
//  • rowToProperty(): one spreadsheet row → a 1Line property + the owner's contact (kept apart:
//    property documents are public, owner phones are not).
// =============================================================

import { normKey, stripLinks, parseNumber, parseCount, parseDate, normalizePhone } from './normalize.js';

export const PROPERTY_FIELDS = [
  { key: 'unitCode', label: 'كود الوحدة', aliases: ['كود الوحده', 'كود العقار', 'كود', 'رقم الوحده', 'code', 'unit code', 'ref', 'reference', 'id'] },
  { key: 'title_ar', label: 'اسم العقار', aliases: ['اسم العقار', 'عنوان العقار', 'الوحده', 'العقار', 'اسم الوحده', 'title', 'name', 'unit', 'property'] },
  { key: 'title_en', label: 'اسم العقار بالإنجليزية', aliases: ['اسم العقار بالانجليزيه', 'title en', 'english title'] },
  { key: 'type', label: 'نوع العقار', aliases: ['نوع العقار', 'النوع', 'نوع الوحده', 'type', 'property type', 'category'] },
  { key: 'areaKey', label: 'المنطقة (الحي)', aliases: ['المنطقه الحي', 'الحي', 'المنطقه', 'المدينه', 'district', 'area', 'city', 'zone'] },
  { key: 'locationDetail', label: 'الموقع التفصيلي (كمبوند / شارع)', aliases: ['الموقع التفصيلي', 'المنطقه', 'الكمبوند', 'المشروع', 'compound', 'project', 'neighborhood', 'sub area'] },
  { key: 'address', label: 'العنوان', aliases: ['العنوان', 'الشارع', 'address', 'street'] },
  { key: 'price', label: 'السعر (ج.م)', aliases: ['السعر الاجمالي ج م', 'السعر', 'السعر الاجمالي', 'سعر البيع', 'price', 'price egp', 'price', 'amount'] },
  { key: 'downPayment', label: 'المقدم (ج.م)', aliases: ['المقدم ج م', 'المقدم', 'مقدم', 'down payment', 'downpayment'] },
  { key: 'monthlyInstallment', label: 'القسط الشهري (ج.م)', aliases: ['القسط الشهري ج م', 'القسط الشهري', 'القسط', 'monthly installment', 'installment'] },
  { key: 'paymentMethod', label: 'طريقة الدفع', aliases: ['طريقه الدفع', 'نظام الدفع', 'الدفع', 'payment method', 'payment'] },
  { key: 'size', label: 'المساحة (م²)', aliases: ['المساحه م2', 'المساحه m2', 'المساحه', 'مساحه', 'size', 'area m2', 'sqm', 'area sqm'] },
  { key: 'bedrooms', label: 'عدد الغرف', aliases: ['عدد الغرف', 'الغرف', 'غرف', 'bedrooms', 'rooms', 'beds'] },
  { key: 'bathrooms', label: 'عدد الحمامات', aliases: ['عدد الحمامات', 'الحمامات', 'حمامات', 'bathrooms', 'baths'] },
  { key: 'floor', label: 'رقم الدور', aliases: ['رقم الدور', 'الدور', 'الطابق', 'floor'] },
  { key: 'totalFloors', label: 'عدد الأدوار', aliases: ['عدد الادوار', 'ادوار المبني', 'total floors', 'floors'] },
  { key: 'finishing_ar', label: 'التشطيب', aliases: ['التشطيب', 'مستوي التشطيب', 'نوع التشطيب', 'finishing', 'finish'] },
  { key: 'status', label: 'حالة العرض', aliases: ['حاله العرض', 'الحاله', 'حاله الوحده', 'الوضع', 'status', 'state'] },
  { key: 'description_ar', label: 'الوصف', aliases: ['الوصف', 'مواصفات', 'المواصفات', 'تفاصيل', 'ملاحظات', 'description', 'details', 'specs', 'notes'] },
  { key: 'createdAt', label: 'تاريخ الإضافة', aliases: ['تاريخ الاضافه', 'تاريخ الادخال', 'تاريخ التسجيل', 'created', 'created at', 'date added', 'date'] },
  // Private: become a seller contact in العملاء (never written on the public property)
  { key: 'ownerName', label: 'اسم المالك (خاص)', aliases: ['اسم المالك', 'المالك', 'الجهات المالكه', 'صاحب العقار', 'owner', 'owner name'], private: true },
  { key: 'ownerPhone', label: 'هاتف المالك (خاص)', aliases: ['هاتف المالك', 'رقم المالك', 'تليفون المالك', 'موبايل المالك', 'الرقم', 'رقم الهاتف', 'الهاتف', 'owner phone', 'phone', 'mobile'], private: true }
];

export const IGNORE = '__ignore__';

/** Headers seen in internal trackers that must never be published on a listing */
export const INTERNAL_HINTS = ['assignee', 'الاولويه', 'priority', 'marketing', 'قنوات', 'مهام', 'tasks', 'ايام المخزون', 'راكده', 'deals', 'related to', 'sales agent', 'files media', 'google drive', 'tags', 'تاريخ البيع', 'parking'];

/**
 * Best column for each field: exact alias match first, then "header contains alias".
 * Each header is used once; internal-tracker columns are left unmapped.
 * Returns { [header]: fieldKey | IGNORE }.
 */
export function autoMapColumns(headers, fields = PROPERTY_FIELDS, { exclude = INTERNAL_HINTS } = {}) {
  const keys = headers.map((h) => normKey(h));
  const mapping = Object.fromEntries(headers.map((h) => [h, IGNORE]));
  const used = new Set();
  const take = (score) => {
    for (const f of fields) {
      if (Object.values(mapping).includes(f.key)) continue;
      let best = null;
      keys.forEach((k, i) => {
        if (used.has(i) || !k) return;
        if (exclude.some((hint) => k.includes(normKey(hint)))) return;
        const rank = f.aliases.findIndex((a) => score(k, normKey(a)));
        if (rank !== -1 && (!best || rank < best.rank)) best = { i, rank };
      });
      if (best) { mapping[headers[best.i]] = f.key; used.add(best.i); }
    }
  };
  // Field keys too (a 1Line JSON backup / export uses them as headers)
  take((k, a) => k === a);
  for (const f of fields) {
    const i = keys.findIndex((k, idx) => !used.has(idx) && k === normKey(f.key));
    if (i !== -1 && !Object.values(mapping).includes(f.key)) { mapping[headers[i]] = f.key; used.add(i); }
  }
  take((k, a) => a.length >= 3 && (k.startsWith(`${a} `) || k.endsWith(` ${a}`) || k.includes(` ${a} `)));
  return mapping;
}

// ── Values ───────────────────────────────────────────────────────────────────

/** Free text ("سكني شقه", "تجاري محل", "Villa") → apartment | villa | commercial | office | land */
export function mapPropertyType(value) {
  const t = normKey(value);
  if (!t) return null;
  if (['apartment', 'villa', 'commercial', 'office', 'land'].includes(t)) return t;
  if (/ارض|اراضي|land|plot/.test(t)) return 'land';
  if (/فيلا|فيلل|villa|قصر|منزل|بيت|عماره|مبني|townhouse|house|building|twin/.test(t)) return 'villa';
  if (/اداري|مكتب|عياده|طبي|صيدليه|معمل|office|clinic|medical|تعليمي|مدرسه|حضانه/.test(t)) return 'office';
  if (/محل|تجاري|مول|معرض|مخزن|مطعم|كافيه|shop|retail|commercial|mall|store|ترفيهي/.test(t)) return 'commercial';
  if (/شقه|شقق|دوبلكس|روف|بنتهاوس|ستوديو|سكني|كمبوند|كومبوند|apartment|flat|duplex|penthouse|studio|residential/.test(t)) return 'apartment';
  return null;
}

const AREA_WORDS = [
  [/سوهاج الجديد|new sohag|الجديده/, 'new_sohag'],
  [/كوثر|kawthar/, 'kawthar'],
  [/اخميم|akhm/, 'akhmeem'],
  [/طهطا|tahta/, 'tahta'],
  [/جرجا|girga/, 'girga'],
  [/عرابه|araba/, 'araba'],
  [/كورنيش|corniche/, 'corniche'],
  [/ثقافه|thakafa/, 'thakafa'],
  [/وسط|عارف|center|downtown/, 'center'],
  [/شرق|جمهوري|east/, 'east'],
  [/غرب|west|المحطه/, 'west']
];

/** District text → a 1Line area key (built-in names, then the CRM's own area list), or null */
export function mapAreaKey(value, areas = []) {
  const t = normKey(value);
  if (!t) return null;
  // CRM areas are { id, name_ar, name_en } ('all' is the "any area" filter, not a place)
  const own = areas.find((a) => {
    const id = a?.id ?? a?.key;
    return id && id !== 'all' && (normKey(id) === t || normKey(a.name_ar) === t || normKey(a.name_en) === t);
  });
  if (own) return own.id ?? own.key;
  const hit = AREA_WORDS.find(([re]) => re.test(t));
  return hit ? hit[1] : null;
}

const FINISHING = [
  [/كامل|سوبر|لوكس|الترا|ultra|super|lux|full/, ['تشطيب كامل', 'Fully finished']],
  [/مفروش|furnish/, ['مفروش', 'Furnished']],
  [/نصف|شبه|معجون|semi/, ['نصف تشطيب', 'Semi-finished']],
  [/طوب|طوبه|محاره|core|shell|red brick/, ['على الطوب', 'Core & shell']],
  [/تحت الانشاء|under construction|انشاء/, ['تحت الإنشاء', 'Under construction']]
];
export function mapFinishing(value) {
  const t = normKey(value);
  if (!t) return null;
  const hit = FINISHING.find(([re]) => re.test(t));
  return hit ? hit[1] : [String(value).trim(), String(value).trim()];
}

/** Status text → published | hidden | under_negotiation | sold */
export function mapStatus(value) {
  const t = normKey(value);
  if (!t) return null;
  if (['published', 'hidden', 'under negotiation', 'sold'].includes(t)) return t.replace(' ', '_');
  if (/مباع|تم البيع|بيع|sold|closed/.test(t)) return 'sold';
  if (/تفاوض|حجز|negotiat|reserved|pending deal/.test(t)) return 'under_negotiation';
  if (/مازال معروض|معروض|متاح|نشط|منشور|active|available|published|offer market|for sale/.test(t) && !/غير/.test(t)) return 'published';
  if (/غير نشط|مخفي|موقوف|مراجعه|مسوده|inactive|hidden|draft|review|archived/.test(t)) return 'hidden';
  return null;
}

export function mapPaymentMethod(value) {
  const t = normKey(value);
  if (!t) return null;
  const cash = /كاش|نقد|cash/.test(t);
  const inst = /تقسيط|اقساط|قسط|install/.test(t);
  return cash && inst ? 'both' : inst ? 'installments' : cash ? 'cash' : null;
}

const TYPE_WORD = { apartment: 'شقة', villa: 'منزل', commercial: 'محل', office: 'مكتب', land: 'أرض' };
const TYPE_HINT = /شق|شقه|شقة|محل|فيلا|منزل|بيت|عماره|عمارة|ارض|أرض|مكتب|عياده|عيادة|مول|دوبلكس|روف|مخزن|صيدليه/;

/**
 * One row → { property, owner, warnings }.
 *   row: { [fieldKey]: rawValue } for the mapped columns
 *   options.areas: the CRM area list; options.statusMode: 'review' (everything hidden until
 *   reviewed; sold stays sold) | 'file' (the file's own status)
 */
export function rowToProperty(row, { areas = [], statusMode = 'review', now = new Date() } = {}) {
  const warnings = [];
  const text = (k) => stripLinks(row[k] ?? '').replace(/\s+\n/g, '\n').trim();

  const type = mapPropertyType(row.type) || mapPropertyType(row.title_ar) || 'apartment';
  if (!mapPropertyType(row.type) && row.type) warnings.push(`نوع غير معروف «${text('type')}» — اعتُبر شقة`);
  const size = parseNumber(row.size);
  const price = parseNumber(row.price);
  if (!price) warnings.push('بدون سعر');
  else if (price < 1000) warnings.push(`سعر غير منطقي «${String(row.price).trim()}» — راجعه`);
  if (!size) warnings.push('بدون مساحة');

  const areaText = text('areaKey');
  const areaKey = mapAreaKey(areaText, areas) || mapAreaKey(text('locationDetail'), areas);
  if (!areaKey && (areaText || text('locationDetail'))) warnings.push(`منطقة خارج القائمة «${areaText || text('locationDetail')}»`);
  else if (!areaKey) warnings.push('بدون منطقة');

  const unitName = text('title_ar');
  const unitCode = text('unitCode');
  // Short unit names ("جاردن سيتي 4") get the unit type in front so the title says what it is
  let title = unitName;
  if (!title) title = [TYPE_WORD[type], size ? `${size} م²` : '', text('locationDetail') || areaText].filter(Boolean).join(' ');
  else if (!TYPE_HINT.test(title)) title = `${TYPE_WORD[type]} ${title}`;
  if (!title) title = `وحدة ${unitCode || ''}`.trim();

  const isRent = /ايجار|إيجار|rent/i.test(`${unitName} ${row.type ?? ''} ${row.status ?? ''}`);
  const fileStatus = mapStatus(row.status);
  if (row.status && !fileStatus) warnings.push(`حالة غير معروفة «${text('status')}»`);
  const status = fileStatus === 'sold' ? 'sold' : statusMode === 'file' ? (fileStatus || 'hidden') : 'hidden';

  const finishing = mapFinishing(row.finishing_ar);
  const isNoRooms = type === 'commercial' || type === 'land' || type === 'office';
  const createdAt = parseDate(row.createdAt);
  const location = [text('locationDetail'), areaText].filter((v, i, a) => v && a.indexOf(v) === i).join(' - ');
  const downPayment = parseNumber(row.downPayment);
  const monthlyInstallment = parseNumber(row.monthlyInstallment);

  const property = {
    unitCode: unitCode || undefined,
    title_ar: title,
    title_en: text('title_en') || undefined,
    type,
    category: type === 'commercial' ? 'commercial' : type === 'office' ? 'administrative' : type === 'land' ? 'land' : 'residential',
    purpose: isRent ? 'rent' : 'sale',
    areaKey: areaKey || '',
    locationName_ar: location || areaText || '',
    address_ar: text('address') || undefined,
    price: price || 0,
    pricePerMeter: price && size ? Math.round(price / size) : undefined,
    downPayment: downPayment || 0,
    monthlyInstallment: monthlyInstallment || 0,
    paymentMethod: mapPaymentMethod(row.paymentMethod) || undefined,
    size: size || 0,
    bedrooms: isNoRooms ? 0 : (parseCount(row.bedrooms) ?? 0),
    bathrooms: type === 'land' ? 0 : (parseCount(row.bathrooms) ?? 0),
    floor: type === 'land' ? 0 : (parseCount(row.floor) ?? 0),
    totalFloors: parseCount(String(row.totalFloors ?? '').split(/[,،]/).length > 1 ? '' : row.totalFloors) ?? undefined,
    finishing_ar: finishing?.[0] || undefined,
    finishing_en: finishing?.[1] || undefined,
    description_ar: text('description_ar') || undefined,
    status,
    featured: false,
    badge_ar: isRent ? 'للإيجار' : undefined,
    badge_en: isRent ? 'For rent' : undefined,
    images: [],
    isDeleted: false,
    legalStatus: null,
    createdAt: createdAt ? new Date(`${createdAt}T12:00:00Z`).toISOString() : now.toISOString(),
    importedAt: now.toISOString()
  };
  for (const k of Object.keys(property)) if (property[k] === undefined) delete property[k];

  const ownerPhone = normalizePhone(row.ownerPhone);
  if (row.ownerPhone && !ownerPhone) warnings.push(`رقم مالك غير صالح «${String(row.ownerPhone).trim()}»`);
  const ownerNameRaw = stripLinks(row.ownerName ?? '');
  // Notion relations export the related page's title; a bare number there is an ID, not a name
  const ownerName = /^\d+$/.test(ownerNameRaw) ? '' : ownerNameRaw;
  const owner = ownerPhone ? { name: ownerName, phone: ownerPhone } : null;

  return { property, owner, warnings };
}

/**
 * Rows without a district: when other rows in the same file put that compound / street in a
 * known area, use it ("كمبوند جاردن سيتي 4" is in سوهاج الجديدة on its other rows).
 * Mutates and returns the list of rowToProperty() results.
 */
export function fillAreasFromSiblings(results) {
  const votes = new Map();
  for (const { property } of results) {
    const k = normKey(property.locationName_ar?.split(' - ')[0]);
    if (!k || !property.areaKey) continue;
    const m = votes.get(k) || {};
    m[property.areaKey] = (m[property.areaKey] || 0) + 1;
    votes.set(k, m);
  }
  for (const r of results) {
    if (r.property.areaKey) continue;
    const m = votes.get(normKey(r.property.locationName_ar?.split(' - ')[0]));
    if (!m) continue;
    const [best] = Object.entries(m).sort((a, b) => b[1] - a[1])[0];
    r.property.areaKey = best;
    r.warnings = r.warnings.filter((w) => !w.startsWith('منطقة خارج القائمة'));
    r.inferredArea = true;
  }
  return results;
}

/** Export: one property → { [label]: value } in PROPERTY_FIELDS order (private fields left out).
 *  areas: the CRM area list, so the area is written by name ('غرب سوهاج', not 'west'). */
export function propertyToRow(p, areas = []) {
  const area = areas.find((a) => (a?.id ?? a?.key) === p.areaKey);
  const statusLabel = { published: 'منشور', hidden: 'مخفي', under_negotiation: 'تحت التفاوض', sold: 'تم البيع' };
  const typeLabel = { apartment: 'شقة سكنية', villa: 'فيلا / منزل', commercial: 'محل تجاري', office: 'مكتب / عيادة', land: 'أرض' };
  const paymentLabel = { cash: 'كاش', installments: 'تقسيط', both: 'كاش أو تقسيط' };
  const values = {
    unitCode: p.unitCode || p.id,
    title_ar: p.title_ar || '',
    title_en: p.title_en || '',
    type: typeLabel[p.type] || p.type || '',
    areaKey: area?.name_ar || p.areaKey || '',
    locationDetail: p.locationName_ar || '',
    address: p.address_ar || '',
    price: Number(p.price) || 0,
    downPayment: Number(p.downPayment) || 0,
    monthlyInstallment: Number(p.monthlyInstallment) || 0,
    paymentMethod: paymentLabel[p.paymentMethod] || '',
    size: Number(p.size) || 0,
    bedrooms: Number(p.bedrooms) || 0,
    bathrooms: Number(p.bathrooms) || 0,
    floor: Number(p.floor) || 0,
    totalFloors: Number(p.totalFloors) || '',
    finishing_ar: p.finishing_ar || '',
    status: (p.isDeleted || p.status === 'trash') ? 'محذوف' : (statusLabel[p.status || 'published'] || p.status || ''),
    description_ar: p.description_ar || '',
    createdAt: String(p.createdAt || '').slice(0, 10)
  };
  return Object.fromEntries(PROPERTY_FIELDS.filter((f) => !f.private).map((f) => [f.label, values[f.key] ?? '']));
}
