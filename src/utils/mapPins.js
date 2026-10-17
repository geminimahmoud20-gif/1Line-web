// What the properties map draws, decided without Leaflet (unit-tested):
//   • a listing whose spot was set on the map in the CRM (locationExact) gets its own price pin
//   • every other listing is counted in one bubble per area ("42 وحدة · من 900 ألف") at the area's
//     centre, because its coordinates (if any) were only the area centre plus a random nudge
//   • listings with no known area are counted so the page can say they are not on the map

/** "1.8 مليون" / "850 ألف" / "اسأل عن السعر" */
export function pinPriceLabel(price, isAr = true) {
  const n = Number(price) || 0;
  if (n >= 1_000_000) {
    const m = Math.round((n / 1_000_000) * 10) / 10;
    return isAr ? `${m} مليون` : `${m}M`;
  }
  if (n >= 1000) {
    const k = Math.round(n / 1000);
    return isAr ? `${k} ألف` : `${k}K`;
  }
  return isAr ? 'اسأل عن السعر' : 'Ask for price';
}

const validCoords = (c) => c && Number.isFinite(Number(c.lat)) && Number.isFinite(Number(c.lng))
  && Math.abs(Number(c.lat)) <= 90 && Math.abs(Number(c.lng)) <= 180 && !(Number(c.lat) === 0 && Number(c.lng) === 0);

/** 'exact' (set on the map), 'area' (only its area is known) or 'none' */
export function locationQuality(p) {
  if (p?.locationExact === true && validCoords(p.coordinates)) return 'exact';
  return p?.areaKey ? 'area' : 'none';
}

/**
 * Splits listings for the map.
 * centerOf(areaKey) → { lat, lng } | null.
 * Returns { pins: [listing], bubbles: [{ areaKey, lat, lng, count, minPrice }], unplaced: number }.
 */
export function mapLayout(list = [], centerOf = () => null) {
  const pins = [];
  const groups = new Map();
  let unplaced = 0;
  for (const p of list) {
    const q = locationQuality(p);
    if (q === 'exact') { pins.push(p); continue; }
    const c = q === 'area' ? centerOf(p.areaKey) : null;
    if (!c || !validCoords(c)) { unplaced += 1; continue; }
    const g = groups.get(p.areaKey) || { areaKey: p.areaKey, lat: Number(c.lat), lng: Number(c.lng), count: 0, minPrice: 0 };
    g.count += 1;
    const price = Number(p.price) || 0;
    if (price > 0 && (g.minPrice === 0 || price < g.minPrice)) g.minPrice = price;
    groups.set(p.areaKey, g);
  }
  return { pins, bubbles: [...groups.values()].sort((a, b) => b.count - a.count), unplaced };
}

/** Is a listing inside the map view? bounds = { south, west, north, east }. Area-only listings use their area centre. */
export function inBounds(p, bounds, centerOf = () => null) {
  if (!bounds) return true;
  const c = locationQuality(p) === 'exact' ? p.coordinates : (p?.areaKey ? centerOf(p.areaKey) : null);
  if (!c || !validCoords(c)) return false;
  const lat = Number(c.lat);
  const lng = Number(c.lng);
  return lat >= bounds.south && lat <= bounds.north && lng >= bounds.west && lng <= bounds.east;
}

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
/** Text placed inside the Leaflet popup / pin HTML */
export const escapeHtml = (s) => String(s ?? '').replace(/[&<>"']/g, (ch) => ESCAPES[ch]);
