// How a unit is handed over: its finishing level and when the buyer gets the keys.
// Stored on the listing as `finishing` (an id below) plus `finishing_ar` / `finishing_en`, which
// the facts row, filters, compare and copywriter already read; and `completionStatus` +
// `deliveryYear` for the handover. Older listings carry only free-text `finishing_ar`.
// Pure helpers, unit-tested in tests/unit/unit-handover.test.mjs.

// `ar`/`en` explain the level on the CRM picker; `short_ar`/`short_en` are what the site shows
export const FINISHING_LEVELS = [
  { id: 'core', ar: 'على الطوب (من غير تشطيب)', en: 'Core & shell (unfinished)', short_ar: 'على الطوب', short_en: 'Core & shell', group: 'core' },
  { id: 'semi', ar: 'نص تشطيب (محارة وحلوق)', en: 'Semi-finished (plaster & frames)', short_ar: 'نص تشطيب', short_en: 'Semi-finished', group: 'core' },
  { id: 'full', ar: 'تشطيب كامل', en: 'Fully finished', short_ar: 'تشطيب كامل', short_en: 'Fully finished', group: 'finished' },
  { id: 'lux', ar: 'تشطيب لوكس', en: 'Lux finishing', short_ar: 'لوكس', short_en: 'Lux', group: 'finished' },
  { id: 'super_lux', ar: 'تشطيب سوبر لوكس', en: 'Super lux finishing', short_ar: 'سوبر لوكس', short_en: 'Super lux', group: 'finished' },
  { id: 'ultra_lux', ar: 'ألترا سوبر لوكس', en: 'Ultra super lux', short_ar: 'ألترا سوبر لوكس', short_en: 'Ultra super lux', group: 'finished' },
  { id: 'furnished', ar: 'مفروش بالكامل', en: 'Fully furnished', short_ar: 'مفروش', short_en: 'Furnished', group: 'finished' },
  { id: 'mixed', ar: 'أدوار متشطبة وأدوار لأ', en: 'Partly finished', short_ar: 'متشطب جزئياً', short_en: 'Partly finished', group: 'mixed' }
];

export const HANDOVER_STATES = [
  { id: 'ready', ar: 'استلام فوري', en: 'Ready now' },
  { id: 'under_construction', ar: 'تحت الإنشاء', en: 'Under construction' }
];

const clean = (v) => String(v ?? '').trim();
const levelById = (id) => FINISHING_LEVELS.find((l) => l.id === id) || null;

// Free text written before the picker existed, matched to a level (most specific first)
const TEXT_MATCH = [
  ['ultra_lux', ['ألترا', 'الترا', 'ultra']],
  ['super_lux', ['سوبر', 'super']],
  ['furnished', ['مفروش', 'furnished']],
  ['lux', ['لوكس', 'lux']],
  ['mixed', ['أدوار متشطبة', 'جزئي', 'جزئيا', 'partly']],
  ['semi', ['نص تشطيب', 'نصف تشطيب', 'محارة', 'semi']],
  ['core', ['طوب', 'على الطوب', 'بدون تشطيب', 'من غير تشطيب', 'core', 'shell']],
  ['full', ['تشطيب كامل', 'كامل التشطيب', 'متشطب', 'fully finished']]
];

/** The listing's finishing level id, also read from older free text; '' when unknown */
export function finishingIdOf(p) {
  if (!p) return '';
  if (levelById(p.finishing)) return p.finishing;
  const text = `${clean(p.finishing_ar)} ${clean(p.finishing_en)}`.toLowerCase();
  if (!text.trim()) return '';
  const hit = TEXT_MATCH.find(([, words]) => words.some((w) => text.includes(w.toLowerCase())));
  return hit ? hit[0] : '';
}

/** Fields to write when the team picks a level ('' clears it) */
export function finishingPatch(id) {
  const level = levelById(id);
  if (!level) return { finishing: '', finishing_ar: '', finishing_en: '' };
  return { finishing: level.id, finishing_ar: level.short_ar, finishing_en: level.short_en };
}

/** For the listings filter: 'core' = على الطوب / نص تشطيب, 'lux' = finished or better */
export function finishingGroupOf(p) {
  const level = levelById(finishingIdOf(p));
  return level ? level.group : '';
}

/** Fields to write for the handover state; a delivery year only applies while building */
export function handoverPatch(status, year) {
  if (status === 'ready') return { completionStatus: 'ready', deliveryYear: '' };
  if (status === 'under_construction') {
    const y = Number(year);
    return { completionStatus: 'under_construction', deliveryYear: Number.isInteger(y) && y >= 2000 && y <= 2100 ? y : '' };
  }
  return { completionStatus: '', deliveryYear: '' };
}

/** What an owner picked on /sell, as listing fields for the draft */
export function handoverFromSeller(finishingId, label = '') {
  if (finishingId === 'under_construction') return { ...finishingPatch(''), ...handoverPatch('under_construction') };
  const patch = finishingPatch(finishingId);
  return patch.finishing ? patch : { finishing: '', finishing_ar: clean(label), finishing_en: '' };
}
