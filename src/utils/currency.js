// =============================================================
//  ONE LINE REAL ESTATE - MULTI-CURRENCY CONVERSION UTILITY
// =============================================================

export const CURRENCIES = {
  EGP: { code: 'EGP', symbol_ar: 'ج.م', symbol_en: 'EGP', rate: 1.0, flag: '🇪🇬', name_ar: 'جنيه مصري', name_en: 'Egyptian Pound' },
  SAR: { code: 'SAR', symbol_ar: 'ر.س', symbol_en: 'SAR', rate: 0.076, flag: '🇸🇦', name_ar: 'ريال سعودي', name_en: 'Saudi Riyal' },
  AED: { code: 'AED', symbol_ar: 'د.إ', symbol_en: 'AED', rate: 0.075, flag: '🇦🇪', name_ar: 'درهم إماراتي', name_en: 'UAE Dirham' },
  KWD: { code: 'KWD', symbol_ar: 'د.ك', symbol_en: 'KWD', rate: 0.0062, flag: '🇰🇼', name_ar: 'دينار كويتي', name_en: 'Kuwaiti Dinar' },
  USD: { code: 'USD', symbol_ar: '$', symbol_en: '$', rate: 0.020, flag: '🇺🇸', name_ar: 'دولار أمريكي', name_en: 'US Dollar' }
};

/**
 * Format a price in the selected currency
 */
export const formatCurrency = (amountInEgp, currencyCode = 'EGP', lang = 'ar') => {
  if (!amountInEgp || isNaN(amountInEgp)) return '0';
  const curr = CURRENCIES[currencyCode] || CURRENCIES.EGP;
  const converted = Math.round(amountInEgp * curr.rate);
  const symbol = lang === 'ar' ? curr.symbol_ar : curr.symbol_en;
  return `${converted.toLocaleString()} ${symbol}`;
};
