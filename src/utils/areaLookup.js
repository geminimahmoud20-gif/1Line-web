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
  // A main area covers its sub-areas (areaFamily is defined below; hoisted)
  const family = areaFamily(areaId, areas);
  if (family.includes(record.area) || family.includes(record.areaKey)) return true;
  const t = foldAr([record.area_ar, record.area_en, record.location].filter(Boolean).join(' '));
  if (!t) return false;
  return family.some((id) => {
    const area = findArea(id, areas);
    return area && areaWords(area).some((w) => t.includes(w));
  });
}

// ---------------------------------------------------------------------------------------------
// Main areas and sub-areas. An area with a `parentId` naming another (main) area is a sub-area;
// every other area is a main area. One level only: a parent that itself has a parent is ignored.
// Listings keep storing a single area id (main or sub), so moving a sub-area to another main
// area never touches a listing. A filter on a main area covers its sub-areas too.
// ---------------------------------------------------------------------------------------------

const parentIdOf = (area, areas) => {
  const pid = text(area?.parentId);
  if (!pid || pid === area?.id || pid === 'all') return '';
  const parent = findArea(pid, areas);
  return parent && !text(parent.parentId) ? pid : '';
};

export const isMainArea = (area, areas) => Boolean(area) && area.id !== 'all' && !parentIdOf(area, areas);

/** Main areas in list order */
export const mainAreas = (areas) => placeAreas(areas).filter((a) => isMainArea(a, areas));

/** Sub-areas of a main area, in list order */
export const childrenOf = (id, areas) => placeAreas(areas).filter((a) => parentIdOf(a, areas) === id);

/** The main area a (sub-)area belongs to; a main area is its own */
export const mainAreaOf = (id, areas) => {
  const a = findArea(id, areas);
  if (!a) return null;
  const pid = parentIdOf(a, areas);
  return pid ? findArea(pid, areas) : a;
};

/** Ids a filter on this area covers: itself, plus its sub-areas when it is a main area */
export const areaFamily = (id, areas) => {
  const key = text(id);
  if (!key) return [];
  return [key, ...childrenOf(key, areas).map((a) => a.id)];
};

/** Does a stored area id fall under the chosen filter (same area, or a sub-area of a chosen main area) */
export const inArea = (storedId, filterId, areas) =>
  !filterId || filterId === 'all' || areaFamily(filterId, areas).includes(text(storedId));

/**
 * Name of a sub-area without its main area repeated: «سوهاج (ش الجمهورية)» under «سوهاج غرب»
 * reads «ش الجمهورية». Main areas keep their full name.
 */
export const shortAreaName = (area, areas, isAr = true) => {
  if (!area) return '';
  const name = text(isAr ? (area.name_ar || area.label_ar) : (area.name_en || area.label_en || area.name_ar));
  if (!parentIdOf(area, areas)) return name;
  const m = name.match(/^(?:سوهاج|سوهاح|sohag)\s*(?:شرق|غرب|east|west)?\s*\((.+)\)\s*$/i);
  return m ? m[1].trim() : name;
};

/** «سوهاج غرب · ش الجمهورية» for a sub-area, the plain name for a main area, '' when unknown */
export const areaPathName = (id, areas, isAr = true) => {
  const a = findArea(id, areas);
  if (!a) return '';
  const pid = parentIdOf(a, areas);
  if (!pid) return shortAreaName(a, areas, isAr);
  return `${shortAreaName(findArea(pid, areas), areas, isAr)} · ${shortAreaName(a, areas, isAr)}`;
};

/** Main areas each with their sub-areas, for grouped menus and the CRM screen */
export const groupedAreas = (areas) => mainAreas(areas).map((main) => ({ main, children: childrenOf(main.id, areas) }));

/** The arrangement agreed for Sohag (Oct 2026): three city parts and the four centres as main areas */
export const SUGGESTED_MAIN_AREAS = [
  { id: 'new_sohag', name_ar: 'سوهاج الجديدة', name_en: 'New Sohag' },
  { id: 'sohag_west', name_ar: 'سوهاج غرب', name_en: 'West Sohag' },
  { id: 'sohag_east', name_ar: 'سوهاج شرق', name_en: 'East Sohag' },
  { id: 'center_akhmeem', name_ar: 'أخميم', name_en: 'Akhmim' },
  { id: 'center_tahta', name_ar: 'طهطا', name_en: 'Tahta' },
  { id: 'center_girga', name_ar: 'جرجا', name_en: 'Girga' },
  { id: 'center_menshaa', name_ar: 'المنشاة', name_en: 'El Menshaa' }
];

/**
 * Apply the suggested arrangement to a saved list: add the missing main areas, place every
 * «سوهاج شرق …» area under East and every «سوهاج (…)» area under West, and fix the «سوهاح»
 * typo. Areas the rules don't recognise, and anything already placed, are left as they are.
 * Returns { list, added, placed } so the CRM can say what changed before saving.
 */
export function suggestedArrangement(areas) {
  const list = (Array.isArray(areas) ? areas : []).map((a) => ({ ...a }));
  const added = [];
  const placed = [];
  // suggested id → the id it has in this list (an existing «سوهاج شرق» keeps its own id)
  const resolved = {};
  for (const main of SUGGESTED_MAIN_AREAS) {
    const existing = list.find((a) => a.id === main.id)
      || list.find((a) => a.id !== 'all' && foldAr(a.name_ar) === foldAr(main.name_ar));
    if (existing) {
      existing.parentId = '';
      resolved[main.id] = existing.id;
      continue;
    }
    list.push({ ...main, label_ar: main.name_ar, label_en: main.name_en, parentId: '', amenities: [] });
    resolved[main.id] = main.id;
    added.push(main.name_ar);
  }
  const mainIds = new Set(Object.values(resolved));
  for (const a of list) {
    if (!a || a.id === 'all' || mainIds.has(a.id) || text(a.parentId)) continue;
    for (const k of ['name_ar', 'label_ar']) {
      if (typeof a[k] === 'string') a[k] = a[k].replace(/سوهاح/g, 'سوهاج');
    }
    const n = foldAr(a.name_ar);
    let parent = '';
    if (/^سوهاج\s*شرق/.test(n) || /^شرق\s*سوهاج/.test(n)) parent = resolved.sohag_east;
    else if (/^سوهاج\s*غرب/.test(n) || /^غرب\s*سوهاج/.test(n) || /^سوهاج\s*\(/.test(n)) parent = resolved.sohag_west;
    if (parent) {
      a.parentId = parent;
      placed.push(a.name_ar);
    }
  }
  return { list, added, placed };
}
