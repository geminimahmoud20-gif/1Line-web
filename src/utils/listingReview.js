// =============================================================
//  CRM listings: what each listing still lacks before it can go on the site, sorting, the extra
//  filters, and the report figures. Pure functions (tests/unit/listing-review.test.mjs).
// =============================================================
import { listingSampleFlags } from './sampleDataFlags.js';
import { getNormalizedPropertyStatus } from './crmLeadViews.js';

export const NO_AREA = '__none';

const STOCK = ['photo-1600585154340-be6161a56a0c', 'photo-1545324418-cc1a3fa10c00', '/no-photo.svg'];
const realPhotos = (p) => (Array.isArray(p?.images) ? p.images : [])
  .filter((src) => typeof src === 'string' && src && !STOCK.some((s) => src.includes(s)));

export const ISSUES = {
  title: { ar: 'العنوان', en: 'Title' },
  photo: { ar: 'صور', en: 'Photos' },
  price: { ar: 'السعر', en: 'Price' },
  size: { ar: 'المساحة', en: 'Size' },
  area: { ar: 'المنطقة', en: 'Area' },
  areaGone: { ar: 'المنطقة (اتمسحت من القائمة)', en: 'Area (removed from the list)' },
  legacy: { ar: 'بيانات قديمة', en: 'Legacy data' }
};

/** No area, or one deleted from the areas list since */
export const noArea = (issues) => issues.includes('area') || issues.includes('areaGone');

/** Same statuses the site uses; trash is separate */
export const listingStatus = getNormalizedPropertyStatus;

/** Keys of what a listing lacks before it can be shown ([] = ready). knownAreas: Set of area ids. */
export function listingIssues(p, knownAreas) {
  const out = [];
  if (!String(p?.title_ar || '').trim()) out.push('title');
  if (realPhotos(p).length === 0) out.push('photo');
  if (!(Number(p?.price) > 0)) out.push('price');
  if (!(Number(p?.size) > 0)) out.push('size');
  if (!p?.areaKey) out.push('area');
  else if (knownAreas && !knownAreas.has(p.areaKey)) out.push('areaGone');
  if (listingSampleFlags(p).length > 0) out.push('legacy');
  return out;
}

export const photoCount = (p) => realPhotos(p).length;

export function pricePerM2(p) {
  const price = Number(p?.price);
  const size = Number(p?.size);
  return price > 0 && size > 0 ? Math.round(price / size) : 0;
}

// Ids are "prop-<ms>" for listings added in the CRM; createdAt/updatedAt are ISO strings when set
const addedAt = (p) => {
  const t = Date.parse(p?.createdAt || '') || Date.parse(p?.updatedAt || '');
  if (t) return t;
  const m = /(\d{12,})/.exec(String(p?.id || ''));
  return m ? Number(m[1]) : 0;
};

export const SORTS = {
  newest: { ar: 'الأحدث', en: 'Newest', fn: (a, b) => addedAt(b) - addedAt(a) },
  price_asc: { ar: 'السعر: الأقل', en: 'Price: low', fn: (a, b) => (Number(a.price) || Infinity) - (Number(b.price) || Infinity) },
  price_desc: { ar: 'السعر: الأعلى', en: 'Price: high', fn: (a, b) => (Number(b.price) || 0) - (Number(a.price) || 0) },
  m2_asc: { ar: 'سعر المتر: الأقل', en: 'Per m²: low', fn: (a, b) => (pricePerM2(a) || Infinity) - (pricePerM2(b) || Infinity) },
  size_desc: { ar: 'المساحة: الأكبر', en: 'Size: largest', fn: (a, b) => (Number(b.size) || 0) - (Number(a.size) || 0) },
  incomplete: { ar: 'الأكتر نقصاً', en: 'Most incomplete', fn: null } // needs the issues map; see sortListings
};

export function sortListings(list, key, issuesOf) {
  if (key === 'incomplete') return [...list].sort((a, b) => issuesOf(b).length - issuesOf(a).length);
  const fn = SORTS[key]?.fn;
  return fn ? [...list].sort(fn) : list;
}

const inRange = (value, min, max) => {
  const v = Number(value);
  if (min !== '' && min != null && !(v >= Number(min))) return false;
  if (max !== '' && max != null && !(v <= Number(max))) return false;
  return true;
};

/**
 * One listing against the panel's filters. f: { status, type, area, readiness ('all'|'ready'|'incomplete'),
 * issue (an ISSUES key or 'all'), priceMin, priceMax, sizeMin, sizeMax, q }
 */
export function matchesFilters(p, f, issues) {
  const st = listingStatus(p);
  if (f.status === 'trash') { if (st !== 'trash') return false; } else if (st === 'trash') return false;
  if (f.status && !['all', 'trash'].includes(f.status) && st !== f.status) return false;
  if (f.type && f.type !== 'all' && p.type !== f.type) return false;
  if (f.area && f.area !== 'all') {
    // f.areaIds: the chosen area and, for a main area, its sub-areas
    const ids = Array.isArray(f.areaIds) && f.areaIds.length ? f.areaIds : [f.area];
    if (f.area === NO_AREA ? !noArea(issues) : !ids.includes(p.areaKey)) return false;
  }
  if (f.readiness === 'ready' && issues.length) return false;
  if (f.readiness === 'incomplete' && !issues.length) return false;
  if (f.issue && f.issue !== 'all' && !(f.issue === 'area' ? noArea(issues) : issues.includes(f.issue))) return false;
  if (!inRange(p.price, f.priceMin, f.priceMax)) return false;
  if (!inRange(p.size, f.sizeMin, f.sizeMax)) return false;
  const q = String(f.q || '').trim().toLowerCase();
  if (q) {
    const hay = [p.title_ar, p.title_en, p.id, p.areaKey, p.locationName_ar].map((x) => String(x || '').toLowerCase());
    if (!hay.some((h) => h.includes(q))) return false;
  }
  return true;
}

const median = (nums) => {
  if (!nums.length) return 0;
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return Math.round(s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2);
};

/**
 * Report over the listings outside the trash (samples marked isDemo are left out).
 * areas: [{ id, name_ar }]; typeLabel(id) → name.
 */
export function listingReport(properties, areas = [], typeLabel = (t) => t) {
  const known = new Set(areas.map((a) => a.id));
  const live = properties.filter((p) => !p.isDemo && listingStatus(p) !== 'trash');
  const byStatus = { published: 0, hidden: 0, under_negotiation: 0, sold: 0 };
  const quality = { ready: 0, title: 0, photo: 0, price: 0, size: 0, area: 0, legacy: 0 };
  const areaRows = new Map();
  const typeRows = new Map();
  let readyHidden = 0;
  let onSiteValue = 0;

  for (const p of live) {
    const st = listingStatus(p);
    byStatus[st] += 1;
    const issues = listingIssues(p, known);
    if (!issues.length) quality.ready += 1;
    issues.forEach((k) => { quality[k] += 1; });
    if (st === 'hidden' && !issues.length) readyHidden += 1;
    if ((st === 'published' || st === 'under_negotiation') && Number(p.price) > 0) onSiteValue += Number(p.price);

    const areaId = noArea(issues) ? NO_AREA : p.areaKey;
    const ar = areaRows.get(areaId) || { id: areaId, count: 0, onSite: 0, hidden: 0, sold: 0, m2: [] };
    ar.count += 1;
    if (st === 'published' || st === 'under_negotiation') ar.onSite += 1;
    if (st === 'hidden') ar.hidden += 1;
    if (st === 'sold') ar.sold += 1;
    if (pricePerM2(p)) ar.m2.push(pricePerM2(p));
    areaRows.set(areaId, ar);

    const tr = typeRows.get(p.type || 'other') || { id: p.type || 'other', count: 0, onSite: 0, m2: [], prices: [] };
    tr.count += 1;
    if (st === 'published' || st === 'under_negotiation') tr.onSite += 1;
    if (pricePerM2(p)) tr.m2.push(pricePerM2(p));
    if (Number(p.price) > 0) tr.prices.push(Number(p.price));
    typeRows.set(tr.id, tr);
  }

  const areaName = (id) => (id === NO_AREA ? 'من غير منطقة' : areas.find((a) => a.id === id)?.name_ar || id);
  return {
    total: live.length,
    byStatus,
    quality,
    readyHidden,
    onSiteValue,
    areas: [...areaRows.values()]
      .map(({ m2, ...r }) => ({ ...r, label: areaName(r.id), medianM2: median(m2) }))
      .sort((a, b) => b.count - a.count),
    types: [...typeRows.values()]
      .map(({ m2, prices, ...r }) => ({ ...r, label: typeLabel(r.id), medianM2: median(m2), medianPrice: median(prices) }))
      .sort((a, b) => b.count - a.count)
  };
}
