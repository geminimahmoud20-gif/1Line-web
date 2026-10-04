// =============================================================
//  What goes on a property brochure (Arabic only), from the listing as the CRM saved it.
//  Only recorded facts: an empty field is left out, never filled with a default.
//  Pure (no DOM) so it can be unit-tested; propertyBrochure.js draws it.
// =============================================================

import { getActiveOffer } from '../propertyOffers.js';

const TYPE_AR = {
  apartment: 'شقة', villa: 'فيلا', duplex: 'دوبلكس', penthouse: 'بنتهاوس', studio: 'ستوديو',
  land: 'أرض', building: 'عمارة', commercial: 'محل تجاري', office: 'مكتب إداري', clinic: 'عيادة', chalet: 'شاليه'
};
const STATUS_AR = { ready: 'جاهز للاستلام', under_construction: 'تحت الإنشاء', off_plan: 'على المخطط' };

const LEGAL_ITEMS = [
  ['ownershipType', 'سند الملكية والشهر العقاري'],
  ['licenseStatus', 'ترخيص البناء'],
  ['reconciliationStatus', 'موقف التصالح'],
  ['landShare', 'حصة الأرض'],
  ['municipalityStatus', 'جهاز المدينة والضرائب']
];

const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : 0;
};
const money = (n) => `${Math.round(n).toLocaleString('en-US')} ج.م`;
const text = (v) => String(v ?? '').replace(/\s+/g, ' ').trim();
const day = (ms) => {
  const d = new Date(ms);
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
};

const yearsAr = (y) => (y === 1 ? 'سنة' : y === 2 ? 'سنتين' : `${y} ${y <= 10 ? 'سنوات' : 'سنة'}`);

/** The code the team and the client use for the unit (falls back to a short id) */
export const brochureCode = (p) => text(p.unitCode) || String(p.id || '').slice(0, 8).toUpperCase();

export function brochureData(property, { now = Date.now(), siteUrl = '' } = {}) {
  const p = property || {};
  const price = num(p.price);
  const offer = getActiveOffer(p, now);

  const floor = p.floor === 0 || p.floor === '0' ? 'الأرضي' : (num(p.floor) ? `الدور ${num(p.floor)}` : '');
  const specs = [
    ['النوع', TYPE_AR[p.type] || ''],
    ['المساحة', num(p.size) ? `${num(p.size).toLocaleString('en-US')} م²` : ''],
    ['غرف النوم', num(p.bedrooms) ? String(num(p.bedrooms)) : ''],
    ['الحمامات', num(p.bathrooms) ? String(num(p.bathrooms)) : ''],
    ['الدور', floor],
    ['التشطيب', text(p.finishing_ar)],
    ['الحالة', STATUS_AR[p.completionStatus] || '']
  ].filter(([, v]) => v);

  const legalSrc = p.legalStatus || {};
  const legal = LEGAL_ITEMS.map(([k, label]) => [label, text(legalSrc[`${k}_ar`])]).filter(([, v]) => v);
  if (text(legalSrc.reviewedBy)) legal.push(['راجعه', `${text(legalSrc.reviewedBy)}${legalSrc.reviewDate ? ` (${text(legalSrc.reviewDate)})` : ''}`]);

  // Cash is the norm; a plan shows only when the listing has one
  const years = num(p.installmentYears);
  const monthly = num(p.monthlyInstallment);
  const plan = years && monthly
    ? { down: num(p.downPayment) ? money(num(p.downPayment)) : '', monthly: money(monthly), years: yearsAr(years) }
    : null;

  const description = text(p.description_ar);

  return {
    code: brochureCode(p),
    title: text(p.title_ar) || [TYPE_AR[p.type], text(p.locationName_ar)].filter(Boolean).join(' في ') || 'وحدة عقارية',
    location: text(p.locationName_ar),
    image: Array.isArray(p.images) ? p.images.find((u) => typeof u === 'string' && /^https?:|^data:|^\//.test(u)) || '' : '',
    price: offer
      ? { now: money(offer.price), was: money(offer.basePrice), discount: money(offer.savings), until: day(offer.endsAt) }
      : (price ? { now: money(price) } : null),
    plan,
    specs,
    description: description.length > 300 ? `${description.slice(0, 297).trim()}…` : description,
    legal,
    url: siteUrl && p.id ? `${siteUrl.replace(/\/+$/, '')}/properties/${p.id}` : '',
    issued: day(now)
  };
}
