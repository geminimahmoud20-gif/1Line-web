// =============================================================
//  1LINE REAL ESTATE - CURRENCY UTILITY (EGYPTIAN POUND ONLY)
// =============================================================

export const CURRENCIES = {
  EGP: { code: 'EGP', symbol_ar: 'ج.م', symbol_en: 'EGP', rate: 1.0, flag: '🇪🇬', name_ar: 'جنيه مصري', name_en: 'Egyptian Pound' }
};

/**
 * Format a price strictly in Egyptian Pound (EGP)
 */
export const formatCurrency = (amountInEgp, currencyCode = 'EGP', lang = 'ar') => {
  if (!amountInEgp || isNaN(amountInEgp)) return '0';
  const symbol = lang === 'ar' ? 'ج.م' : 'EGP';
  return `${Math.round(amountInEgp).toLocaleString()} ${symbol}`;
};
