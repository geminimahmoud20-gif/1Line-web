// Market figures computed from the listings actually published on the site (no invented growth,
// yields or "live registry data"). Pure; tested in tests/unit/market-stats.test.mjs.

const RESIDENTIAL = new Set(['apartment', 'villa', 'duplex', 'penthouse', 'studio', 'chalet', 'townhouse', 'twinhouse', 'residential']);
// Shops and showrooms are priced very differently from offices and clinics, so they are two classes
const COMMERCIAL = new Set(['commercial', 'retail', 'shop', 'showroom']);
const ADMINISTRATIVE = new Set(['office', 'clinic', 'medical', 'administrative']);
const AGRICULTURAL = new Set(['agri_land', 'farm']);
const INDUSTRIAL = new Set(['factory', 'warehouse', 'industrial_land']);

/** The market a listing is priced in: each one gets its own medians and ranges */
export const ASSET_CLASSES = ['residential', 'commercial', 'administrative', 'land', 'building', 'agricultural', 'industrial'];

export const assetClass = (p) => {
  const type = p?.type;
  const category = p?.category;
  if (AGRICULTURAL.has(type) || category === 'agricultural') return 'agricultural';
  if (INDUSTRIAL.has(type) || category === 'industrial') return 'industrial';
  if (category === 'land' || type === 'land') return 'land';
  if (type === 'building' || category === 'building') return 'building';
  if (ADMINISTRATIVE.has(type) || category === 'administrative') return 'administrative';
  if (COMMERCIAL.has(type) || category === 'commercial') return 'commercial';
  if (RESIDENTIAL.has(type) || category === 'residential') return 'residential';
  return 'other';
};

/** Published, real (non-sample, not deleted) listings with a price. */
export const liveListings = (properties = []) => properties.filter((p) => p
  && !p.isDemo && !p.isDeleted
  && (p.status || 'published') === 'published'
  && Number(p.price) > 0);

export const median = (nums) => {
  if (!nums.length) return 0;
  const s = [...nums].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
};

const classStats = (list) => {
  const ppm = list.filter((p) => Number(p.size) > 0).map((p) => Math.round(Number(p.price) / Number(p.size)));
  const prices = list.map((p) => Number(p.price));
  return {
    count: list.length,
    medianPpm: median(ppm),
    ppmSample: ppm.length,
    minPpm: ppm.length ? Math.min(...ppm) : 0,
    maxPpm: ppm.length ? Math.max(...ppm) : 0,
    minPrice: prices.length ? Math.min(...prices) : 0,
    maxPrice: prices.length ? Math.max(...prices) : 0,
  };
};

/**
 * How much a price-per-m² figure can be trusted: 'median' (3+ listings), 'pair' (the average of
 * two) or 'single' (one listing's own price). Shown so one listing isn't read as a district price.
 */
export const sampleKind = (n) => (n >= 3 ? 'median' : n === 2 ? 'pair' : n === 1 ? 'single' : 'none');

/**
 * Per area: listing counts, and for each asset class present its own median price per m², price per
 * m² range and unit price range (homes, shops, offices, land… never mixed in one range).
 * `classes` lists the classes the area has, in ASSET_CLASSES order.
 */
export function areaMarketStats(properties = []) {
  const byArea = new Map();
  for (const p of liveListings(properties)) {
    const key = p.areaKey || 'other';
    if (!byArea.has(key)) byArea.set(key, []);
    byArea.get(key).push(p);
  }
  return [...byArea.entries()].map(([areaId, list]) => {
    const row = { areaId, total: list.length };
    for (const cls of ASSET_CLASSES) row[cls] = classStats(list.filter((p) => assetClass(p) === cls));
    row.classes = ASSET_CLASSES.filter((cls) => row[cls].count > 0);
    return row;
  }).sort((a, b) => b.total - a.total);
}

/** What a budget can buy right now: matching listings per area and asset class. */
export function budgetMatches(properties = [], budget = 0) {
  const within = liveListings(properties).filter((p) => Number(p.price) <= budget);
  const byArea = {};
  const byClass = {};
  for (const p of within) {
    byArea[p.areaKey || 'other'] = (byArea[p.areaKey || 'other'] || 0) + 1;
    byClass[assetClass(p)] = (byClass[assetClass(p)] || 0) + 1;
  }
  return {
    count: within.length,
    areas: Object.entries(byArea).sort((a, b) => b[1] - a[1]),
    classes: byClass,
  };
}
