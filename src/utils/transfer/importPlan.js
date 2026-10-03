// =============================================================
//  What an import will do, before anything is saved: new rows, updates to existing records,
//  rows skipped and why. The import screen shows this plan; saving only writes what it lists.
// =============================================================

import { normKey, normalizePhone } from './normalize.js';
import { IGNORE, rowToProperty, fillAreasFromSiblings } from './propertySchema.js';
import { rowToLead } from './leadSchema.js';

/** Table row → { fieldKey: raw } for mapped columns; plus the set of fields that had a value */
export function mapRow(headers, row, mapping) {
  const out = {};
  const provided = new Set();
  headers.forEach((h, i) => {
    const key = mapping[h];
    if (!key || key === IGNORE) return;
    const raw = row[i] ?? '';
    // Two columns on one field: keep the first non-empty value
    if (out[key] === undefined || String(out[key]).trim() === '') out[key] = raw;
    if (String(raw).trim() !== '') provided.add(key);
  });
  return { values: out, provided };
}

// Which property fields each spreadsheet field writes (used to update only what the file has)
const WRITES = {
  unitCode: ['unitCode'],
  title_ar: ['title_ar'],
  title_en: ['title_en'],
  type: ['type', 'category'],
  areaKey: ['areaKey', 'locationName_ar'],
  locationDetail: ['locationName_ar'],
  address: ['address_ar'],
  price: ['price', 'pricePerMeter'],
  downPayment: ['downPayment'],
  monthlyInstallment: ['monthlyInstallment'],
  paymentMethod: ['paymentMethod'],
  size: ['size', 'pricePerMeter'],
  bedrooms: ['bedrooms'],
  bathrooms: ['bathrooms'],
  floor: ['floor'],
  totalFloors: ['totalFloors'],
  finishing_ar: ['finishing_ar', 'finishing_en'],
  description_ar: ['description_ar']
};

const codeKey = (v) => normKey(v).replace(/\s+/g, '');

/**
 * Properties plan.
 *   statusMode: 'review' | 'file'; duplicates: 'update' | 'skip'; withOwners: build seller leads
 *   existing: current properties (matched by unitCode); existingLeads: to skip known owner phones
 */
export function planPropertyImport({ headers, rows, mapping, existing = [], existingLeads = [], areas = [], statusMode = 'review', duplicates = 'update', withOwners = true, now = new Date(), idPrefix = 'prop-imp' }) {
  // Code → existing listings with it (in order): a code used twice pairs row-by-row instead of
  // two rows overwriting one listing. A listing without a code is found by its id, which is
  // what the export writes in the code column for it.
  const byCode = new Map();
  const add = (k, p) => { if (k) byCode.set(k, [...(byCode.get(k) || []), p]); };
  for (const p of existing) {
    if (p?.isDeleted || p?.status === 'trash') continue;
    add(codeKey(p.unitCode), p);
    if (codeKey(p.id) !== codeKey(p.unitCode)) add(codeKey(p.id), p);
  }
  const claimed = new Set();
  const claim = (k) => {
    const hit = (byCode.get(k) || []).find((p) => !claimed.has(p.id));
    if (hit) claimed.add(hit.id);
    return hit || null;
  };
  const results = rows.map((row) => {
    const { values, provided } = mapRow(headers, row, mapping);
    return { ...rowToProperty(values, { areas, statusMode, now }), provided };
  });
  fillAreasFromSiblings(results);

  const seenCodes = new Map();
  const stamp = now.getTime().toString(36);
  const items = results.map((r, i) => {
    const code = codeKey(r.property.unitCode);
    const warnings = [...r.warnings];
    if (code) {
      if (seenCodes.has(code)) warnings.push(`نفس الكود مكرر في الملف (سطر ${seenCodes.get(code) + 2})`);
      else seenCodes.set(code, i);
    }
    const match = code ? claim(code) : null;
    if (match && duplicates === 'skip') return { action: 'skip', reason: 'موجود بالفعل', rowIndex: i, property: r.property, existing: match, warnings, owner: r.owner };
    if (match) {
      // Update only the fields this file actually filled in; photos, offers and edits stay
      const patch = { id: match.id, importedAt: r.property.importedAt };
      for (const f of r.provided) for (const k of WRITES[f] || []) if (r.property[k] !== undefined) patch[k] = r.property[k];
      // Matched by id (the export's code column for a listing without one): don't make the id its code
      if (!match.unitCode && codeKey(patch.unitCode) === codeKey(match.id)) delete patch.unitCode;
      if (statusMode === 'file' && r.provided.has('status')) patch.status = r.property.status;
      else if (r.property.status === 'sold') patch.status = 'sold';
      return { action: 'update', rowIndex: i, property: patch, existing: match, warnings, owner: r.owner, inferredArea: r.inferredArea };
    }
    return { action: 'new', rowIndex: i, property: { id: `${idPrefix}-${stamp}-${i}`, ...r.property }, warnings, owner: r.owner, inferredArea: r.inferredArea };
  });

  // Owners with a phone → one seller lead per phone (a phone on several units lists them all)
  const owners = [];
  if (withOwners) {
    const knownPhones = new Set(existingLeads.map((l) => normalizePhone(l?.phone || l?.whatsapp)).filter(Boolean));
    const byPhone = new Map();
    for (const it of items) {
      if (!it.owner || it.action === 'skip') continue;
      const p = { ...(it.existing || {}), ...it.property };
      const entry = byPhone.get(it.owner.phone) || { name: it.owner.name, phone: it.owner.phone, units: [] };
      if (!entry.name && it.owner.name) entry.name = it.owner.name;
      entry.units.push(p);
      byPhone.set(it.owner.phone, entry);
    }
    for (const o of byPhone.values()) {
      if (knownPhones.has(o.phone)) continue;
      const first = o.units[0];
      const unitsText = o.units.map((u) => `${u.unitCode ? `كود ${u.unitCode}: ` : ''}${u.title_ar}${u.price ? ` (${Number(u.price).toLocaleString('en-US')} ج.م)` : ''}`).join(' | ');
      owners.push({
        name: (o.name || `مالك ${first.unitCode ? `وحدة ${first.unitCode}` : first.title_ar}`).slice(0, 100),
        phone: o.phone,
        whatsapp: o.phone,
        type: 'seller',
        status: 'new',
        source: 'استيراد ملف العقارات',
        propertyType: first.type || '',
        area: first.areaKey || '',
        budget: first.price || '',
        assignedTo: 'Unassigned',
        temperature: 'warm',
        score: 70,
        notes: `مالك الوحدات: ${unitsText}`.slice(0, 2000),
        details: { propertyType: first.type || '', area: first.areaKey || '', listingIds: o.units.map((u) => u.id).filter(Boolean) },
        importedAt: now.toISOString()
      });
    }
  }

  const counts = {
    new: items.filter((x) => x.action === 'new').length,
    update: items.filter((x) => x.action === 'update').length,
    skip: items.filter((x) => x.action === 'skip').length,
    warnings: items.filter((x) => x.warnings.length).length,
    owners: owners.length
  };
  return { items, owners, counts };
}

/**
 * Clients plan: rows without a phone/email are skipped; a phone already in the CRM or repeated
 * in the file is skipped (the first one is kept).
 */
export function planLeadImport({ headers, rows, mapping, existingLeads = [], areas = [], now = new Date() }) {
  const known = new Set(existingLeads.map((l) => normalizePhone(l?.phone || l?.whatsapp)).filter(Boolean));
  const seen = new Map();
  const items = rows.map((row, i) => {
    const { values } = mapRow(headers, row, mapping);
    const r = rowToLead(values, { areas, now });
    if (r.skip) return { action: 'skip', reason: r.skip, rowIndex: i, lead: { name: String(values.name || '').trim() }, warnings: [] };
    const phone = r.lead.phone;
    if (phone && known.has(phone)) return { action: 'skip', reason: 'مسجل بالفعل في العملاء', rowIndex: i, lead: r.lead, warnings: r.warnings };
    if (phone && seen.has(phone)) return { action: 'skip', reason: `مكرر في الملف (سطر ${seen.get(phone) + 2})`, rowIndex: i, lead: r.lead, warnings: r.warnings };
    if (phone) seen.set(phone, i);
    return { action: 'new', rowIndex: i, lead: r.lead, warnings: r.warnings };
  });
  return {
    items,
    counts: {
      new: items.filter((x) => x.action === 'new').length,
      update: 0,
      skip: items.filter((x) => x.action === 'skip').length,
      warnings: items.filter((x) => x.warnings.length).length
    }
  };
}

/**
 * A 1Line JSON backup / export: objects already in 1Line's own shape. Properties are restored
 * as they are (merged by id); leads lose ids and client-only fields and come in as new clients.
 */
export function looksNative(objects = [], entity) {
  if (!objects.length) return false;
  const sample = objects.slice(0, 20);
  if (entity === 'properties') return sample.every((o) => o.id !== undefined && (o.title_ar || o.title_en) && 'price' in o);
  return sample.every((o) => o.name && (o.phone || o.whatsapp || o.email));
}

export function planNativeProperties(objects, existing = []) {
  const ids = new Set(existing.map((p) => String(p.id)));
  const items = objects.map((o, i) => {
    const property = { ...o, id: String(o.id), isDemo: false };
    delete property._cloud;
    return { action: ids.has(property.id) ? 'update' : 'new', rowIndex: i, property, warnings: [] };
  });
  return { items, owners: [], counts: { new: items.filter((x) => x.action === 'new').length, update: items.filter((x) => x.action === 'update').length, skip: 0, warnings: 0, owners: 0 } };
}

export function planNativeLeads(objects, existingLeads = []) {
  const known = new Set(existingLeads.map((l) => normalizePhone(l?.phone || l?.whatsapp)).filter(Boolean));
  const items = objects.map((o, i) => {
    const { id: _id, _cloud, _inlineContact, createdAt: _createdAt, queuedAt: _q, ...lead } = o;
    const phone = normalizePhone(lead.phone || lead.whatsapp);
    if (phone && known.has(phone)) return { action: 'skip', reason: 'مسجل بالفعل في العملاء', rowIndex: i, lead, warnings: [] };
    if (phone) known.add(phone);
    return { action: 'new', rowIndex: i, lead: { ...lead, phone: phone || lead.phone || '', status: lead.status || 'new' }, warnings: [] };
  });
  return { items, counts: { new: items.filter((x) => x.action === 'new').length, update: 0, skip: items.filter((x) => x.action === 'skip').length, warnings: 0 } };
}
