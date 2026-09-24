/**
 * Single source of truth for public brand facts (domain, contact, coverage, verified stats).
 * Phone/WhatsApp stay editable from the Founder CMS (see utils/founderCmsData.js).
 *
 * Set VITE_SITE_URL in Vercel once the official domain is connected
 * (e.g. https://1line-sohag.com). Until then the current origin is used,
 * so canonical URLs never point to a domain that doesn't resolve.
 */

const envUrl = (import.meta.env?.VITE_SITE_URL || '').replace(/\/+$/, '');

export const SITE_URL = envUrl || (typeof window !== 'undefined' ? window.location.origin : 'https://1-line-qkzp9.vercel.app');

export const BRAND = {
  name_ar: 'ون لاين للاستشارات والتسويق العقاري',
  name_en: '1Line Solutions',
  legalName: '1Line Solutions Real Estate',
  tagline_ar: 'وساطة واستشارات عقارية للأصول عالية القيمة في سوهاج والقاهرة الكبرى',
  tagline_en: 'High-value real estate brokerage & advisory in Sohag and Greater Cairo',
  founder_ar: 'د. محمود الباز',
  founder_en: 'Dr. Mahmoud Elbaz',
};

export const CONTACT = {
  email: 'contact@oneline-sohag.com',
  address_ar: 'برج أحمد حلمي الشريف، شارع الجمهورية، سوهاج',
  address_en: 'Ahmed Helmy El-Sherif Tower, El-Gomhoreya St., Sohag',
  hours_ar: 'يومياً 10 صباحاً – 10 مساءً (عدا الجمعة)',
  hours_en: 'Daily 10:00–22:00 (closed Friday)',
  mapsUrl: 'https://maps.google.com/?q=' + encodeURIComponent('شارع الجمهورية برج احمد حلمي الشريف سوهاج'),
  geo: { lat: 26.5569, lng: 31.6948 },
};

export const SERVICE_AREAS = {
  sohag_ar: ['شرق سوهاج', 'غرب سوهاج', 'سوهاج الجديدة', 'كورنيش النيل', 'حي الكوثر', 'أخميم', 'طهطا', 'جرجا'],
  cairo_ar: ['القاهرة الجديدة والتجمع', 'الشيخ زايد', 'السادس من أكتوبر', 'العاصمة الإدارية'],
  sohag_en: ['East Sohag', 'West Sohag', 'New Sohag', 'Nile Corniche', 'El Kawthar', 'Akhmim', 'Tahta', 'Girga'],
  cairo_en: ['New Cairo', 'Sheikh Zayed', '6th of October', 'New Administrative Capital'],
};

/**
 * Only numbers you can document go here. Anything left as null is hidden from the site.
 * Example: { deals: 120, volumeEgp: '450M', clients: 900, yearsActive: 8 }
 */
export const VERIFIED_STATS = {
  deals: null,
  volumeEgp: null,
  clients: null,
  yearsActive: 8,
};

/**
 * Seller-banner proof points. Buyer counts are computed live from published demands;
 * the rest are business facts the owner must confirm — null hides the tile.
 *   avgDaysToClose: median days from listing to signed contract (from your CRM records)
 *   sellerCommissionPct: brokerage fee charged to the seller (the site already states "no seller commission")
 */
export const SELLER_PROOF = {
  avgDaysToClose: null,
  sellerCommissionPct: 0,
};

/** Commercial registry / tax card numbers, shown in footer & About once filled. */
export const LEGAL_IDS = {
  commercialRegistry: null,
  taxCard: null,
};
