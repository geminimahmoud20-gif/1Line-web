// =============================================================
//  Who a CRM listing came from: the owner, a broker, someone acting for the owner, or a developer.
//  Listings are public documents (anyone can read /properties), so the contact's name and phone
//  never go on the listing. They are saved as a client in «العملاء» (leads + the protected
//  lead_contacts doc). The listing keeps only `listedBy` and `sourceLeadId`, the link to that client.
//  Pure functions (tests/unit/listing-contact.test.mjs).
// =============================================================
import { normalizePhone } from './transfer/normalize.js';

export const LISTED_BY = [
  { value: 'owner', ar: 'المالك نفسه', en: 'Owner' },
  { value: 'broker', ar: 'وسيط / سمسار', en: 'Broker' },
  { value: 'agent', ar: 'مفوّض أو قريب المالك', en: 'Acting for the owner' },
  { value: 'developer', ar: 'شركة / مطوّر', en: 'Developer' }
];

export const listedByLabel = (value, isAr = true) => {
  const o = LISTED_BY.find((x) => x.value === value);
  return o ? (isAr ? o.ar : o.en) : '';
};

/** The client this listing came from: its sourceLeadId, or a client whose details list this unit */
export function linkedContactLead(property, leads = []) {
  if (!property) return null;
  if (property.sourceLeadId) {
    const byId = leads.find((l) => String(l?.id) === String(property.sourceLeadId));
    if (byId) return byId;
  }
  if (!property.id) return null;
  return leads.find((l) => Array.isArray(l?.details?.listingIds) && l.details.listingIds.includes(property.id)) || null;
}

/** A client already saved with this phone (so a second unit from the same owner links to them) */
export function leadWithPhone(phone, leads = []) {
  const p = normalizePhone(phone);
  if (!p) return null;
  return leads.find((l) => normalizePhone(l?.phone || l?.whatsapp) === p) || null;
}

/** What's wrong with the contact typed on the listing form, or '' */
export function listingContactProblem({ name = '', phone = '', listedBy = '' } = {}, { required = false, isAr = true } = {}) {
  const L = (ar, en) => (isAr ? ar : en);
  const hasPhone = String(phone).trim() !== '';
  if (required && !listedBy) return L('اختار مين اللي عارض الوحدة: المالك ولا وسيط', 'Pick who is offering the unit: owner or broker');
  if (required && !hasPhone) return L('اكتب رقم صاحب الوحدة (بيتحفظ في العملاء ومش بيظهر على الموقع)', "Enter the contact's phone (saved in clients, never shown on the site)");
  if (hasPhone && !normalizePhone(phone)) return L('رقم صاحب الوحدة مش صحيح', "The contact's phone isn't valid");
  if (hasPhone && String(name).trim().length === 1) return L('اكتب اسم صاحب الوحدة كامل', "Enter the contact's full name");
  return '';
}

const TYPE_LABEL = { apartment: 'شقة', villa: 'فيلا', commercial: 'محل', retail: 'محل', office: 'مكتب', land: 'أرض' };

/**
 * The client saved for the listing's contact: a seller (or a broker) in «العملاء», linked back
 * to the unit. `property` is the listing as saved.
 */
export function listingContactLead(property, { name = '', phone = '', listedBy = 'owner', who = '', now = new Date() } = {}) {
  const p = normalizePhone(phone);
  const role = listedByLabel(listedBy) || 'صاحب الوحدة';
  const unit = `${property.unitCode ? `كود ${property.unitCode}: ` : ''}${property.title_ar || TYPE_LABEL[property.type] || 'وحدة'}`;
  const price = Number(property.price) ? ` (${Number(property.price).toLocaleString('en-US')} ج.م)` : '';
  const cleanName = String(name).trim();
  return {
    name: (cleanName.length >= 2 ? cleanName : `${role} ${unit}`).slice(0, 100),
    phone: p,
    whatsapp: p,
    type: listedBy === 'broker' ? 'broker' : 'seller',
    status: 'new',
    source: 'إضافة وحدة من الـ CRM',
    propertyType: property.type || '',
    area: property.areaKey || '',
    budget: property.price || '',
    assignedTo: 'Unassigned',
    notes: `${role} للوحدة ${unit}${price}${who ? `. سجّلها ${who}` : ''}`.slice(0, 2000),
    details: { propertyType: property.type || '', area: property.areaKey || '', listingIds: [property.id].filter(Boolean), listedBy },
    importedAt: now.toISOString()
  };
}
