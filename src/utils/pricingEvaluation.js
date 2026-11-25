/**
 * 1Line Pricing Evaluation & Owner-Priced Transparency Engine.
 * Evaluates a listing against the real area reference price (or explicit CRM mode)
 * without fabricating benchmarks, distinguishing market-aligned listings from
 * owner-priced listings where 1Line acts as a transparent advisor.
 */
import { areaReferencePrice } from './areaPricing.js';
import { getAreas, getAreaById } from './areasData.js';
import { assetClass } from './marketStats.js';
import { isMultiUnitOrBuilding, isResidentialProperty } from './currencyAndBenchmark.js';

export const PRICING_MODES = ['auto', 'opportunity', 'market_aligned', 'owner_priced', 'hide'];

export const PRICING_MODE_OPTIONS = [
  { value: 'auto', ar: 'تلقائي حسب السعر المرجعي للمنطقة', en: 'Auto from area reference price' },
  { value: 'market_aligned', ar: 'توصية 1Line: سعر مناسب للسوق', en: '1Line Verified: Fair market price' },
  { value: 'opportunity', ar: 'توصية 1Line: فرصة سعرية أقل من السوق', en: '1Line Verified: Below market deal' },
  { value: 'owner_priced', ar: 'تسعير المالك (أعلى من المرجعي — يُعرض بشفافية)', en: 'Owner-priced (above reference — shown transparently)' },
  { value: 'hide', ar: 'إخفاء مؤشر التقييم على الموقع', en: 'Hide pricing evaluation on site' }
];

const ABOVE_MARKET_THRESHOLD = 10; // > +10% above reference triggers owner_priced in auto mode
const BELOW_MARKET_THRESHOLD = -5; // < -5% below reference triggers opportunity in auto mode

/**
 * Resolves the real reference price per m² for a property, or null if none exists.
 */
export function resolveReferencePrice(property, areas = null, allListings = null) {
  if (!property) return null;
  const custom = Number(property.customBenchmarkPrice);
  if (custom > 0) {
    return { ppm: custom, source: 'listing', sample: 0 };
  }
  if (!isResidentialProperty(property) || isMultiUnitOrBuilding(property)) {
    return null;
  }
  const areaList = Array.isArray(areas) ? areas : getAreas();
  const areaData = areaList.find((a) => a?.id === property.areaKey) || getAreaById(property.areaKey || '');
  const listings = Array.isArray(allListings) ? allListings : [];
  return areaReferencePrice(areaData, listings, areaList, assetClass(property));
}

/**
 * Evaluates listing pricing for both PropertyCard (outer cover) and PropertyDetailPage (inner view).
 * Pure when `areas` and `allListings` are passed; falls back to `getAreas()` in browser.
 */
export function evaluateListingPricing(property, options = {}) {
  const { lang = 'ar', areas = null, allListings = null } = options;
  const isAr = lang === 'ar';

  if (!property || property.isDemo || property.status === 'sold') {
    return { status: 'none', mode: 'auto', diffPercent: 0, referencePpm: 0, propertyPpm: 0, isOwnerPriced: false, cardBadge: null, detailNote: null };
  }

  const mode = PRICING_MODES.includes(property.pricingMode) ? property.pricingMode : 'auto';
  if (mode === 'hide') {
    return { status: 'none', mode, diffPercent: 0, referencePpm: 0, propertyPpm: 0, isOwnerPriced: false, cardBadge: null, detailNote: null };
  }

  const size = Number(property.size) || 0;
  const price = Number(property.price) || 0;
  const isMulti = isMultiUnitOrBuilding(property);
  const propertyPpm = !isMulti && size > 0 && price > 0 ? Math.round(price / size) : 0;

  const ref = resolveReferencePrice(property, areas, allListings);
  const referencePpm = ref?.ppm || 0;
  const diffPercent = propertyPpm > 0 && referencePpm > 0
    ? Math.round(((propertyPpm - referencePpm) / referencePpm) * 100)
    : 0;

  let status = 'none';
  if (mode === 'owner_priced') {
    status = 'owner_priced';
  } else if (mode === 'market_aligned') {
    status = 'fair';
  } else if (mode === 'opportunity') {
    status = 'opportunity';
  } else if (referencePpm > 0 && propertyPpm > 0) {
    if (diffPercent < BELOW_MARKET_THRESHOLD) status = 'opportunity';
    else if (diffPercent > ABOVE_MARKET_THRESHOLD) status = 'owner_priced';
    else status = 'fair';
  }

  if (status === 'none') {
    return { status: 'none', mode, diffPercent, referencePpm, propertyPpm, isOwnerPriced: false, cardBadge: null, detailNote: null };
  }

  if (status === 'opportunity') {
    const pct = diffPercent < 0 ? Math.abs(diffPercent) : 0;
    return {
      status,
      mode,
      diffPercent,
      referencePpm,
      propertyPpm,
      isOwnerPriced: false,
      cardBadge: {
        tone: 'opportunity',
        label: pct > 0
          ? (isAr ? `أقل ${pct}% من متوسط المنطقة` : `${pct}% below area average`)
          : (isAr ? 'فرصة سعرية · توصية 1Line' : 'Price opportunity · 1Line Pick'),
        hint: isAr ? 'سعر أقل من متوسط الوحدات المماثلة في نفس المنطقة' : 'Priced below comparable listings in this area'
      },
      detailNote: null
    };
  }

  if (status === 'fair') {
    return {
      status,
      mode,
      diffPercent,
      referencePpm,
      propertyPpm,
      isOwnerPriced: false,
      cardBadge: {
        tone: 'fair',
        label: isAr ? 'سعر مناسب للسوق · تقييم 1Line' : 'Fair market price · 1Line',
        hint: isAr ? 'السعر متوافق مع متوسط التداول في المنطقة' : 'Aligned with comparable market prices in the area'
      },
      detailNote: null
    };
  }

  // status === 'owner_priced'
  const abovePct = diffPercent > 0 ? diffPercent : 0;
  const customNote = String(property.ownerPriceNote_ar || '').trim();

  return {
    status: 'owner_priced',
    mode,
    diffPercent,
    referencePpm,
    propertyPpm,
    isOwnerPriced: true,
    cardBadge: {
      tone: 'owner',
      label: isAr ? 'تسعير المالك' : 'Owner-priced',
      sublabel: abovePct > 0
        ? (isAr ? `أعلى ${abovePct}% من المرجعي · قابل للتفاوض` : `${abovePct}% above ref · Negotiable`)
        : (isAr ? 'بسعر المالك · قابل للتفاوض' : 'Asking price · Negotiable'),
      hint: isAr
        ? 'السعر المعروض بطلب المالك مباشرة وأعلى من متوسط المنطقة الاسترشادي — يمكنك تقديم عرض سعر تفاوضي'
        : 'Listed at the owner’s asking price above the area reference — you can submit an offer'
    },
    detailNote: {
      title: isAr ? 'ملاحظة الشفافية من 1Line' : '1Line Pricing Transparency Note',
      body: customNote || (isAr
        ? 'السعر المعروض هو السعر المطلوب مباشرة من المالك، وهو أعلى من السعر المرجعي الحالي للوحدات المماثلة في نفس الحي. نعرض الوحدة لإتاحة خيارات أوسع لعملائنا، مع إمكانية تقديم عرض سعر تفاوضي عبر مستشارنا.'
        : 'The listed price is the owner’s direct asking price, which is higher than the current reference benchmark for comparable units in this district. We list it to offer wider options, and you can submit a counter-offer through our advisor.')
    }
  };
}
