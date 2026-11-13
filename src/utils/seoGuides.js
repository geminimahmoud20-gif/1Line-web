// =============================================================
//  Price guides: "سعر المتر في سوهاج الجديدة" (/guides/price-per-meter-new-sohag).
//  The figures come from the listings published now (never typed in): per property kind, the
//  number of listings with a size, the median price per m² and the range. A kind with fewer than
//  three listings shows its range, not a "median", so one listing is not read as the district's
//  price. A guide with no priced kind stays out of the sitemap and is marked noindex.
//  Pure: shared by the page (pages/GuidePage), the build shells and api/page-shell.
//  Tests: tests/unit/seo-guides.test.mjs
// =============================================================
import { LANDING_KINDS, LANDING_AREAS, landingListings, landingPath } from './seoLanding.js';
import { median } from './marketStats.js';
import { ARTICLES, parseArticle, articlePath } from './seoGuideArticles.js';

const PREFIX = 'price-per-meter-';

export const guidePath = (area = null) => `/guides/${PREFIX}${area ? area.slug : 'sohag'}`;

/** URL slug → { area } (area null for the whole city), or null for an unknown guide */
export function parseGuide(slug) {
  const article = parseArticle(slug);
  if (article) return { article, area: null };
  if (typeof slug !== 'string' || !slug.startsWith(PREFIX)) return null;
  const rest = slug.slice(PREFIX.length);
  if (rest === 'sohag') return { area: null };
  const area = LANDING_AREAS.find((a) => a.slug === rest);
  return area ? { area } : null;
}

const money = (n) => `${Number(n).toLocaleString('en-US')} ج.م`;

/** One row per kind that has listings with both a price and a size in this place */
export function guideRows(list, area = null) {
  const rows = [];
  for (const kind of LANDING_KINDS) {
    const ppm = landingListings(list, kind, area)
      .filter((p) => Number(p.size) > 0)
      .map((p) => Math.round(Number(p.price) / Number(p.size)));
    if (!ppm.length) continue;
    rows.push({
      kind,
      count: ppm.length,
      medianPpm: ppm.length >= 3 ? median(ppm) : 0,
      minPpm: Math.min(...ppm),
      maxPpm: Math.max(...ppm),
      path: landingPath(kind, area)
    });
  }
  return rows;
}

/** The figure to quote for a row: a median only from three listings, otherwise the range */
export function rowFigure(r) {
  if (r.medianPpm) return `حوالي ${money(r.medianPpm)} للمتر (من ${money(r.minPpm)} إلى ${money(r.maxPpm)})`;
  if (r.minPpm === r.maxPpm) return `${money(r.minPpm)} للمتر (عرض واحد فقط)`;
  return `من ${money(r.minPpm)} إلى ${money(r.maxPpm)} للمتر (${r.count} عروض فقط)`;
}

export function guideCopy(area, rows) {
  const where = area ? area.ar : 'سوهاج';
  const h1 = `سعر المتر في ${where}`;
  const lead = rows.find((r) => r.medianPpm) || rows[0];
  const quote = lead ? `${lead.kind.the_ar}: ${rowFigure(lead)}` : '';
  const description = rows.length
    ? `سعر المتر في ${where} من العروض المنشورة على 1Line الآن: ${quote}. أرقام محسوبة من عروض حقيقية وتتحدّث مع كل عرض جديد.`
    : `سعر المتر في ${where}: نجمّع الأرقام من العروض المنشورة على 1Line أول ما تتوفر عينة كافية.`;
  const intro = rows.length
    ? `الأرقام دي محسوبة من العروض المنشورة على 1Line دلوقتي في ${where}، لكل نوع عقار لوحده. هي أسعار معروضة مش أسعار بيع نهائية، والسعر الفعلي بيتحدد بالتفاوض وحالة العقار والدور والتشطيب.`
    : `لسه مفيش عروض كفاية في ${where} نحسب منها سعر متر يُعتمد عليه. ابعتلنا المساحة والميزانية ونبلّغك بالأسعار الحالية.`;
  return { h1, title: `${h1} — أسعار ${new Date().getFullYear()}`, description: description.slice(0, 165), intro };
}

export function guideFaq(area, rows) {
  const where = area ? area.ar : 'سوهاج';
  const faq = [];
  for (const r of rows.slice(0, 4)) {
    faq.push({ q: `كام سعر متر ${r.kind.one_ar} في ${where}؟`, a: `في العروض المنشورة على 1Line دلوقتي: ${rowFigure(r)}. ${r.medianPpm ? `الرقم متوسط (وسيط) ${r.count} عروض.` : 'العينة صغيرة، فاعتبر الرقم إشارة مش سعر سوق.'}` });
  }
  faq.push({ q: `إزاي أعرف إن سعر المتر المعروض معقول في ${where}؟`, a: 'قارن السعر بعروض تانية من نفس النوع والمنطقة والمساحة، وراجع الدور والتشطيب والمرافق والمستندات. 1Line بتديك المقارنة دي مع ملخص مراجعة الأوراق قبل التعاقد.' });
  faq.push({ q: 'الأسعار دي أسعار بيع نهائية؟', a: 'لأ، دي أسعار معروضة. السعر النهائي بيتحدد بالتفاوض، وبعض العقارات بتتباع قبل ما تتنشر.' });
  return faq;
}

/** Guides worth indexing: the city, and each area whose own listings carry a price per m² */
export function guidePages(list) {
  const out = ARTICLES.map((article) => ({ article, area: null, path: articlePath(article), rows: [] }));
  const city = guideRows(list);
  if (city.length) out.push({ area: null, path: guidePath(), rows: city });
  for (const area of LANDING_AREAS) {
    const rows = guideRows(list, area);
    if (rows.length) out.push({ area, path: guidePath(area), rows });
  }
  return out;
}
