// Market figures computed from the listings actually published on the site (no invented growth,
// yields or "live registry data"). Pure; tested in tests/unit/market-stats.test.mjs.

const RESIDENTIAL = new Set(['apartment', 'villa', 'duplex', 'penthouse', 'studio', 'chalet', 'townhouse', 'twinhouse', 'residential']);
const COMMERCIAL = new Set(['commercial', 'office', 'clinic', 'medical', 'administrative', 'retail', 'shop']);

export const assetClass = (p) => {
  if (p?.category === 'land' || p?.type === 'land') return 'land';
  if (RESIDENTIAL.has(p?.type) || p?.category === 'residential') return 'residential';
  if (COMMERCIAL.has(p?.type) || ['commercial', 'administrative'].includes(p?.category)) return 'commercial';
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
    minPrice: prices.length ? Math.min(...prices) : 0,
    maxPrice: prices.length ? Math.max(...prices) : 0,
  };
};

/** Per area: listing counts and median price per m² for homes and for commercial units. */
export function areaMarketStats(properties = []) {
  const byArea = new Map();
  for (const p of liveListings(properties)) {
    const key = p.areaKey || 'other';
    if (!byArea.has(key)) byArea.set(key, []);
    byArea.get(key).push(p);
  }
  return [...byArea.entries()].map(([areaId, list]) => ({
    areaId,
    total: list.length,
    residential: classStats(list.filter((p) => assetClass(p) === 'residential')),
    commercial: classStats(list.filter((p) => assetClass(p) === 'commercial')),
    land: classStats(list.filter((p) => assetClass(p) === 'land')),
  })).sort((a, b) => b.total - a.total);
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
