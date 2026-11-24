// =============================================================
//  «مطابقة استباقية»، في الاتجاهين: a new listing tells the salespeople whose buyers already fit it, and a
//  new buyer lead tells the salesperson whose live listings already fit them — either way, nobody has to
//  open the matching screen to find out. Pure; the 15-minute reminder job (scripts/send-followup-reminders.mjs)
//  reads what changed and sends the push. Scoring is the CRM's own (scoreForBuyer), so every alert and the
//  matching screen always agree. Tests: tests/unit/match-alerts.test.mjs
// =============================================================
import { scoreForBuyer, MATCH_THRESHOLD } from './matchingEngine.js';
import { liveListings } from './marketStats.js';
import { isSellerLead } from './crmLeadViews.js';

export const OPEN_BUYER_STAGES = ['new', 'contacted', 'site_visit', 'negotiating', 'closing'];
/** Names listed per listing in the alert; the count says the rest */
export const BUYERS_SHOWN = 3;

/** Listings approved after `sinceIso` that this job has not already announced */
export function freshListings(properties = [], sinceIso = '', done = new Set()) {
  return liveListings(properties).filter((p) => (p.approval || 'approved') === 'approved'
    && String(p.approvedAt || '') > String(sinceIso || '')
    && !done.has(String(p.id)));
}

/**
 * Who to tell and what about. A buyer counts when the lead is open, is not an owner selling, has a salesperson
 * (ownerUid), and has not turned this listing down; the listing must score at least `minScore` for them.
 * → Map(ownerUid → { uid, buyerCount, items: [{ listing, best, buyers: [{ id, name, score }], total }] }), best first
 */
export function matchAlerts(listings = [], leads = [], { minScore = MATCH_THRESHOLD } = {}) {
  const buyers = leads.filter((l) => l && !l.isArchived && OPEN_BUYER_STAGES.includes(l.status || 'new') && !isSellerLead(l) && l.ownerUid);
  const byOwner = new Map();
  for (const listing of listings) {
    const perOwner = new Map();
    for (const lead of buyers) {
      if ((lead.details?.matchDismissed || []).includes(listing.id)) continue;
      const fit = scoreForBuyer(listing, lead);
      if (!fit || fit.score < minScore) continue;
      const list = perOwner.get(lead.ownerUid) || [];
      list.push({ id: lead.id, name: lead.name || 'عميل', score: fit.score });
      perOwner.set(lead.ownerUid, list);
    }
    for (const [uid, list] of perOwner) {
      list.sort((a, b) => b.score - a.score);
      const entry = byOwner.get(uid) || { uid, buyerCount: 0, items: [] };
      entry.items.push({ listing, best: list[0].score, buyers: list.slice(0, BUYERS_SHOWN), total: list.length });
      entry.buyerCount += list.length;
      byOwner.set(uid, entry);
    }
  }
  for (const entry of byOwner.values()) entry.items.sort((a, b) => b.best - a.best || b.total - a.total);
  return byOwner;
}

const listingName = (p) => String(p.title_ar || p.title_en || 'عقار جديد').slice(0, 60);
const priceText = (p) => (Number(p.price) > 0 ? `${Number(p.price).toLocaleString('en-US')} ج.م` : '');

/**
 * The other direction: a brand-new buyer lead that already fits units already live. `done` is
 * which lead ids this job already announced; the caller only passes leads created since the last
 * run (a Firestore range query on createdAt), so there is no date check here.
 */
export function freshBuyers(leads = [], done = new Set()) {
  return leads.filter((l) => l && l.id != null && !l.isArchived && !isSellerLead(l) && l.ownerUid && !done.has(String(l.id)));
}

/**
 * For each fresh buyer, the live listings that already fit them (same scoring as matchAlerts, so
 * the two directions never disagree). → Map(ownerUid → { uid, listingCount, items: [{ lead, best,
 * listings: [{ id, title, score }], total }] }), best match first.
 */
export function buyerMatchAlerts(buyers = [], properties = [], { minScore = MATCH_THRESHOLD } = {}) {
  const listings = liveListings(properties);
  const byOwner = new Map();
  for (const lead of buyers) {
    const dismissed = new Set(lead.details?.matchDismissed || []);
    const fits = [];
    for (const property of listings) {
      if (dismissed.has(property.id)) continue;
      const fit = scoreForBuyer(property, lead);
      if (!fit || fit.score < minScore) continue;
      fits.push({ id: property.id, title: listingName(property), score: fit.score });
    }
    if (!fits.length) continue;
    fits.sort((a, b) => b.score - a.score);
    const entry = byOwner.get(lead.ownerUid) || { uid: lead.ownerUid, listingCount: 0, items: [] };
    entry.items.push({ lead, best: fits[0].score, listings: fits.slice(0, BUYERS_SHOWN), total: fits.length });
    entry.listingCount += fits.length;
    byOwner.set(lead.ownerUid, entry);
  }
  for (const entry of byOwner.values()) entry.items.sort((a, b) => b.best - a.best || b.total - a.total);
  return byOwner;
}

/** The phone notification for one person, the buyer-fits-listings direction: { title, body, url } */
export function buyerMatchAlertPayload(entry) {
  const items = entry?.items || [];
  if (!items.length) return null;
  if (items.length === 1) {
    const it = items[0];
    const titles = it.listings.map((p) => p.title).join('، ') + (it.total > it.listings.length ? ` و${it.total - it.listings.length} غيرها` : '');
    return {
      title: `${it.total} عقار جاهز يناسب ${it.lead.name || 'عميلك الجديد'}`,
      body: titles,
      url: '/crm?tab=matching'
    };
  }
  const shown = items.slice(0, 2).map((it) => `${it.lead.name || 'عميل'} (${it.total})`).join('، ');
  return {
    title: `عقارات جاهزة تناسب ${items.length} من عملاءك الجدد`,
    body: `${shown}${items.length > 2 ? ` و${items.length - 2} غيرهم` : ''}`,
    url: '/crm?tab=matching'
  };
}

/** The phone notification for one person: { title, body, url } */
export function matchAlertPayload(entry) {
  const items = entry?.items || [];
  if (!items.length) return null;
  if (items.length === 1) {
    const it = items[0];
    const names = it.buyers.map((b) => b.name).join('، ') + (it.total > it.buyers.length ? ` و${it.total - it.buyers.length} غيرهم` : '');
    return {
      title: `عقار جديد مناسب لـ ${it.total} من عملاءك`,
      body: `${[listingName(it.listing), priceText(it.listing)].filter(Boolean).join(' — ')}: ${names}`,
      url: '/crm?tab=matching'
    };
  }
  const shown = items.slice(0, 2).map((it) => `${listingName(it.listing)} (${it.total})`).join('، ');
  return {
    title: `${items.length} عقارات جديدة مناسبة لعملاءك`,
    body: `${shown}${items.length > 2 ? ` و${items.length - 2} غيرهم` : ''}`,
    url: '/crm?tab=matching'
  };
}
