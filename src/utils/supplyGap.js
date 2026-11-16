// =============================================================
//  Supply gaps: which area x type combinations the team has no listings in, and which price bands
//  are empty for each type. Pure functions (tests/unit/supply-gap.test.mjs).
// =============================================================
import { listingStatus, NO_AREA } from './listingReview.js';
import { blockedByApproval } from './publishApproval.js';
import { mainAreas, mainAreaOf } from './areaLookup.js';

/** The columns of the matrix: the 12 listing types grouped into 8 readable kinds */
export const TYPE_GROUPS = [
  { id: 'apartment', ar: 'شقق', en: 'Apartments', types: ['apartment'] },
  { id: 'villa', ar: 'فيلات', en: 'Villas', types: ['villa'] },
  { id: 'building', ar: 'عمارات', en: 'Buildings', types: ['building'] },
  { id: 'commercial', ar: 'محلات', en: 'Shops', types: ['commercial'] },
  { id: 'office', ar: 'مكاتب وعيادات', en: 'Offices', types: ['office'] },
  { id: 'land', ar: 'أراضي', en: 'Land', types: ['land'] },
  { id: 'agri', ar: 'زراعي ومزارع', en: 'Farmland', types: ['agri_land', 'farm'] },
  { id: 'industrial', ar: 'صناعي ومخازن', en: 'Industrial', types: ['factory', 'warehouse', 'industrial_land'] }
];

// Price bands per kind, in millions of EGP: [from, to). The last band is open at the top.
// A starting point for the report, easy to tune here.
export const PRICE_BANDS = {
  apartment: [0, 1, 2, 3.5, 5],
  villa: [0, 3, 5, 8, 12],
  building: [0, 5, 10, 20, 40],
  commercial: [0, 2, 5, 10, 20],
  office: [0, 1.5, 3, 6, 12],
  land: [0, 1, 3, 8, 20],
  agri: [0, 2, 5, 10, 25],
  industrial: [0, 3, 8, 20, 50]
};

export const bandLabel = (cuts, i, isAr = true) => {
  const f = (n) => String(n).replace(/\.0$/, '');
  if (i === 0) return isAr ? `أقل من ${f(cuts[1])} مليون` : `Under ${f(cuts[1])}M`;
  if (i === cuts.length - 1) return isAr ? `${f(cuts[i])} مليون فأكتر` : `${f(cuts[i])}M+`;
  return isAr ? `${f(cuts[i])} – ${f(cuts[i + 1])} مليون` : `${f(cuts[i])} – ${f(cuts[i + 1])}M`;
};

const median = (list) => {
  if (!list.length) return 0;
  const s = [...list].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
};

const groupOf = (type) => TYPE_GROUPS.find((g) => g.types.includes(type))?.id || null;

/** 0 = nothing, 1 = thin, 2+ = covered */
export const cellLevel = (n) => (n <= 0 ? 'gap' : n === 1 ? 'thin' : 'ok');

/**
 * basis 'live': what a buyer can see now (on the site or being negotiated);
 * basis 'all': everything the team holds that is not sold (adds the review queue).
 */
export function supplyGapReport(properties, areas = [], basis = 'live') {
  const mains = mainAreas(areas);
  const known = new Set(areas.map((a) => a.id));
  const counts = (basis === 'all')
    ? (st) => st !== 'sold'
    : (st) => st === 'published' || st === 'under_negotiation';

  const rows = new Map(mains.map((m) => [m.id, { id: m.id, name: m.name_ar || m.id, cells: Object.fromEntries(TYPE_GROUPS.map((g) => [g.id, 0])), total: 0 }]));
  const noArea = { id: NO_AREA, name: 'من غير منطقة', cells: Object.fromEntries(TYPE_GROUPS.map((g) => [g.id, 0])), total: 0 };
  const colTotals = Object.fromEntries(TYPE_GROUPS.map((g) => [g.id, 0]));
  const prices = Object.fromEntries(TYPE_GROUPS.map((g) => [g.id, []]));
  const noPrice = Object.fromEntries(TYPE_GROUPS.map((g) => [g.id, 0]));
  let other = 0;

  for (const p of properties) {
    if (p.isDemo) continue;
    const st = blockedByApproval(p) ? 'approval' : listingStatus(p);
    if (st === 'trash' || !counts(st)) continue;
    const g = groupOf(p.type);
    if (!g) { other += 1; continue; }
    const main = known.has(p.areaKey) ? mainAreaOf(p.areaKey, areas)?.id : null;
    const row = (main && rows.get(main)) || noArea;
    row.cells[g] += 1;
    row.total += 1;
    colTotals[g] += 1;
    const price = Number(p.price);
    if (price > 0) prices[g].push(price); else noPrice[g] += 1;
  }

  const list = [...rows.values()];
  if (noArea.total) list.push(noArea);
  const real = list.filter((r) => r.id !== NO_AREA);
  const rowStatus = (r) => {
    if (r.total === 0) return 'empty';
    const kinds = TYPE_GROUPS.filter((g) => r.cells[g.id] > 0).length;
    return kinds <= 1 || r.total <= 2 ? 'weak' : 'ok';
  };
  const areaRows = list.map((r) => ({ ...r, status: r.id === NO_AREA ? 'unplaced' : rowStatus(r) }));

  const gapCells = real.reduce((s, r) => s + TYPE_GROUPS.filter((g) => r.cells[g.id] === 0).length, 0);
  const bands = TYPE_GROUPS.map((g) => {
    const cuts = PRICE_BANDS[g.id];
    const per = cuts.map(() => 0);
    for (const v of prices[g.id]) {
      const m = v / 1e6;
      let i = cuts.length - 1;
      while (i > 0 && m < cuts[i]) i -= 1;
      per[i] += 1;
    }
    return {
      id: g.id,
      total: colTotals[g.id],
      noPrice: noPrice[g.id],
      median: median(prices[g.id]),
      bands: per.map((count, i) => ({ cuts, index: i, count }))
    };
  });

  return {
    basis,
    groups: TYPE_GROUPS,
    areas: areaRows,
    colTotals,
    other,
    summary: {
      areaCount: real.length,
      cells: real.length * TYPE_GROUPS.length,
      gapCells,
      emptyAreas: areaRows.filter((r) => r.status === 'empty').map((r) => r.name),
      weakAreas: areaRows.filter((r) => r.status === 'weak').map((r) => r.name),
      missingTypes: TYPE_GROUPS.filter((g) => colTotals[g.id] === 0).map((g) => g.id)
    },
    bands
  };
}
