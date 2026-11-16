// =============================================================
//  Supply against demand: what active buyers ask for (kind, area, budget) next to what the team
//  holds, the shortfalls ranked, and a per-area read-out. Pure functions (tests/unit/demand-gap.test.mjs).
// =============================================================
import { TYPE_GROUPS, PRICE_BANDS, bandLabel, supplyGapReport } from './supplyGap.js';
import { isBuyerLead, parseMoney } from './crmLeadViews.js';
import { mainAreaOf } from './areaLookup.js';

// «رشح لي عقاري» kinds and market classes → the matrix columns
const KIND_TO_GROUP = {
  residential: 'apartment', apartment: 'apartment', villa: 'villa', building: 'building',
  commercial: 'commercial', administrative: 'office', office: 'office', land: 'land',
  agricultural: 'agri', agri_land: 'agri', farm: 'agri', industrial: 'industrial',
  factory: 'industrial', warehouse: 'industrial', industrial_land: 'industrial'
};

const bandIndex = (cuts, millions) => {
  let i = cuts.length - 1;
  while (i > 0 && millions < cuts[i]) i -= 1;
  return i;
};

/**
 * The buyers still in play, each reduced to what the report needs.
 * area: main-area ids they named (empty = any area); budget: total price in EGP, 0 when unknown.
 */
export function buyerDemand(leads = [], areas = []) {
  const known = new Set(areas.map((a) => a.id));
  const mainOf = (id) => (known.has(id) ? mainAreaOf(id, areas)?.id || '' : '');
  const out = [];
  for (const l of leads) {
    if (!l || l.isArchived || ['closed', 'lost', 'inactive'].includes(l.status)) continue;
    if (!isBuyerLead(l)) continue;
    const d = l.details || {};
    const m = d.matchAnswers && typeof d.matchAnswers === 'object' ? d.matchAnswers : null;
    const rawKind = m?.kind || d.propertyType || l.propertyType || '';
    const group = KIND_TO_GROUP[rawKind] || '';
    let ids;
    let budget;
    if (m) {
      ids = m.anyArea ? [] : (Array.isArray(m.areas) ? m.areas : []);
      budget = m.payment === 'cash' ? parseMoney(m.budget) : 0;
    } else {
      const a = d.area || l.area || '';
      ids = a && a !== 'all' ? [a] : [];
      budget = parseMoney(d.budget) || parseMoney(d.expectedPrice) || parseMoney(l.budget);
    }
    const mains = [...new Set(ids.map(mainOf).filter(Boolean))];
    out.push({ id: l.id, group, areas: mains, budget });
  }
  return out;
}

/**
 * Shortfalls and per-area read-out.
 * @returns {{ buyers: {total, classified}, kinds, priorities, areas }}
 */
export function demandGapReport(properties, leads, areas = []) {
  const supply = supplyGapReport(properties, areas, 'live');
  const buyers = buyerDemand(leads, areas);
  const classified = buyers.filter((b) => b.group);

  const supplyCell = new Map(supply.areas.map((a) => [a.id, a.cells]));
  const demandCell = new Map();
  const demandArea = new Map();
  for (const b of classified) {
    for (const aid of b.areas) {
      const row = demandCell.get(aid) || {};
      row[b.group] = (row[b.group] || 0) + 1;
      demandCell.set(aid, row);
    }
  }
  for (const b of buyers) for (const aid of b.areas) demandArea.set(aid, (demandArea.get(aid) || 0) + 1);

  const kinds = TYPE_GROUPS.map((g) => {
    const demand = classified.filter((b) => b.group === g.id).length;
    const have = supply.colTotals[g.id];
    return { id: g.id, ar: g.ar, en: g.en, demand, supply: have, gap: demand - have };
  });

  const priorities = [];
  for (const [aid, row] of demandCell) {
    for (const g of TYPE_GROUPS) {
      const d = row[g.id] || 0;
      const s = supplyCell.get(aid)?.[g.id] || 0;
      if (d > s) priorities.push({ kind: 'area', areaId: aid, group: g.id, demand: d, supply: s, shortfall: d - s });
    }
  }
  for (const g of TYPE_GROUPS) {
    const cuts = PRICE_BANDS[g.id];
    const wants = cuts.map(() => 0);
    for (const b of classified) if (b.group === g.id && b.budget > 0) wants[bandIndex(cuts, b.budget / 1e6)] += 1;
    const haves = supply.bands.find((x) => x.id === g.id).bands.map((x) => x.count);
    wants.forEach((d, i) => {
      if (d > haves[i]) priorities.push({ kind: 'price', group: g.id, cuts, index: i, demand: d, supply: haves[i], shortfall: d - haves[i] });
    });
  }
  priorities.sort((a, b) => b.shortfall - a.shortfall || b.demand - a.demand);

  const areaCards = supply.areas.filter((a) => a.id !== '__none').map((a) => {
    const covered = TYPE_GROUPS.filter((g) => a.cells[g.id] > 0);
    const dRow = demandCell.get(a.id) || {};
    const top = TYPE_GROUPS
      .map((g) => ({ id: g.id, shortfall: (dRow[g.id] || 0) - a.cells[g.id], demand: dRow[g.id] || 0 }))
      .filter((x) => x.shortfall > 0)
      .sort((x, y) => y.shortfall - x.shortfall)[0] || null;
    return {
      id: a.id,
      name: a.name,
      status: a.status,
      supply: a.total,
      covered: covered.map((g) => g.id),
      missing: TYPE_GROUPS.filter((g) => a.cells[g.id] === 0).map((g) => g.id),
      demand: demandArea.get(a.id) || 0,
      topNeed: top
    };
  });

  return { buyers: { total: buyers.length, classified: classified.length }, kinds, priorities, areas: areaCards, supply };
}

export { bandLabel };
