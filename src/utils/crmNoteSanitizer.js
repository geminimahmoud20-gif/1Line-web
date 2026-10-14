/**
 * Helper to sanitize, localize, and deduplicate CRM notes and demands.
 * Prevents raw developer slugs (e.g. new_sohag, apartment) from leaking into UI,
 * stops repeating pipe-delimited note strings, and normalizes phone numbers.
 */

const SLUG_DICTIONARY = {
  new_sohag: 'سوهاج الجديدة',
  'new-sohag': 'سوهاج الجديدة',
  'new sohag': 'سوهاج الجديدة',
  corniche: 'كورنيش النيل',
  city: 'سيتي والشبان',
  kawthar: 'مدينة الكوثر',
  akhmeem: 'أخميم',
  tahta: 'طهطا',
  girga: 'جرجا',
  araba: 'عرابة أبيدوس',
  thakafa: 'منطقة الثقافة',
  east: 'حي شرق',
  west: 'حي غرب',
  apartment: 'شقة سكنية',
  duplex: 'دوبلكس',
  villa: 'فيلا مستقلة',
  chalet: 'شاليه',
  penthouse: 'بنتهاوس',
  building: 'عمارة كاملة',
  commercial: 'محل تجاري',
  retail: 'محل تجاري',
  clinic: 'عيادة ومقر طبي',
  office: 'مكتب إداري',
  administrative: 'مقر إداري',
  land: 'أرض',
  buyer: 'طلب شراء',
  seller: 'عرض بيع',
  investor: 'فرصة استثمار'
};

export function localizeSlug(val) {
  if (!val) return '';
  const clean = String(val).trim().toLowerCase();
  return SLUG_DICTIONARY[clean] || val;
}

/**
 * Normalizes phone numbers to standard Egyptian format.
 * - 10 digits starting with 10/11/12/15 -> prepends 0 (e.g. 1223222956 -> 01223222956)
 * - 12 digits starting with 201... -> converts to 01... (e.g. 201223222956 -> 01223222956)
 * - +201... -> converts to 01... for clean local display without flipped plus signs
 */
export function formatPhoneNumber(phone) {
  if (!phone) return '';
  const str = String(phone).trim().replace(/[\s\-_()]/g, '');
  if (!str) return '';

  // 10 digits starting with 10, 11, 12, 15 (e.g. 1223222956)
  if (/^1[0125]\d{8}$/.test(str)) {
    return '0' + str;
  }
  // 12 digits starting with 201... (e.g. 201223222956)
  if (/^201[0125]\d{8}$/.test(str)) {
    return '0' + str.slice(2);
  }
  // +201... (e.g. +201223222956)
  if (/^\+201[0125]\d{8}$/.test(str)) {
    return '0' + str.slice(3);
  }

  return str;
}

export function sanitizeAndMergeNotes(existingNotes = '', incomingData = {}) {
  // 1. Build localized fragment for the incoming request
  let newFragment = '';
  if (incomingData.notes && incomingData.notes.trim()) {
    let clean = incomingData.notes.trim();
    // Replace any embedded slugs inside free text
    Object.entries(SLUG_DICTIONARY).forEach(([slug, arabic]) => {
      const escaped = slug.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
      clean = clean.replace(new RegExp(`(^|[^a-zA-Z0-9_])${escaped}([^a-zA-Z0-9_]|$)`, 'gi'), (m, p1, p2) => `${p1}${arabic}${p2}`);
    });
    newFragment = clean;
  } else if (incomingData.propertyType || incomingData.area) {
    const type = localizeSlug(incomingData.propertyType);
    const area = localizeSlug(incomingData.area);
    const size = incomingData.size ? ` بمساحة ${incomingData.size}م²` : '';
    newFragment = `طلب: ${type || 'عقار'} في ${area || 'سوهاج'}${size}`;
  }

  // 2. Split existing notes and clean any legacy slugs
  const existingParts = (existingNotes || '')
    .split('|')
    .map(p => p.trim())
    .filter(Boolean);

  const seenNorm = new Set();
  const cleanedParts = [];

  existingParts.forEach(part => {
    let cleanedPart = part;
    Object.entries(SLUG_DICTIONARY).forEach(([slug, arabic]) => {
      const escaped = slug.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
      cleanedPart = cleanedPart.replace(new RegExp(`(^|[^a-zA-Z0-9_])${escaped}([^a-zA-Z0-9_]|$)`, 'gi'), (m, p1, p2) => `${p1}${arabic}${p2}`);
    });

    // Reorder "area في type" to "type في area" (e.g. "منطقة الثقافة في شقة سكنية" -> "شقة سكنية في منطقة الثقافة")
    cleanedPart = cleanedPart.replace(/(منطقة الثقافة|سوهاج الجديدة|كورنيش النيل|مدينة الكوثر|أخميم|طهطا|جرجا|عرابة أبيدوس|حي شرق|حي غرب|سيتي والشبان)\s+في\s+(شقة سكنية|دوبلكس|فيلا مستقلة|شاليه|بنتهاوس|عمارة كاملة|محل تجاري|عيادة ومقر طبي|مكتب إداري|أرض)/g, '$2 في $1');

    cleanedPart = cleanedPart.trim();
    if (!cleanedPart) return;

    // Normalize key to deduplicate near-identical fragments
    const normKey = cleanedPart
      .replace(/^طلب\s*إضافي:\s*/i, '')
      .replace(/^طلب:\s*/i, '')
      .replace(/^عرض:\s*/i, '')
      .trim();

    if (!seenNorm.has(normKey)) {
      seenNorm.add(normKey);
      cleanedParts.push(cleanedPart);
    }
  });

  // 3. Append newFragment if not already included
  if (newFragment) {
    newFragment = newFragment.trim();
    // Normalize area-type if reversed
    newFragment = newFragment.replace(/(منطقة الثقافة|سوهاج الجديدة|كورنيش النيل|مدينة الكوثر|أخميم|طهطا|جرجا|عرابة أبيدوس|حي شرق|حي غرب|سيتي والشبان)\s+في\s+(شقة سكنية|دوبلكس|فيلا مستقلة|شاليه|بنتهاوس|عمارة كاملة|محل تجاري|عيادة ومقر طبي|مكتب إداري|أرض)/g, '$2 في $1');

    const formattedFragment = newFragment.startsWith('طلب') || newFragment.startsWith('عرض') 
      ? newFragment 
      : `طلب إضافي: ${newFragment}`;

    const newNorm = newFragment
      .replace(/^طلب\s*إضافي:\s*/i, '')
      .replace(/^طلب:\s*/i, '')
      .replace(/^عرض:\s*/i, '')
      .trim();

    if (!seenNorm.has(newNorm)) {
      seenNorm.add(newNorm);
      cleanedParts.push(formattedFragment);
    }
  }

  return cleanedParts.join(' | ');
}

/**
 * Format Arabic plural count correctly (e.g. 1 طلب -> طلب واحد, 2 -> طلبان, 3-10 -> طلبات, 11-99 -> طلباً)
 */
export function formatArabicPlural(count, singular = 'طلب', dual = 'طلبان', plural3to10 = 'طلبات', plural11plus = 'طلباً') {
  const n = Math.abs(parseInt(count, 10)) || 0;
  if (n === 0) return `لا توجد ${plural3to10}`;
  if (n === 1) return `${singular} واحد`;
  if (n === 2) return `${dual}`;
  if (n >= 3 && n <= 10) return `${n} ${plural3to10}`;
  return `${n} ${plural11plus}`;
}
