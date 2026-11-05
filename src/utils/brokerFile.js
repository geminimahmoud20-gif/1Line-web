// =============================================================
//  A broker's file in the CRM: the units they brought (linked by sourceLeadId or listingIds) with
//  the stage each one is at and the buyer requests it fits, and the requests they brought (matched by
//  phone) with the listed units that fit them. «Fits» reuses the «رشّحلي وحدتي» scoring
//  (utils/buyerMatch) with the request read as answers; a different kind of property scores 0.
//  Pure: tests/unit/broker-file.test.mjs.
// =============================================================
import { normalizePhone } from './transfer/normalize.js';
import { matchUnit } from './buyerMatch.js';
import { assetClass, liveListings } from './marketStats.js';

/** Units this client brought: linked on the unit (sourceLeadId) or listed on the client (details.listingIds) */
export function brokerUnits(lead, properties = []) {
  if (!lead) return [];
  const ids = new Set((lead.details?.listingIds || []).map(String));
  return properties.filter((p) => p && !p.isDemo && !p.deleted && !p.isDeleted
    && (String(p.sourceLeadId || '') === String(lead.id) || ids.has(String(p.id))));
}

/** Requests this client posted: the same phone, or linked to the client */
export function brokerDemands(lead, demands = []) {
  if (!lead) return [];
  const phone = normalizePhone(lead.phone || lead.whatsapp);
  return demands.filter((d) => d && !d.deleted
    && (String(d.sourceLeadId || '') === String(lead.id)
      || (phone && normalizePhone(d.phone || d.whatsapp) === phone)));
}

/** Where a unit stands: { id, ar, tone } */
export function unitStage(p = {}) {
  if (p.status === 'sold') return { id: 'sold', ar: 'اتباعت', tone: 'neutral' };
  if (p.approval === 'pending') return { id: 'pending', ar: 'مستنية موافقة', tone: 'warning' };
  if (p.approval === 'rejected') return { id: 'rejected', ar: 'اترفضت', tone: 'danger' };
  if (p.status === 'draft') return { id: 'draft', ar: 'مسودة', tone: 'neutral' };
  if (p.status === 'hidden' || p.status === 'trash') return { id: 'hidden', ar: 'مخفية', tone: 'neutral' };
  if (p.status === 'reserved') return { id: 'reserved', ar: 'محجوزة', tone: 'info' };
  return { id: 'published', ar: 'منشورة على الموقع', tone: 'success' };
}

/** Where a request stands: { id, ar, tone } */
export function demandStage(d = {}) {
  const s = d.status || 'published';
  if (s === 'pending') return { id: 'pending', ar: 'مستني موافقة', tone: 'warning' };
  if (s === 'archived' || s === 'closed' || s === 'fulfilled') return { id: 'closed', ar: 'مقفول', tone: 'neutral' };
  return { id: 'published', ar: 'منشور', tone: 'success' };
}

const isOpenDemand = (d) => demandStage(d).id !== 'closed';

/** A request read as «رشّحلي وحدتي» answers: area, budget against the total price, minimum size */
export const demandAnswers = (d = {}) => ({
  areas: d.area && d.area !== 'all' ? [d.area] : [],
  payment: 'cash',
  budget: d.budget,
  minSize: d.minSize
});

/** { score, matches, misses, notes } for a unit against a request; another kind of property is 0 */
export function unitDemandFit(unit, demand, areas = []) {
  if (demand?.type && demand.type !== 'all' && assetClass({ type: demand.type }) !== assetClass(unit)) {
    return { score: 0, matches: [], misses: ['نوع العقار مختلف عن المطلوب'], notes: [] };
  }
  const r = matchUnit(unit, demandAnswers(demand), areas, { only: ['budget', 'area', 'size'] });
  // The reasons were written for a buyer talking to us; here they describe a request
  const reword = (t) => t.replace('ميزانيتك', 'ميزانية الطلب').replace('اللي اخترتها', 'المطلوبة').replace('اللي محتاجه', 'المطلوبة');
  return { ...r, matches: r.matches.map(reword), misses: r.misses.map(reword), notes: r.notes.map(reword) };
}

/** The open requests a unit fits best (score ≥ min), best first */
export function demandsForUnit(unit, demands = [], areas = [], { min = 50, limit = 3 } = {}) {
  return demands.filter(isOpenDemand)
    .map((demand) => ({ demand, ...unitDemandFit(unit, demand, areas) }))
    .filter((x) => x.score >= min)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/** The live units that fit a request best (score ≥ min), best first */
export function unitsForDemand(demand, properties = [], areas = [], { min = 50, limit = 3 } = {}) {
  return liveListings(properties)
    .map((unit) => ({ unit, ...unitDemandFit(unit, demand, areas) }))
    .filter((x) => x.score >= min)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
