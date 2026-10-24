// Kinds of nearby landmark a listing can show (CRM form → unit page). One list for both sides.
// The ids of the first five are the original ones stored on older listings; keep them.
// Pure; tested in tests/unit/amenity-categories.test.mjs.
export const AMENITY_CATEGORIES = [
  { id: 'education', ar: 'مدارس وجامعات', en: 'Schools & universities', icon: 'School' },
  { id: 'nursery', ar: 'حضانات', en: 'Nurseries', icon: 'Baby' },
  { id: 'health', ar: 'مستشفيات وعيادات', en: 'Hospitals & clinics', icon: 'Hospital' },
  { id: 'pharmacy', ar: 'صيدليات', en: 'Pharmacies', icon: 'Pill' },
  { id: 'grocery', ar: 'سوبر ماركت ومخابز', en: 'Groceries & bakeries', icon: 'ShoppingCart' },
  { id: 'shopping', ar: 'مولات ومحلات', en: 'Malls & shops', icon: 'ShoppingBag' },
  { id: 'restaurants', ar: 'مطاعم وكافيهات', en: 'Restaurants & cafés', icon: 'UtensilsCrossed' },
  { id: 'worship', ar: 'مساجد وكنائس', en: 'Mosques & churches', icon: 'Landmark' },
  { id: 'banks', ar: 'بنوك وATM', en: 'Banks & ATMs', icon: 'Banknote' },
  { id: 'government', ar: 'مصالح حكومية', en: 'Government offices', icon: 'Building2' },
  { id: 'security', ar: 'شرطة وإطفاء', en: 'Police & fire', icon: 'Shield' },
  { id: 'transport', ar: 'مواصلات ومحطات', en: 'Transit & stations', icon: 'Train' },
  { id: 'roads', ar: 'طرق ومحاور وكباري', en: 'Roads & bridges', icon: 'Route' },
  { id: 'fuel', ar: 'بنزينة', en: 'Fuel station', icon: 'Fuel' },
  { id: 'parks', ar: 'حدائق وكورنيش', en: 'Parks & Corniche', icon: 'Trees' },
  { id: 'sports', ar: 'نوادي وجيم', en: 'Clubs & gyms', icon: 'Dumbbell' },
  { id: 'lifestyle', ar: 'ترفيه وفنادق', en: 'Leisure & hotels', icon: 'Hotel' }
];

// The CRM select groups them so the list stays easy to scan
export const AMENITY_GROUPS = [
  { ar: 'تعليم وصحة', en: 'Education & health', ids: ['education', 'nursery', 'health', 'pharmacy'] },
  { ar: 'خدمات يومية', en: 'Everyday', ids: ['grocery', 'shopping', 'restaurants', 'worship', 'banks'] },
  { ar: 'حكومة وأمان', en: 'Government & safety', ids: ['government', 'security'] },
  { ar: 'مواصلات وطرق', en: 'Getting around', ids: ['transport', 'roads', 'fuel'] },
  { ar: 'ترفيه ورياضة', en: 'Leisure & sport', ids: ['parks', 'sports', 'lifestyle'] }
];

const BY_ID = new Map(AMENITY_CATEGORIES.map((c) => [c.id, c]));

/** The category for an id; unknown ids (or none) fall back to a generic landmark */
export function amenityCategory(id) {
  return BY_ID.get(id) || { id: 'other', ar: 'معالم أخرى', en: 'Other', icon: 'MapPin' };
}

/** Categories that actually appear in a list of landmarks, in the list's canonical order */
export function categoriesIn(list = []) {
  const present = new Set(list.map((a) => a?.category || 'other'));
  const known = AMENITY_CATEGORIES.filter((c) => present.has(c.id));
  return present.has('other') || [...present].some((id) => !BY_ID.has(id))
    ? [...known, amenityCategory('other')]
    : known;
}
