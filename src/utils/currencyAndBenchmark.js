/**
 * 💱 1LINE PROPTECH CURRENCY CONVERTER & DISTRICT PRICE BENCHMARK ENGINE
 * Designed for Sohag, Upper Egypt, and Gulf Expat Investors.
 */

// Contract currency is always EGP. Other currencies are display-only "≈" equivalents (see utils/fxRates.js).
export const CURRENCY_RATES = {
  EGP: { rate: 1, symbol_ar: 'ج.م', symbol_en: 'EGP', flag: '🇪🇬' }
};

import { getAreas } from './areasData.js';
import { formatApprox } from './fxRates.js';

// Fallback District average price per m² benchmarks in Sohag (EGP / m²)
export const SOHAG_DISTRICT_BENCHMARKS = {
  corniche: 26000,   // كورنيش النيل (أعلى قيمة معمارية)
  east: 21000,       // شرق سوهاج والجمهورية
  center: 17500,     // سيتي وشارع 15 ووسط البلد
  thakafa: 15500,    // منطقة الثقافة والمخبز الآلي
  new_sohag: 12000,  // سوهاج الجديدة
  kawthar: 9000,     // حي الكوثر
  akhmeem: 9500,     // أخميم
  tahta: 11000,      // طهطا
  girga: 10500,      // جرجا
  west: 13500,       // غرب سوهاج
  default: 15000     // متوسط عام
};

/**
 * Dynamically resolves district average benchmark price per sqm from active CRM area data
 */
export function getDistrictBenchmark(areaKey) {
  try {
    const areas = getAreas();
    const found = areas.find(a => a.id === areaKey);
    if (found && found.avgPricePerMeter) {
      return Number(found.avgPricePerMeter);
    }
  } catch (e) {
    // Fallback if environment without localStorage
  }
  return SOHAG_DISTRICT_BENCHMARKS[areaKey] || SOHAG_DISTRICT_BENCHMARKS.default;
}

/**
 * Formats an EGP amount. `primary` is always EGP (the contract currency).
 * When a display currency is chosen and a rate is known, `approx` holds "≈ 75,400 ر.س";
 * `isConverted`/`originalEgp` mirror it for screens that already render that pair.
 */
export function formatCurrencyPrice(amountInEgp, currency = 'EGP', lang = 'ar') {
  const num = Number(amountInEgp) || 0;
  const currData = CURRENCY_RATES.EGP;
  const isAr = lang === 'ar';
  const approx = currency && currency !== 'EGP' ? formatApprox(num, currency, lang) : '';

  return {
    primary: num.toLocaleString('en-US'),
    symbol: isAr ? currData.symbol_ar : currData.symbol_en,
    isConverted: Boolean(approx),
    approx,
    // Legacy field name: screens render "≈ {originalEgp}" — it now carries the foreign equivalent
    originalEgp: approx.replace(/^≈\s*/, ''),
    flag: currData.flag
  };
}

/**
 * Detects if a property is a full building, multi-unit house, or mixed-use asset.
 * For these assets, simple flat (price / footprint area) does not represent unit price per sqm.
 */
export function isMultiUnitOrBuilding(property) {
  if (!property) return false;
  if (property.type === 'building' || property.type === 'house' || property.isMultiUnit || property.category === 'building') {
    return true;
  }
  const text = `${property.title_ar || ''} ${property.title_en || ''} ${property.commercialType_ar || ''} ${property.description_ar || ''} ${property.description_en || ''}`.toLowerCase();
  return /(?:منزل|عمارة|عماره|مبنى|مبني|بيت عيلة|بيت عائلي|شقق.*محلات|محلات.*شقق|برج سكن|عقار كامل|building|entire house)/i.test(text);
}

/**
 * Extracts unit breakdown from title, description, or property fields
 */
export function parseUnitBreakdown(property, isAr = true) {
  if (!property) return null;
  const title = property.title_ar || property.title_en || '';
  const desc = property.description_ar || property.description_en || '';
  const combined = `${title} ${desc}`;

  const resUnits = property.residentialUnitsCount || property.apartmentsCount;
  const commUnits = property.commercialUnitsCount || property.shopsCount;
  const floors = property.totalFloors || property.floorsCount;

  const aptMatch = resUnits || (combined.match(/(\d+)\s*(?:شقق|شقة)/) ? combined.match(/(\d+)\s*(?:شقق|شقة)/)[1] : null);
  const shopMatch = commUnits || (combined.match(/(\d+)\s*(?:محلات|محل)/) ? combined.match(/(\d+)\s*(?:محلات|محل)/)[1] : null);
  const floorMatch = floors || (combined.match(/(\d+)\s*(?:أدوار|ادوار|طوابق|دور)/) ? combined.match(/(\d+)\s*(?:أدوار|ادوار|طوابق|دور)/)[1] : null);

  const parts = [];
  if (floorMatch) parts.push(isAr ? `${floorMatch} أدوار` : `${floorMatch} Floors`);
  if (aptMatch) parts.push(isAr ? `${aptMatch} شقق` : `${aptMatch} Apts`);
  if (shopMatch) parts.push(isAr ? `${shopMatch} محلات` : `${shopMatch} Shops`);

  return {
    floors: floorMatch ? Number(floorMatch) : null,
    residentialUnits: aptMatch ? Number(aptMatch) : null,
    commercialUnits: shopMatch ? Number(shopMatch) : null,
    summary: parts.join(' · ') || (isAr ? 'عقار مركب (سكني + تجاري)' : 'Mixed-use building')
  };
}

/**
 * Computes price per square meter and compares with district benchmark
 */
// District averages are residential prices per m². Shops, offices, clinics and land are priced by
// frontage, activity and zoning, so they get no "above/below the area average" verdict.
const RESIDENTIAL_TYPES = ['apartment', 'villa', 'duplex', 'penthouse', 'studio', 'chalet', 'townhouse', 'twinhouse', 'residential'];
export const isResidentialProperty = (p) => !p?.type || RESIDENTIAL_TYPES.includes(p.type) || p.category === 'residential';

export function getPriceBenchmark(property, lang = 'ar') {
  if (!property || !property.price || !property.size) {
    return null;
  }

  const isAr = lang === 'ar';

  // Multi-unit buildings / mixed-use houses must NOT be divided naively by footprint area
  if (isMultiUnitOrBuilding(property)) {
    const breakdown = parseUnitBreakdown(property, isAr);
    return {
      isMultiUnit: true,
      pricePerMeter: null,
      pricePerMeterFormatted: null,
      badgeType: 'building',
      badgeLabel: isAr ? '🏢 عقار كامل (سكني + تجاري)' : '🏢 Full Building (Mixed-Use)',
      badgeColor: '#0b4ea2',
      badgeBg: 'rgba(11, 78, 162, 0.1)',
      unitBreakdown: breakdown,
      valuationNote: isAr
        ? 'عقار متعدد الوحدات والأدوار: السعر إجمالي للكيان بالكامل (أرض + محلات تجارية + شقق)، ولا يقاس بقسمة السعر على مساحة الأرض المسطحة.'
        : 'Multi-unit building: lump-sum price for land, commercial shops, and residential units.'
    };
  }

  const price = Number(property.price) || 0;
  const size = Number(property.size) || 1;
  const pricePerMeter = Math.round(price / size);
  if (!isResidentialProperty(property) && !property.customBenchmarkPrice) return null;

  const areaKey = property.areaKey || 'default';
  const districtAvg = property.customBenchmarkPrice || getDistrictBenchmark(areaKey);

  const ratio = pricePerMeter / districtAvg;

  let badgeType;
  let badgeLabel;
  let badgeColor;
  let badgeBg;

  if (ratio < 0.92) {
    const diffPercent = Math.round((1 - ratio) * 100);
    badgeType = 'deal';
    // Measured difference only — no "hot deal" / "rare location" verdicts
    badgeLabel = isAr
      ? `أقل ${diffPercent}% من متوسط سعر الحي`
      : `${diffPercent}% below area average`;
    badgeColor = '#10b981';
    badgeBg = 'rgba(16, 185, 129, 0.12)';
  } else if (ratio <= 1.08) {
    badgeType = 'fair';
    badgeLabel = isAr ? 'قريب من متوسط سعر الحي' : 'Close to area average';
    badgeColor = '#0b4ea2';
    badgeBg = 'rgba(11, 78, 162, 0.1)';
  } else {
    badgeType = 'premium';
    const abovePercent = Math.round((ratio - 1) * 100);
    badgeLabel = isAr ? `أعلى ${abovePercent}% من متوسط سعر الحي` : `${abovePercent}% above area average`;
    badgeColor = '#d97706';
    badgeBg = 'rgba(245, 158, 11, 0.14)';
  }

  return {
    pricePerMeter,
    pricePerMeterFormatted: `${pricePerMeter.toLocaleString('en-US')} ${isAr ? 'ج.م/م²' : 'EGP/m²'}`,
    badgeType,
    badgeLabel,
    badgeColor,
    badgeBg
  };
}
