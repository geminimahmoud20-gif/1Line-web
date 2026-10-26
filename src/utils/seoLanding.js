// =============================================================
//  Search landing pages: "شقق للبيع في سوهاج", "محلات للبيع في سوهاج الجديدة"…
//  One page per property kind (/sohag/apartments-for-sale) and per kind × area
//  (/sohag/apartments-for-sale/new-sohag), built from the listings actually published.
//  Pure: the site (pages/LandingPage) and the build (scripts/postbuild-seo: sitemap and
//  prerendered shells) share it. Tested in tests/unit/seo-landing.test.mjs.
// =============================================================

import { liveListings, median } from './marketStats.js';

export const LANDING_KINDS = [
  { slug: 'apartments-for-sale', the_ar: 'الشقق', types: ['apartment', 'duplex', 'penthouse', 'studio'], ar: 'شقق للبيع', one_ar: 'شقة', en: 'Apartments for sale' },
  { slug: 'villas-for-sale', the_ar: 'الفيلات والمنازل', types: ['villa', 'townhouse', 'twinhouse', 'chalet'], ar: 'فيلات ومنازل للبيع', one_ar: 'فيلا أو منزل', en: 'Villas & houses for sale' },
  { slug: 'buildings-for-sale', the_ar: 'العمارات', types: ['building'], ar: 'عمارات للبيع', one_ar: 'عمارة', en: 'Buildings for sale' },
  { slug: 'shops-for-sale', the_ar: 'المحلات التجارية', types: ['commercial', 'shop', 'retail'], ar: 'محلات تجارية للبيع', one_ar: 'محل', en: 'Shops for sale' },
  { slug: 'offices-clinics-for-sale', the_ar: 'المكاتب والعيادات', types: ['office', 'clinic', 'medical', 'administrative'], ar: 'مكاتب وعيادات للبيع', one_ar: 'مكتب أو عيادة', en: 'Offices & clinics for sale' },
  { slug: 'land-for-sale', the_ar: 'أراضي المباني', types: ['land'], ar: 'أراضي مباني للبيع', one_ar: 'قطعة أرض', en: 'Building land for sale' },
  { slug: 'farm-land-for-sale', the_ar: 'الأراضي الزراعية', types: ['agri_land', 'farm'], ar: 'أراضي زراعية للبيع', one_ar: 'أرض زراعية', en: 'Farm land for sale' },
  { slug: 'factories-warehouses-for-sale', the_ar: 'المصانع والمخازن', types: ['factory', 'warehouse', 'industrial_land'], ar: 'مصانع ومخازن للبيع', one_ar: 'مصنع أو مخزن', en: 'Factories & warehouses for sale' }
];

// The CRM's default districts (utils/areasData); areas added later still count on the city page
export const LANDING_AREAS = [
  { id: 'new_sohag', slug: 'new-sohag', ar: 'سوهاج الجديدة', en: 'New Sohag' },
  { id: 'east', slug: 'east-sohag', ar: 'شرق سوهاج', en: 'East Sohag' },
  { id: 'west', slug: 'west-sohag', ar: 'غرب سوهاج', en: 'West Sohag' },
  { id: 'center', slug: 'downtown', ar: 'وسط البلد', en: 'Downtown Sohag' },
  { id: 'corniche', slug: 'nile-corniche', ar: 'كورنيش النيل', en: 'Nile Corniche' },
  { id: 'thakafa', slug: 'el-thakafa', ar: 'منطقة الثقافة', en: 'El Thakafa' },
  { id: 'kawthar', slug: 'el-kawthar', ar: 'حي الكوثر', en: 'El Kawthar' },
  { id: 'akhmeem', slug: 'akhmim', ar: 'أخميم', en: 'Akhmim' },
  { id: 'tahta', slug: 'tahta', ar: 'طهطا', en: 'Tahta' },
  { id: 'girga', slug: 'girga', ar: 'جرجا', en: 'Girga' }
];

export const landingPath = (kind, area = null) => `/sohag/${kind.slug}${area ? `/${area.slug}` : ''}`;

/** URL parts → { kind, area } (area null on a city page); null for an unknown page */
export function parseLanding(kindSlug, areaSlug) {
  const kind = LANDING_KINDS.find((k) => k.slug === kindSlug);
  if (!kind) return null;
  if (!areaSlug) return { kind, area: null };
  const area = LANDING_AREAS.find((a) => a.slug === areaSlug);
  return area ? { kind, area } : null;
}

/** Published, real, for-sale listings of this kind (and area) */
export function landingListings(list, kind, area = null) {
  return liveListings(list).filter((p) => kind.types.includes(p.type)
    && (!p.purpose || p.purpose === 'sale')
    && (!area || p.areaKey === area.id));
}

/** Count, median price per m² and the price range of a set of listings */
export function landingSummary(listings) {
  const prices = listings.map((p) => Number(p.price)).filter((n) => n > 0);
  const ppm = listings.filter((p) => Number(p.size) > 0 && Number(p.price) > 0).map((p) => Math.round(Number(p.price) / Number(p.size)));
  return {
    count: listings.length,
    medianPpm: median(ppm),
    minPrice: prices.length ? Math.min(...prices) : 0,
    maxPrice: prices.length ? Math.max(...prices) : 0
  };
}

const money = (n) => `${Number(n).toLocaleString('en-US')} ج.م`;
const shortMoney = (n) => (n >= 1e6 ? `${(n / 1e6).toFixed(n % 1e6 ? 1 : 0)} مليون ج.م` : `${Math.round(n / 1000)} ألف ج.م`);
const place = (area) => (area ? area.ar : 'سوهاج');

/** Title, H1, meta description and the opening paragraph, from the real figures */
export function landingCopy(kind, area, s) {
  const where = place(area);
  const h1 = `${kind.ar} في ${where}`;
  const range = s.count && s.minPrice ? `الأسعار من ${shortMoney(s.minPrice)} إلى ${shortMoney(s.maxPrice)}` : '';
  const ppm = s.medianPpm ? `متوسط سعر المتر ${money(s.medianPpm)}` : '';
  const facts = [s.count ? `${s.count} ${s.count === 1 ? 'عرض' : 'عروض'} متاحة` : '', range, ppm].filter(Boolean).join('، ');
  const description = s.count
    ? `${h1}: ${facts}. عروض موثّقة من 1Line بمراجعة المستندات قبل التعاقد، وصور حقيقية وتواصل مباشر على واتساب.`
    : `${h1} مع 1Line: ابعت المساحة والميزانية ونرشّحلك العروض المناسبة بمستندات مراجَعة قبل أي دفع.`;
  const intro = s.count
    ? `دي ${kind.the_ar} المعروضة للبيع دلوقتي في ${where}، وفيه ${facts}. كل عرض مراجَع المستندات قبل النشر، والأسعار هنا أسعار معروضة مش أسعار بيع نهائية.`
    : `لسه مفيش ${kind.ar.replace(' للبيع', '')} معروضة في ${where} على الموقع دلوقتي. ابعت طلبك بالمساحة والميزانية، ونبلّغك أول ما يتعرض عرض يناسبك، وكتير من العروض بتتباع قبل ما تتنشر.`;
  return { h1, title: `${h1} — أسعار ${new Date().getFullYear()}`, description: description.slice(0, 165), intro };
}

/** Questions buyers ask, answered from the same figures (also emitted as FAQPage JSON-LD) */
export function landingFaq(kind, area, s) {
  const where = place(area);
  const faq = [];
  if (s.medianPpm) faq.push({ q: `كام سعر متر ${kind.one_ar} في ${where}؟`, a: `متوسط سعر المتر في العروض المتاحة دلوقتي على 1Line حوالي ${money(s.medianPpm)}، محسوب من ${s.count} ${s.count === 1 ? 'عرض' : 'عروض'}. السعر النهائي بيتحدد بالتفاوض وحالة العقار.` });
  if (s.minPrice) faq.push({ q: `أرخص ${kind.one_ar} للبيع في ${where} بكام؟`, a: `أقل سعر معروض حالياً ${money(s.minPrice)}، وأعلى سعر ${money(s.maxPrice)}.` });
  faq.push({ q: `إزاي أتأكد إن الورق سليم قبل ما أشتري ${kind.one_ar}؟`, a: '1Line بتراجع تسلسل الملكية والتراخيص والتوكيلات والمرافق قبل نشر العرض، وبتسلّمك ملخص المراجعة قبل التعاقد.' });
  faq.push({ q: `ممكن أطلب ${kind.one_ar} بمواصفات معيّنة في ${where}؟`, a: 'أيوه، ابعت المساحة والميزانية ونظام الدفع من صفحة "اطلب عقارك"، ونبعتلك العروض المطابقة، ومنها عروض مش منشورة على الموقع.' });
  return faq;
}

/**
 * Pages worth indexing: each kind with at least one listing, and each kind × area with at least
 * one. Empty pages stay reachable but out of the sitemap (thin pages hurt the whole site).
 */
export function landingPages(list) {
  const out = [];
  for (const kind of LANDING_KINDS) {
    const all = landingListings(list, kind);
    if (!all.length) continue;
    out.push({ kind, area: null, path: landingPath(kind), count: all.length });
    for (const area of LANDING_AREAS) {
      const n = all.filter((p) => p.areaKey === area.id).length;
      if (n) out.push({ kind, area, path: landingPath(kind, area), count: n });
    }
  }
  return out;
}
