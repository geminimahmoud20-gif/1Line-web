// =============================================================
//  Who put a listing in the system, and why it was sent back. /properties is public, so none of this lives on the
//  listing: it is saved in property_meta/{id}, a staff-only document with the same id (firestore.rules).
//  Pure helpers; storage is src/services/propertyMeta.js. Tests: tests/unit/listing-meta.test.mjs
// =============================================================

/** The usual reasons a listing is sent back; «other» needs the manager's own words */
export const REJECT_REASONS = [
  { id: 'photos', ar: 'الصور ناقصة أو مش واضحة', en: 'Photos missing or unclear' },
  { id: 'price', ar: 'السعر محتاج مراجعة', en: 'Price needs a check' },
  { id: 'data', ar: 'بيانات ناقصة أو غلط', en: 'Details missing or wrong' },
  { id: 'duplicate', ar: 'مكررة', en: 'Duplicate' },
  { id: 'legal', ar: 'الموقف القانوني مش مؤكد', en: 'Legal status not confirmed' },
  { id: 'other', ar: 'سبب تاني', en: 'Other' }
];

/** The text the team reads: the chosen reason, plus the manager's words when there are some. null when nothing usable. */
export function rejectionText(reasonId, note = '') {
  const r = REJECT_REASONS.find((x) => x.id === reasonId);
  const words = String(note || '').trim().replace(/\s+/g, ' ');
  if (!r) return null;
  if (r.id === 'other' && words.length < 3) return null;
  const text = r.id === 'other' ? words : `${r.ar}${words ? ` — ${words}` : ''}`;
  return text.slice(0, 300);
}

/** The `rejection` field saved on property_meta */
export const rejectionField = (text, manager = {}, now = new Date().toISOString()) => ({
  reason: String(text).slice(0, 300),
  byName: String(manager.name || '').slice(0, 80),
  byUid: String(manager.uid || ''),
  at: now
});

/** Marks a notification as «sent back» (the doc has no room for another field): the app and the phone push read it */
export const REJECT_MARK = '⛔ ';

/** The notification (crm_mentions document) for the person who put the listing in */
export function rejectionNotice({ property = {}, toUid, text, manager = {}, now = new Date().toISOString() } = {}) {
  if (!toUid || !manager.uid || toUid === manager.uid) return null;
  return {
    toUid: String(toUid),
    fromUid: String(manager.uid),
    fromName: String(manager.name || '').slice(0, 80),
    entityType: 'property',
    entityId: String(property.id || '').slice(0, 128),
    entityName: String(property.title_ar || property.title_en || property.id || '').slice(0, 80),
    snippet: `${REJECT_MARK}اترفضت: ${String(text || '').slice(0, 130)}`.slice(0, 160),
    createdAt: now
  };
}

/** «رفعه محمود · 12 نوفمبر» for the list, or '' when nobody was recorded (listings from before this existed) */
export function uploaderText(meta, isAr = true) {
  if (!meta?.submittedByName) return '';
  const when = meta.submittedAt ? new Date(meta.submittedAt) : null;
  const day = when && Number.isFinite(when.getTime())
    ? ` · ${when.toLocaleDateString(isAr ? 'ar-EG-u-nu-latn' : 'en-GB', { day: 'numeric', month: 'short' })}`
    : '';
  return `${isAr ? 'رفعه' : 'Added by'} ${meta.submittedByName}${day}`;
}
