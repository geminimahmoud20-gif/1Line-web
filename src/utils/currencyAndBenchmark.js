/**
 * 💱 1LINE PROPTECH CURRENCY CONVERTER & DISTRICT PRICE BENCHMARK ENGINE
 * Designed for Sohag, Upper Egypt, and Gulf Expat Investors.
 */

// Approximate exchange rates to Egyptian Pound (Base: 1 EGP)
export const CURRENCY_RATES = {
  EGP: { rate: 1, symbol_ar: 'ج.م', symbol_en: 'EGP', flag: '🇪🇬' },
  SAR: { rate: 0.076, symbol_ar: 'ر.س', symbol_en: 'SAR', flag: '🇸🇦' },
  AED: { rate: 0.075, symbol_ar: 'د.إ', symbol_en: 'AED', flag: '🇦🇪' },
  USD: { rate: 0.020, symbol_ar: '$', symbol_en: 'USD', flag: '🇺🇸' },
  KWD: { rate: 0.0062, symbol_ar: 'د.ك', symbol_en: 'KWD', flag: '🇰🇼' }
};

import { getAreas } from './areasData';

// Fallback District average price per m² benchmarks in Sohag (EGP / m²)
export const SOHAG_DISTRICT_BENCHMARKS = {
  corniche: 26000,   // كورنيش النيل (أعلى قيمة معمارية)
  east: 21000,       // شرق سوهاج والجمهورية والثقافة
  center: 17500,     // سيتي وشارع 15 ووسط البلد والمخبز الآلي
  new_sohag: 12000,  // سوهاج الجديدة
  kawthar: 9000,     // حي الكوثر
  akhmeem: 9500,     // أخميم
  tahta: 11000,      // طهطا
  west: 13500,       // غرب سوهاج
  girga: 10500,      // جرجا
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
 * Formats a monetary value according to selected currency and language
 */
export function formatCurrencyPrice(amountInEgp, currency = 'EGP', lang = 'ar') {
  const num = Number(amountInEgp) || 0;
  const currData = CURRENCY_RATES[currency] || CURRENCY_RATES.EGP;
  const isAr = lang === 'ar';

  if (currency === 'EGP') {
    return {
      primary: num.toLocaleString(),
      symbol: isAr ? currData.symbol_ar : currData.symbol_en,
      isConverted: false,
      flag: currData.flag
    };
  }

  // Calculate converted amount
  const converted = Math.round(num * currData.rate);
  return {
    primary: converted.toLocaleString(),
    symbol: isAr ? currData.symbol_ar : currData.symbol_en,
    originalEgp: `${num.toLocaleString()} ${isAr ? 'ج.م' : 'EGP'}`,
    isConverted: true,
    flag: currData.flag
  };
}

/**
 * Computes price per square meter and compares with district benchmark
 */
export function getPriceBenchmark(property, lang = 'ar') {
  if (!property || !property.price || !property.size) {
    return null;
  }

  const isAr = lang === 'ar';
  const price = Number(property.price) || 0;
  const size = Number(property.size) || 1;
  const pricePerMeter = Math.round(price / size);

  const areaKey = property.areaKey || 'default';
  const districtAvg = property.customBenchmarkPrice || getDistrictBenchmark(areaKey);

  const ratio = pricePerMeter / districtAvg;

  let badgeType = 'fair';
  let badgeLabel = '';
  let badgeColor = '#0284c7';
  let badgeBg = 'rgba(2, 132, 199, 0.12)';

  if (ratio < 0.92) {
    const diffPercent = Math.round((1 - ratio) * 100);
    badgeType = 'deal';
    badgeLabel = isAr 
      ? `سعر لقطة (أقل ${diffPercent}% عن متوسط الحي)` 
      : `Hot Deal (-${diffPercent}% below avg)`;
    badgeColor = '#10b981';
    badgeBg = 'rgba(16, 185, 129, 0.12)';
  } else if (ratio <= 1.08) {
    badgeType = 'fair';
    badgeLabel = isAr ? 'سعر عادل لمتوسط الحي' : 'Fair Market Price';
    badgeColor = '#0b4ea2';
    badgeBg = 'rgba(11, 78, 162, 0.1)';
  } else {
    badgeType = 'premium';
    badgeLabel = isAr ? 'عقار بريميوم / تشطيب وموقع نادر' : 'Prime Luxury / Rare Location';
    badgeColor = '#d97706';
    badgeBg = 'rgba(245, 158, 11, 0.14)';
  }

  return {
    pricePerMeter,
    pricePerMeterFormatted: `${pricePerMeter.toLocaleString()} ${isAr ? 'ج.م/م²' : 'EGP/m²'}`,
    badgeType,
    badgeLabel,
    badgeColor,
    badgeBg
  };
}
