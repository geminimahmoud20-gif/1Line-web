// =============================================================
//  An area's price per m², from one of two sources the team picks per area in the CRM (Areas):
//   • 'auto'   — the median of the flats listed in it now (falls back to the kind with most listings
//                when it has no flats, e.g. a shopping street), sub-areas included for a main area
//   • 'manual' — the figure typed in the CRM (avgPricePerMeter)
//  Pure: tests/unit/area-pricing.test.mjs.
// =============================================================
import { pricedListings, assetClass, median, sampleKind } from './marketStats.js';
import { areaFamily } from './areaLookup.js';

export const PRICE_MODES = ['auto', 'manual'];

/** The area's chosen source; areas saved before the choice existed are priced from listings */
export const priceModeOf = (area) => (area?.priceMode === 'manual' ? 'manual' : 'auto');

/**
 * Price per m² of each kind in a set of listings: { residential: { ppm, sample }, commercial: … }
 * (only listings with a size count towards ppm).
 */
function classPrices(list) {
  const by = {};
  for (const p of list) {
    const size = Number(p.size);
    if (!(size > 0)) continue;
    const cls = assetClass(p);
    (by[cls] = by[cls] || []).push(Math.round(Number(p.price) / size));
  }
  return Object.fromEntries(Object.entries(by).map(([cls, ppm]) => [cls, { ppm: median(ppm), sample: ppm.length }]));
}

/**
 * { ppm, mode, source, cls, sample, kind, count } for one area:
 *  - source 'listings': ppm is the median of `sample` listings of kind `cls`
 *  - source 'manual':   ppm is the CRM figure
 *  - source 'none':     ppm 0 (auto with nothing listed yet, or manual with no figure)
 * `count` is how many priced listings the area (and its sub-areas) has, whatever the source.
 */
export function areaPrice(area, properties = [], areas = []) {
  const mode = priceModeOf(area);
  const ids = new Set(areaFamily(area?.id, areas));
  const list = pricedListings(properties).filter((p) => ids.has(String(p.areaKey || '')));
  const count = list.length;
  if (mode === 'manual') {
    const ppm = Math.round(Number(area?.avgPricePerMeter) || 0);
    return { ppm, mode, source: ppm > 0 ? 'manual' : 'none', cls: 'residential', sample: 0, kind: 'none', count };
  }
  const prices = classPrices(list);
  const cls = prices.residential ? 'residential'
    : Object.keys(prices).sort((a, b) => prices[b].sample - prices[a].sample)[0];
  if (!cls) return { ppm: 0, mode, source: 'none', cls: 'residential', sample: 0, kind: 'none', count };
  const { ppm, sample } = prices[cls];
  return { ppm, mode, source: 'listings', cls, sample, kind: sampleKind(sample), count };
}
