// =============================================================
//  A project's price figures for the CRM and the site: the average price per m² of the listings
//  linked to it (listing.projectId), else the figure the team typed (project.avgPricePerMeter,
//  e.g. the developer's official price). Pure: tests/unit/project-stats.test.mjs.
// =============================================================

const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : 0;
};

const onSale = (p) => p && !p.isDeleted && !p.deleted && !['trash', 'hidden', 'draft', 'sold'].includes(p.status)
  && !['pending', 'rejected'].includes(p.approval);

/**
 * { avgPricePerMeter, source: 'units' | 'manual' | '', units, minPrice, maxPrice }
 * Listings without a size don't count toward the average (a price alone says nothing per m²).
 */
export function projectPriceStats(project, properties = []) {
  const units = (Array.isArray(properties) ? properties : []).filter((p) => onSale(p) && project?.id && String(p.projectId) === String(project.id));
  const priced = units.filter((p) => num(p.price) && num(p.size));
  const prices = units.map((p) => num(p.price)).filter(Boolean);
  const fromUnits = priced.length
    ? Math.round(priced.reduce((s, p) => s + num(p.price) / num(p.size), 0) / priced.length / 50) * 50
    : 0;
  const manual = num(project?.avgPricePerMeter);
  return {
    avgPricePerMeter: fromUnits || manual,
    source: fromUnits ? 'units' : (manual ? 'manual' : ''),
    units: units.length,
    minPrice: prices.length ? Math.min(...prices) : 0,
    maxPrice: prices.length ? Math.max(...prices) : 0
  };
}
