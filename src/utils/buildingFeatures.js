// Building facts a buyer asks about first: elevator, garage, garden, land share.
// Stored on the listing as `building: { elevator, garage, garden, gardenSize, landShare, landShareNote }`;
// an empty value means "not recorded" and is never shown. Older listings are read from the
// free-text utilities, the legal review and the features list they already carry.
// Pure helpers, unit-tested in tests/unit/building-features.test.mjs.

import { isLandType, isAgriculturalType, isIndustrialType } from './propertyKinds.js';

export const BUILDING_FIELDS = [
  {
    key: 'elevator', ar: 'الأسانسير', en: 'Elevator',
    options: [
      { v: 'yes', ar: 'فيه أسانسير', en: 'Yes' },
      { v: 'no', ar: 'مفيش أسانسير', en: 'No' }
    ]
  },
  {
    key: 'garage', ar: 'الجراج', en: 'Garage',
    options: [
      { v: 'private', ar: 'جراج خاص بالوحدة', en: 'Private garage' },
      { v: 'shared', ar: 'جراج مشترك للعمارة', en: 'Shared garage' },
      { v: 'street', ar: 'ركن في الشارع', en: 'Street parking' },
      { v: 'no', ar: 'مفيش جراج', en: 'No garage' }
    ]
  },
  {
    key: 'garden', ar: 'الحديقة', en: 'Garden',
    options: [
      { v: 'private', ar: 'حديقة خاصة', en: 'Private garden' },
      { v: 'shared', ar: 'حديقة مشتركة', en: 'Shared garden' },
      { v: 'no', ar: 'مفيش حديقة', en: 'No garden' }
    ]
  },
  {
    key: 'landShare', ar: 'حصة الأرض', en: 'Land share',
    options: [
      { v: 'yes', ar: 'فيه حصة في الأرض', en: 'Includes a land share' },
      { v: 'no', ar: 'مفيش حصة في الأرض', en: 'No land share' }
    ]
  }
];

const clean = (v) => String(v ?? '').trim();
const optionOf = (field, v) => field.options.find((o) => o.v === v) || null;
// The listing's own wording of a feature ("حديقة خلفية 60م"), or '' when it has none
const featureText = (p, words) => clean((Array.isArray(p?.features_ar) ? p.features_ar : []).find((f) => words.some((w) => String(f).includes(w))));
const NONE = /^(لا|مفيش|لا يوجد|none|no)$/i;
// A note that only says "yes" adds nothing to "فيه أسانسير" / "فيه حصة في الأرض"
const YES = /^(نعم|ايوه|أيوه|آه|موجود|يوجد|متاح|شامل|yes|included|available)$/i;
const note = (v) => { const t = clean(v); return YES.test(t) ? '' : t; };

/** Values recorded before the building section existed, so older listings still show them */
function legacyValue(p, key) {
  const util = p?.utilities || {};
  if (key === 'elevator') {
    const t = clean(util.elevator_ar);
    if (t) return { v: NONE.test(t) ? 'no' : 'yes', note: NONE.test(t) ? '' : note(t) };
    return featureText(p, ['أسانسير', 'اسانسير', 'مصعد']) ? { v: 'yes', note: '' } : null;
  }
  if (key === 'garage') {
    const t = clean(util.parking_ar);
    if (t) return { v: NONE.test(t) ? 'no' : 'text', note: t };
    const f = featureText(p, ['جراج']);
    return f ? { v: 'text', note: f } : null;
  }
  if (key === 'garden') {
    const f = featureText(p, ['حديقة']);
    return f ? { v: 'text', note: f } : null;
  }
  if (key === 'landShare') {
    const t = clean(p?.legalStatus?.landShare_ar);
    if (t) return { v: 'yes', note: note(t) };
    return featureText(p, ['حصة بالأرض', 'حصة في الأرض', 'حصة شائعة']) ? { v: 'yes', note: '' } : null;
  }
  return null;
}

/** Only homes, shops, offices and buildings have these facts; land and farms don't */
export const hasBuildingFacts = (type) => !isLandType(type) && !isAgriculturalType(type) && !isIndustrialType(type);

/**
 * The recorded building facts: [{ key, label, value, positive }]. `positive` is false for "no …"
 * so the page can show it quietly. Facts that were never recorded are left out.
 */
export function buildingFacts(p, isAr = true) {
  if (!p || !hasBuildingFacts(p.type)) return [];
  const b = p.building || {};
  const out = [];
  for (const field of BUILDING_FIELDS) {
    const label = isAr ? field.ar : field.en;
    const opt = optionOf(field, b[field.key]);
    if (opt) {
      let value = isAr ? opt.ar : opt.en;
      if (field.key === 'garden' && opt.v !== 'no' && Number(b.gardenSize) > 0) value += ` · ${Number(b.gardenSize)} ${isAr ? 'م²' : 'm²'}`;
      if (field.key === 'landShare' && opt.v === 'yes' && note(b.landShareNote)) value += ` · ${note(b.landShareNote)}`;
      out.push({ key: field.key, label, value, positive: opt.v !== 'no' });
      continue;
    }
    const old = legacyValue(p, field.key);
    if (!old) continue;
    const base = old.v === 'text' ? old.note : (isAr ? optionOf(field, old.v)?.ar : optionOf(field, old.v)?.en);
    // A note that already says "حصة …" reads on its own
    const value = old.v === 'text' || !old.note ? base : (old.note.includes('حصة') ? old.note : `${base} · ${old.note}`);
    out.push({ key: field.key, label, value, positive: old.v !== 'no' });
  }
  return out;
}

/** True when the listing includes a land share (also read from older records) */
export const hasLandShare = (p) => buildingFacts(p).some((f) => f.key === 'landShare' && f.positive);

/** What an owner ticked on /sell, as building facts for the draft listing */
export function buildingFromSellerFeatures(ids = []) {
  const has = (id) => Array.isArray(ids) && ids.includes(id);
  const b = {};
  if (has('elevator')) b.elevator = 'yes';
  // "مكان ركنة" doesn't say which kind, so the team picks it in the CRM
  if (has('garage')) b.garage = 'private';
  if (has('garden')) b.garden = 'private';
  return b;
}

const CARD_LABELS = {
  elevator: { ar: 'أسانسير', en: 'Elevator' },
  garage: { ar: 'جراج', en: 'Garage' },
  garden: { ar: 'حديقة', en: 'Garden' },
  landShare: { ar: 'حصة أرض', en: 'Land share' }
};

/**
 * Short tags for the listing card: only what the unit has. Street parking isn't a garage, so it
 * stays on the unit page only.
 */
export function cardFeatures(p, isAr = true) {
  const street = p?.building?.garage === 'street';
  return buildingFacts(p, isAr)
    .filter((f) => f.positive && !(f.key === 'garage' && street))
    .map((f) => ({ key: f.key, label: isAr ? CARD_LABELS[f.key].ar : CARD_LABELS[f.key].en }));
}

const FACT_WORDS = {
  elevator: ['أسانسير', 'اسانسير', 'مصعد', 'elevator', 'lift'],
  garage: ['جراج', 'garage'],
  garden: ['حديقة', 'garden'],
  landShare: ['حصة', 'land share']
};

/** The features list without what the building facts above it already say */
export function featuresBesideFacts(features = [], facts = []) {
  const words = facts.flatMap((f) => FACT_WORDS[f.key] || []);
  if (!Array.isArray(features) || !words.length) return Array.isArray(features) ? features : [];
  return features.filter((feat) => !words.some((w) => String(feat).toLowerCase().includes(w)));
}
