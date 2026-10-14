/**
 * Helper to sanitize, localize, and deduplicate CRM notes and demands.
 * Prevents raw developer slugs (e.g. new_sohag, apartment) from leaking into UI
 * and stops endless repeating pipe-delimited note strings.
 */

const SLUG_DICTIONARY = {
  new_sohag: 'سوهاج الجديدة',
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
  commercial: 'محل تجاري',
  clinic: 'عيادة ومقر طبي',
  office: 'مكتب إداري',
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

export function sanitizeAndMergeNotes(existingNotes = '', incomingData = {}) {
  // 1. Build localized fragment for the incoming request
  let newFragment = '';
  if (incomingData.notes && incomingData.notes.trim()) {
    let clean = incomingData.notes.trim();
    // Replace any embedded slugs inside free text
    Object.entries(SLUG_DICTIONARY).forEach(([slug, arabic]) => {
      clean = clean.replace(new RegExp(`\\b${slug}\\b`, 'gi'), arabic);
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

  const cleanedParts = [];
  existingParts.forEach(part => {
    let cleanedPart = part;
    Object.entries(SLUG_DICTIONARY).forEach(([slug, arabic]) => {
      cleanedPart = cleanedPart.replace(new RegExp(`\\b${slug}\\b`, 'gi'), arabic);
    });
    // Deduplicate identical parts
    if (!cleanedParts.includes(cleanedPart)) {
      cleanedParts.push(cleanedPart);
    }
  });

  // 3. Append newFragment if not already included
  if (newFragment) {
    const formattedFragment = newFragment.startsWith('طلب') || newFragment.startsWith('عرض') 
      ? newFragment 
      : `طلب إضافي: ${newFragment}`;
      
    if (!cleanedParts.some(p => p.includes(newFragment) || newFragment.includes(p))) {
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
