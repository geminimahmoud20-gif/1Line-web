/**
 * Single source of truth for public brand facts (domain, contact, coverage, verified stats).
 * Phone/WhatsApp stay editable from the Founder CMS (see utils/founderCmsData.js).
 *
 * VITE_SITE_URL (.env, or the Vercel project's environment variables, which win) is the
 * official address: https://www.1lineestate.com. 1lineestate.com redirects to it.
 */

const envUrl = (import.meta.env?.VITE_SITE_URL || '').replace(/\/+$/, '');

export const CANONICAL_URL = 'https://www.1lineestate.com';

// Links people share (WhatsApp, PDFs, schema) always name the official domain, whatever address
// the page was opened from: the CRM opened on a vercel.app address used to share vercel.app
// links. Only a local dev server keeps its own origin, so links work while testing.
const isLocal = typeof window !== 'undefined' && /^(localhost|127\.0\.0\.1)$/.test(window.location.hostname);
export const SITE_URL = envUrl || (isLocal ? window.location.origin : CANONICAL_URL);

/** Public link to a page of the site: siteLink('/properties/12') */
export const siteLink = (path = '/') => `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`;

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
  sohag_ar: ['شرق سوهاج', 'غرب سوهاج', 'سوهاج الجديدة', 'كورنيش النيل', 'مراكز سوهاج'],
  cairo_ar: ['التجمع الخامس', 'الشيخ زايد', 'أكتوبر الجديدة'],
  sohag_en: ['East Sohag', 'West Sohag', 'New Sohag', 'Nile Corniche', 'Sohag districts'],
  cairo_en: ['Fifth Settlement', 'Sheikh Zayed', 'New October'],
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
 *   sellerCommissionPct: brokerage fee charged to the seller. 1Line does charge commission (buyer and
 *   seller), so never set this to 0 — leave null unless showing the actual agreed rate.
 */
export const SELLER_PROOF = {
  avgDaysToClose: null,
  sellerCommissionPct: null,
};

/** Commercial registry / tax card numbers, shown in footer & About once filled. */
export const LEGAL_IDS = {
  commercialRegistry: null,
  taxCard: null,
};
