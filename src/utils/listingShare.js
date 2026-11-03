// =============================================================
//  How a listing reads when it is shared: the caption the share buttons copy or send, and the
//  link preview Facebook / WhatsApp show (og:title / og:description in the page's HTML).
//  Plain text without emoji (WhatsApp Web and Facebook turn some into «�») and without
//  WhatsApp *bold* marks (Facebook shows the asterisks). Only facts the listing carries.
//  Pure: tests/unit/listing-share.test.mjs. Used by the share buttons and src/utils/seoShell.js.
// =============================================================
import { paymentTerms, planSummary, hasInstallmentPlan } from './paymentTerms.js';

const money = (n) => `${Math.round(Number(n) || 0).toLocaleString('en-US')} ج.م`;
const moneyEn = (n) => `${Math.round(Number(n) || 0).toLocaleString('en-US')} EGP`;
const clean = (s) => String(s ?? '')
  .replace(/(?:\+?20|0020|0)?1[0125]\d{8}\b/g, '')   // never a phone number from a description
  .replace(/\s+/g, ' ')
  .trim();

const TYPE_AR = { apartment: 'شقة', villa: 'فيلا', house: 'منزل', commercial: 'محل تجاري', retail: 'محل تجاري', office: 'مكتب', clinic: 'عيادة', land: 'أرض', building: 'مبنى' };

/** «2,520,000 ج.م» for cash, «مقدم 200,000 ج.م + قسط 30,000 ج.م ربع سنوي» for a plan */
export function priceLine(p, isAr = true) {
  const t = paymentTerms(p);
  const fmt = isAr ? money : moneyEn;
  if (hasInstallmentPlan(t)) {
    const s = planSummary(t, fmt, isAr);
    const now = s.now ? `${s.now.label} ${fmt(s.now.amount)} + ` : '';
    return isAr ? `${now}قسط ${fmt(t.amount)} ${s.everyLabel}` : `${now}${fmt(t.amount)} ${s.everyLabel}`;
  }
  return Number(p.price) > 0 ? fmt(p.price) : '';
}

/** The short facts: «156 م² · 3 غرف · الدور 2 · سوهاج الجديدة» */
export function factsLine(p, { areaName = '', isAr = true } = {}) {
  const place = clean(p.locationName_ar && isAr ? p.locationName_ar : (p.locationName_en || p.locationName_ar)) || areaName;
  const bits = isAr
    ? [
      Number(p.size) > 0 ? `${Number(p.size)} م²` : '',
      Number(p.bedrooms) > 0 ? `${Number(p.bedrooms)} ${Number(p.bedrooms) <= 10 && Number(p.bedrooms) > 2 ? 'غرف' : 'غرفة'}` : '',
      Number(p.floor) > 0 ? `الدور ${Number(p.floor)}` : '',
      p.completionStatus === 'ready' ? 'استلام فوري' : '',
      place
    ]
    : [
      Number(p.size) > 0 ? `${Number(p.size)} m²` : '',
      Number(p.bedrooms) > 0 ? `${Number(p.bedrooms)} bedrooms` : '',
      Number(p.floor) > 0 ? `floor ${Number(p.floor)}` : '',
      p.completionStatus === 'ready' ? 'ready to move' : '',
      place
    ];
  return bits.filter(Boolean).join(' · ');
}

/** Link preview: the title alone (og:site_name already says 1Line) and price + facts as the description */
export function listingPreview(p, opts = {}) {
  const title = clean(p.title_ar || p.title_en || 'عقار للبيع');
  const description = [priceLine(p, true), factsLine(p, opts)].filter(Boolean).join(' — ').slice(0, 200);
  return { title, description };
}

/**
 * The share caption: title, price (or the plan: paid now + installments + total), facts, finishing,
 * the legal record if there is one, a few lines of description, how to book a viewing, the link, hashtags.
 */
export function listingCaption(p, { url = '', phone = '', areaName = '', isAr = true } = {}) {
  const title = clean(isAr ? (p.title_ar || p.title_en) : (p.title_en || p.title_ar));
  const t = paymentTerms(p);
  const fmt = isAr ? money : moneyEn;
  const plan = hasInstallmentPlan(t) ? planSummary(t, fmt, isAr) : null;
  const desc = clean(isAr ? p.description_ar : (p.description_en || p.description_ar));
  const short = desc.length > 220 ? `${desc.slice(0, 220).replace(/\s+\S*$/, '')}…` : desc;
  const legal = p.legalStatus ? clean(isAr ? p.legalStatus.ownershipType_ar : (p.legalStatus.ownershipType_en || p.legalStatus.ownershipType_ar)) : '';
  const finishing = clean(isAr ? p.finishing_ar : p.finishing_en);
  const type = TYPE_AR[p.type] || '';
  const lines = isAr
    ? [
      title,
      '',
      plan
        ? [plan.now ? `${plan.now.label}: ${fmt(plan.now.amount)}` : '', plan.now ? `+ ${plan.then}` : plan.then, `الإجمالي: ${fmt(plan.total)}${t.cashPrice ? ` · أو كاش ${fmt(t.cashPrice)}` : ''}`].filter(Boolean).join('\n')
        : (Number(p.price) > 0 ? `السعر: ${fmt(p.price)} (كاش)` : ''),
      factsLine(p, { areaName, isAr }),
      finishing ? `التشطيب: ${finishing}` : '',
      legal ? `الموقف القانوني: ${legal}` : '',
      short ? `\n${short}` : '',
      '',
      phone ? `للمعاينة والتفاصيل: ${phone}` : '',
      url ? `التفاصيل والصور: ${url}` : '',
      '',
      ['#عقارات_سوهاج', areaName ? `#${areaName.replace(/\s+/g, '_')}` : '', type ? `#${type.replace(/\s+/g, '_')}_للبيع` : '', '#1Line'].filter(Boolean).join(' ')
    ]
    : [
      title,
      '',
      plan ? `${plan.now ? `${plan.now.label}: ${fmt(plan.now.amount)} + ` : ''}${plan.then}. Total ${fmt(plan.total)}` : (Number(p.price) > 0 ? `Price: ${fmt(p.price)} (cash)` : ''),
      factsLine(p, { areaName, isAr }),
      short ? `\n${short}` : '',
      '',
      phone ? `Viewings: ${phone}` : '',
      url
    ];
  return lines.filter((l, i, a) => l !== '' || (i > 0 && a[i - 1] !== '')).join('\n').trim();
}
