// The Kanban board's area/size/price filter popover (KanbanPipeline.jsx). Pure and testable,
// kept separate from the component's own getLeadBudget (seller asking price, else buyer budget)
// which the board already computes per card - this file takes that price in, rather than
// recomputing it, so there is one source for "what a card is worth".
import { recordInArea } from './areaLookup.js';

const num = (v) => {
  const n = typeof v === 'number' ? v : Number(String(v ?? '').replace(/[^0-9.]/g, ''));
  return Number.isFinite(n) && n > 0 ? n : 0;
};

/** The id/area fields recordInArea reads, wherever a lead happens to keep them (top-level or details) */
const areaRecordOf = (lead = {}) => {
  const d = lead.details || {};
  return {
    area: lead.area || d.area || '',
    areaKey: lead.areaKey || d.areaKey || '',
    area_ar: lead.area_ar || d.area_ar || '',
    area_en: lead.area_en || d.area_en || '',
    location: lead.location || d.location || ''
  };
};

/** The size (m²) a lead's card can be filtered on: the owner's unit, or what a buyer asked for */
export function leadSizeOf(lead = {}) {
  const d = lead.details || {};
  return num(d.size ?? lead.size ?? d.minSize ?? d.matchAnswers?.minSize);
}

export const EMPTY_KANBAN_FILTERS = { areaId: '', minSize: '', maxSize: '', minPrice: '', maxPrice: '' };

export const hasActiveKanbanFilters = (f) =>
  Boolean(f && (f.areaId || f.minSize || f.maxSize || f.minPrice || f.maxPrice));

export const activeKanbanFilterCount = (f) =>
  f ? ['areaId', 'minSize', 'maxSize', 'minPrice', 'maxPrice'].filter((k) => f[k]).length : 0;

/**
 * Does this lead pass the Kanban filter popover (area, size range, price range) - every set field
 * must match, and a lead with no recorded size/price fails a size/price filter rather than
 * slipping through unfiltered. `price` is the card's own already-unified value (getLeadBudget).
 */
export function matchesKanbanFilters(lead, filters, areas, price) {
  if (!hasActiveKanbanFilters(filters)) return true;
  const { areaId, minSize, maxSize, minPrice, maxPrice } = filters;
  if (areaId && !recordInArea(areaRecordOf(lead), areaId, areas)) return false;
  if (minSize || maxSize) {
    const size = leadSizeOf(lead);
    if (!size) return false;
    if (minSize && size < num(minSize)) return false;
    if (maxSize && size > num(maxSize)) return false;
  }
  if (minPrice || maxPrice) {
    const p = num(price);
    if (!p) return false;
    if (minPrice && p < num(minPrice)) return false;
    if (maxPrice && p > num(maxPrice)) return false;
  }
  return true;
}
