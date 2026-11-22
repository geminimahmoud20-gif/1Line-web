// =============================================================
//  Common spelling slips in listing titles and descriptions, fixed before they reach a visitor,
//  Google or a WhatsApp preview: «استيراتيجي» → «استراتيجي», «شقه مميزه» → «شقة مميزة»,
//  «علي المحور» → «على المحور», « _ » between parts → « – ».
//  Whole words only (a name like «علي» on its own is left alone). Pure: tests/unit/listing-spelling.test.mjs
// =============================================================

// slip → right spelling (whole words)
const WORDS = {
  'استيراتيجي': 'استراتيجي', 'استيراتيجية': 'استراتيجية', 'استيراتيجيه': 'استراتيجية', 'استراتيجيه': 'استراتيجية',
  'استيلام': 'استلام', 'إستلام': 'استلام', 'مباشرا': 'مباشرةً', 'متتوسط': 'متوسط', 'متتوسطة': 'متوسطة',
  'شقه': 'شقة', 'وحده': 'وحدة', 'ناصيه': 'ناصية', 'مميزه': 'مميزة', 'متميزه': 'متميزة', 'سكنيه': 'سكنية',
  'اداري': 'إداري', 'الاداري': 'الإداري', 'اداريه': 'إدارية', 'ادارية': 'إدارية', 'الادارية': 'الإدارية', 'الاداريه': 'الإدارية',
  'طبيه': 'طبية', 'تجاريه': 'تجارية', 'التجاريه': 'التجارية', 'استثماريه': 'استثمارية', 'رئيسيه': 'رئيسية',
  'الجديده': 'الجديدة', 'مجاوره': 'مجاورة', 'المجاوره': 'المجاورة', 'عماره': 'عمارة', 'واجهه': 'واجهة', 'قطعه': 'قطعة',
  'مساحه': 'مساحة', 'حديقه': 'حديقة', 'مدينه': 'مدينة', 'نيليه': 'نيلية', 'اطلاله': 'إطلالة', 'اطلالة': 'إطلالة',
  'بحريه': 'بحرية', 'قبليه': 'قبلية', 'شرقيه': 'شرقية', 'غربيه': 'غربية', 'ارض': 'أرض', 'ارضي': 'أرضي', 'الارضي': 'الأرضي',
  'اكتوبر': 'أكتوبر',
};

const LETTER = '\\p{L}\\p{M}';
const WORD_RE = new RegExp(`(?<![${LETTER}])(${Object.keys(WORDS).sort((a, b) => b.length - a.length).join('|')})(?![${LETTER}])`, 'gu');

/** One text with the known slips fixed; anything else is kept as typed */
export function fixListingSpelling(text) {
  if (typeof text !== 'string' || !text) return text;
  return text
    .replace(WORD_RE, (w) => WORDS[w])
    // «علي» before a word with «ال» is the preposition («علي المحور»), not the name «علي»
    .replace(/(?<![\p{L}\p{M}])علي(?=\s+ال)/gu, 'على')
    // «بني سويف _ الواسطة» / «اداريه \ طبيه»: the separators people type instead of a dash or slash
    .replace(/\s+_+\s+|\s*_{2,}\s*/g, ' – ')
    .replace(/\s+\\\s+/g, ' / ')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

/** A listing, project or buyer demand with its Arabic title and description fixed; same object when nothing changes */
export function tidyListing(p) {
  if (!p || typeof p !== 'object') return p;
  const out = {};
  for (const key of ['title_ar', 'description_ar', 'name_ar', 'text_ar']) {
    if (typeof p[key] !== 'string') continue;
    const fixed = fixListingSpelling(p[key]);
    if (fixed !== p[key]) out[key] = fixed;
  }
  return Object.keys(out).length ? { ...p, ...out } : p;
}
