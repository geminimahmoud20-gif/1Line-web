// =============================================================
//  «العميل فتح الرابط»: which salesperson to tell, and what to say. The opens are link_opens/{lead__listing} documents
//  (api/link-open.js); the 15-minute reminder job reads the ones that changed since its last run and sends one push per
//  salesperson. A client opening the same listing again is not announced again until they come back a few more times:
//  `notified` remembers the open count already announced for each pair.
//  Pure: tests/unit/link-open-alerts.test.mjs
// =============================================================

/** A pair already announced is announced again only after this many more opens */
export const REOPEN_STEP = 3;

/**
 * opens: [{ id, leadId, propertyId, ownerUid, count, lastAt }]  (the documents changed since the last run)
 * leads: Map or object of leadId → { name, ownerUid, status }  (the clients named in `opens`)
 * titles: { propertyId: listing title }
 * notified: { [pairId]: open count already announced }
 * → { byOwner: Map(ownerUid → [{ leadId, name, items: [{ propertyId, title, count }], total }]), next: the new `notified` map }
 */
export function linkOpenAlerts(opens = [], leads = new Map(), titles = {}, notified = {}) {
  const getLead = (id) => (leads instanceof Map ? leads.get(id) : leads?.[id]);
  const next = { ...notified };
  const perLead = new Map();
  for (const o of opens) {
    const lead = getLead(o.leadId);
    if (!lead || lead.status === 'closed' || lead.status === 'lost' || lead.isArchived) continue;
    const owner = lead.ownerUid || o.ownerUid;
    if (!owner) continue; // a client nobody holds yet: nobody to tell
    const before = notified[o.id];
    if (before !== undefined && o.count < before + REOPEN_STEP) continue;
    next[o.id] = o.count;
    const entry = perLead.get(o.leadId) || { leadId: o.leadId, name: lead.name || 'عميل', owner, items: [], total: 0, lastAt: '' };
    entry.items.push({ propertyId: o.propertyId, title: titles[o.propertyId] || '', count: o.count });
    entry.total += o.count;
    if (String(o.lastAt || '') > entry.lastAt) entry.lastAt = String(o.lastAt || '');
    perLead.set(o.leadId, entry);
  }
  const byOwner = new Map();
  for (const entry of perLead.values()) {
    entry.items.sort((a, b) => b.count - a.count);
    const list = byOwner.get(entry.owner) || [];
    list.push(entry);
    byOwner.set(entry.owner, list);
  }
  for (const list of byOwner.values()) list.sort((a, b) => b.lastAt.localeCompare(a.lastAt));
  return { byOwner, next };
}

const titleOf = (it) => (it.title ? String(it.title).slice(0, 50) : 'عقار');

/** The push for one salesperson: { title, body, url } or null */
export function linkOpenPayload(entries = []) {
  if (!entries.length) return null;
  if (entries.length === 1) {
    const e = entries[0];
    const first = e.items[0];
    const more = e.items.length > 1 ? ` وفتح ${e.items.length - 1} تانيين` : '';
    const times = first.count > 1 ? ` (${first.count} مرات)` : '';
    return {
      title: `${e.name} فتح الرابط اللي بعتّه`,
      body: `${titleOf(first)}${times}${more}. وقت مناسب تكلمه دلوقتي.`,
      url: '/crm?tab=leads'
    };
  }
  const names = entries.slice(0, 3).map((e) => e.name).join('، ');
  return {
    title: `${entries.length} عملاء فتحوا الروابط اللي بعتّها`,
    body: `${names}${entries.length > 3 ? ` و${entries.length - 3} غيرهم` : ''}. وقت مناسب تكلمهم.`,
    url: '/crm?tab=leads'
  };
}
