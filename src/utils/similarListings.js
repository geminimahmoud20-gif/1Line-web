// "Similar units" on a listing page: the same kind of property at a comparable price, ranked by
// area, price, size and rooms. A villa or a plot of land is never offered next to an apartment just
// because it sits in the same area, and when nothing fits the section stays empty.
// Pure, unit-tested in tests/unit/similar-listings.test.mjs.
import { categoryOfType } from './propertyKinds.js';

const PRICE_BAND = 0.4; // ±40% of the listing's price
const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : 0;
};
const closeness = (a, b, band) => (a && b ? Math.max(0, 1 - Math.abs(a - b) / (a * band)) : 0);
const isPublic = (p) => p && !p.isDeleted && !['trash', 'hidden', 'draft', 'sold'].includes(p.status);

export function similarListings(property, list = [], limit = 3) {
  if (!property) return [];
  const price = num(property.price);
  const size = num(property.size);
  const category = categoryOfType(property.type);
  return list
    .filter((p) => isPublic(p) && p.id !== property.id)
    // Sample listings only keep each other company
    .filter((p) => Boolean(p.isDemo) === Boolean(property.isDemo))
    .filter((p) => p.type === property.type || (categoryOfType(p.type) === category && category !== 'residential'))
    .filter((p) => !price || !num(p.price) || Math.abs(num(p.price) - price) <= price * PRICE_BAND)
    .map((p) => ({
      p,
      score:
        (p.type === property.type ? 3 : 0)
        + (property.areaKey && p.areaKey === property.areaKey ? 3 : 0)
        + 2 * closeness(price, num(p.price), PRICE_BAND)
        + closeness(size, num(p.size), 0.5)
        + (num(property.bedrooms) && num(p.bedrooms) === num(property.bedrooms) ? 1 : 0)
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.p);
}
