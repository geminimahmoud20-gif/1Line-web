// Areas are the list the admin keeps in CRM → المناطق (settings/areas_cms). Older code carried its
// own fixed list (east, kawthar, center…), defaulted forms to an area nobody picked, and showed a
// different area's data when an id was unknown. These helpers only ever answer from the live list
// and say "unknown" ('' / null) instead of guessing. Pure; unit-tested in tests/unit/area-lookup.test.mjs.

const text = (v) => String(v ?? '').trim();

/** Arabic spelling variants folded together: أ/إ/آ → ا, ة → ه, ى → ي, no tatweel or diacritics */
export const foldAr = (s) => text(s)
  .toLowerCase()
  .replace(/[ً-ْـ]/g, '')
  .replace(/[أإآ]/g, 'ا')
  .replace(/ة/g, 'ه')
  .replace(/ى/g, 'ي')
  .replace(/\s+/g, ' ');

/** Real places only: without the "كل المناطق" choice */
export const placeAreas = (areas) => (Array.isArray(areas) ? areas : []).filter((a) => a && a.id && a.id !== 'all');

/** The area with this id, or null (never another area in its place) */
export const findArea = (id, areas) => {
  const key = text(id);
  return key ? (Array.isArray(areas) ? areas : []).find((a) => a && a.id === key) || null : null;
};

export const isKnownArea = (id, areas) => Boolean(findArea(id, placeAreas(areas)));

/** Display name of an area id, or '' when the id is empty or no longer in the list */
export const areaNameOf = (id, areas, isAr = true) => {
  const a = findArea(id, areas);
  if (!a) return '';
  return text(isAr ? (a.name_ar || a.label_ar) : (a.name_en || a.label_en || a.name_ar));
};

/** The value a form should hold: the saved id when it is still a real area, else '' (nothing picked) */
export const formArea = (id, areas, { allowAll = false } = {}) => {
  const key = text(id);
  if (allowAll && key === 'all') return 'all';
  return isKnownArea(key, areas) ? key : '';
};

/**
 * Words that identify an area inside free text: its full name and each part in brackets or
 * between slashes ("سوهاج (الشبان / الهلال)" → "الشبان", "الهلال"). Folded; 3+ letters only,
 * and the bare city name is never enough on its own.
 */
export function areaWords(area) {
  const out = new Set();
  for (const raw of [area?.name_ar, area?.name_en, area?.label_ar]) {
    const name = foldAr(raw);
    if (!name) continue;
    out.add(name);
    for (const part of name.split(/[()/،,\-–]+/)) {
      const p = part.replace(/^(ش|شارع|حي)\s+/, '').trim();
      if (p.length >= 3 && !['سوهاج', 'sohag'].includes(p)) out.add(p);
    }
  }
  return [...out];
}

/** The live area free text talks about (longest match wins), or '' */
export function areaFromText(value, areas) {
  const t = foldAr(value);
  if (!t) return '';
  let best = '';
  let bestLen = 0;
  for (const a of placeAreas(areas)) {
    for (const w of areaWords(a)) {
      if (w.length > bestLen && t.includes(w)) { best = a.id; bestLen = w.length; }
    }
  }
  return best;
}

/** Does a record (a lead, a request) belong to this area: by its id, or by its area text */
export function recordInArea(record, areaId, areas) {
  if (!areaId || areaId === 'all') return true;
  if (!record) return false;
  if (record.area === areaId || record.areaKey === areaId) return true;
  const area = findArea(areaId, areas);
  if (!area) return false;
  const t = foldAr([record.area_ar, record.area_en, record.location].filter(Boolean).join(' '));
  return Boolean(t) && areaWords(area).some((w) => t.includes(w));
}
