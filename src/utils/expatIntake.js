// =============================================================
//  Shared helpers for the expat remote-inspection and trade-in forms
// =============================================================
import { sanitizeInput } from './securityShield';

/** DOMPurify-clean, trimmed and length-capped text (arrays must be cleaned item by item). */
export const cleanText = (value, max = 200) => sanitizeInput(String(value ?? '')).slice(0, max);

export const toLatinDigits = (value) => String(value ?? '')
  .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
  .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06F0));

/** Local number without spaces/dashes/leading zero, digits only. */
export const normalizeLocalPhone = (raw) => {
  const digits = toLatinDigits(raw).replace(/[^\d]/g, '');
  return digits.startsWith('00') ? digits.slice(2) : digits.replace(/^0+/, '');
};

/** Residence countries for expat buyers, with dialing code and IANA zone for the live clock. */
export const EXPAT_COUNTRIES = [
  { id: 'sa', flag: '🇸🇦', ar: 'السعودية', en: 'Saudi Arabia', code: '+966', tz: 'Asia/Riyadh', currency: 'SAR' },
  { id: 'ae', flag: '🇦🇪', ar: 'الإمارات', en: 'UAE', code: '+971', tz: 'Asia/Dubai', currency: 'AED' },
  { id: 'kw', flag: '🇰🇼', ar: 'الكويت', en: 'Kuwait', code: '+965', tz: 'Asia/Kuwait', currency: 'KWD' },
  { id: 'qa', flag: '🇶🇦', ar: 'قطر', en: 'Qatar', code: '+974', tz: 'Asia/Qatar', currency: 'QAR' },
  { id: 'eu', flag: '🇪🇺', ar: 'أوروبا', en: 'Europe', code: '+', tz: 'Europe/Berlin', editableCode: true, currency: 'USD' },
  { id: 'eg', flag: '🇪🇬', ar: 'داخل مصر', en: 'Inside Egypt', code: '+20', tz: 'Africa/Cairo', currency: 'EGP' },
  { id: 'other', flag: '🌍', ar: 'دولة أخرى', en: 'Other', code: '+', tz: null, editableCode: true, currency: 'USD' }
];

export const getCountry = (id) => EXPAT_COUNTRIES.find((c) => c.id === id) || EXPAT_COUNTRIES[0];

/** "14:05" in a given IANA zone, or '' if unsupported. */
export const clockIn = (tz, lang = 'ar') => {
  if (!tz) return '';
  try {
    return new Intl.DateTimeFormat(lang === 'ar' ? 'ar-EG-u-nu-latn' : 'en-GB', { hour: '2-digit', minute: '2-digit', timeZone: tz }).format(new Date());
  } catch {
    return '';
  }
};
