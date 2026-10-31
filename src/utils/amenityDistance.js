// =============================================================
//  Nearby landmarks: walk / drive times worked out from the distance typed in the CRM
//  («300 متر», «1.5 كم», «٧٥٠م»). The CRM used to save the same «6 دقائق مشي · 2 دقيقة بالسيارة»
//  on every landmark (the add button's defaults), so stored times are not trusted when there is
//  a distance. Pure (tests/unit/amenity-distance.test.mjs).
// =============================================================

const WALK_M_PER_MIN = 80;   // about 5 km/h
const DRIVE_M_PER_MIN = 400; // about 24 km/h inside town, with stops

const latinDigits = (s) => String(s ?? '')
  .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
  .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06F0))
  .replace(/٫/g, '.').replace(/,/g, '.');

/** Metres from «300 متر», «1.5 كم», «750م», «2km»; null when there is no number */
export function distanceMeters(text) {
  const t = latinDigits(text).trim().toLowerCase();
  const m = /(\d+(?:\.\d+)?)/.exec(t);
  if (!m) return null;
  const n = Number(m[1]);
  if (!Number.isFinite(n) || n < 0) return null;
  const isKm = /(كم|كيلو|km)/.test(t);
  return Math.round(isKm ? n * 1000 : n);
}

/** «دقيقة» / «دقيقتين» / «3 دقائق» / «12 دقيقة» */
export const minutesAr = (n) => (n <= 1 ? 'دقيقة' : n === 2 ? 'دقيقتين' : n <= 10 ? `${n} دقائق` : `${n} دقيقة`);

/** «70 متر» / «1.2 كم»; under 30 m reads as «على بعد خطوات» */
export function distanceLabel(meters, isAr = true) {
  if (meters == null) return '';
  if (meters < 30) return isAr ? 'على بعد خطوات' : 'A few steps away';
  if (meters < 1000) return isAr ? `${meters} متر` : `${meters} m`;
  const km = Math.round(meters / 100) / 10;
  return isAr ? `${km} كم` : `${km} km`;
}

/**
 * What to show for one landmark: { distance, walk, drive }. Walking under 2 km, driving from
 * 500 m; nothing for a few steps. Without a usable distance, the stored text is shown as is.
 */
export function amenityMetrics(item, isAr = true) {
  const meters = distanceMeters(item?.distance);
  if (meters == null) {
    return { distance: String(item?.distance || ''), walk: '', drive: '' };
  }
  const walkMin = Math.max(1, Math.ceil(meters / WALK_M_PER_MIN));
  const driveMin = Math.max(1, Math.ceil(meters / DRIVE_M_PER_MIN) + 1); // +1: getting going and parking
  const fmt = (n) => (isAr ? minutesAr(n) : `${n} min`);
  return {
    distance: distanceLabel(meters, isAr),
    walk: meters >= 30 && meters <= 2000 ? fmt(walkMin) : '',
    drive: meters >= 500 ? fmt(driveMin) : ''
  };
}

/** Landmarks worth showing: they need a name */
export const namedAmenities = (list = []) => (Array.isArray(list) ? list : [])
  .filter((a) => a && String(a.name_ar || a.name_en || '').trim());
