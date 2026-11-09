// =============================================================
//  Two pipelines on one status field. A buyer goes new → contacted → viewing → negotiating →
//  closing → won; an owner who came to sell (or to get a valuation) goes new → contacted →
//  inspection & valuation → listed & offers → signing → sold. Both use the same status ids, so
//  the dashboard, reports and commission keep counting them; only the names, the rules for moving
//  on (stateMachineEngine) and the «matches» tab (units for a buyer, buyers for an owner) differ.
// =============================================================
import { isSellerLead } from './crmLeadViews.js';
import { findMatchingClientsForProperty } from './matchingEngine.js';

export const BUYER_STAGES = [
  { id: 'new', label_ar: 'جديد', label_en: 'New', column_ar: 'طلبات جديدة', column_en: 'New Inquiries' },
  { id: 'contacted', label_ar: 'اتصلنا', label_en: 'Contacted', column_ar: 'اتصلنا', column_en: 'Contacted' },
  { id: 'site_visit', label_ar: 'معاينة', label_en: 'Viewing', column_ar: 'معاينات', column_en: 'Site Visits' },
  { id: 'negotiating', label_ar: 'تفاوض', label_en: 'Negotiating', column_ar: 'تفاوض', column_en: 'Negotiation' },
  { id: 'closing', label_ar: 'توقيع وحجز', label_en: 'Closing', column_ar: 'توقيع وحجز', column_en: 'Closing / Deposit' },
  { id: 'closed', label_ar: 'صفقة ناجحة', label_en: 'Closed', column_ar: 'صفقات ناجحة', column_en: 'Closed Won' }
];

export const SELLER_STAGES = [
  { id: 'new', label_ar: 'جديد', label_en: 'New', column_ar: 'عروض بيع جديدة', column_en: 'New listings' },
  { id: 'contacted', label_ar: 'اتصلنا', label_en: 'Contacted', column_ar: 'اتصلنا', column_en: 'Contacted' },
  { id: 'site_visit', label_ar: 'معاينة وتقييم', label_en: 'Inspection & valuation', column_ar: 'معاينة وتقييم', column_en: 'Inspection & valuation' },
  { id: 'negotiating', label_ar: 'معروض وعروض مشترين', label_en: 'Listed & offers', column_ar: 'معروض للبيع', column_en: 'Listed & offers' },
  { id: 'closing', label_ar: 'توقيع البيع', label_en: 'Signing', column_ar: 'توقيع البيع', column_en: 'Signing' },
  { id: 'closed', label_ar: 'اتباعت', label_en: 'Sold', column_ar: 'اتباعت', column_en: 'Sold' }
];

/** 'seller' for an owner who came to sell or value a property, otherwise 'buyer' */
export const pipelineKind = (lead) => (isSellerLead(lead || {}) ? 'seller' : 'buyer');

/** The stages this lead moves through (without «lost», which every pipeline has) */
export const stagesFor = (lead) => (pipelineKind(lead) === 'seller' ? SELLER_STAGES : BUYER_STAGES);

/** The price the owner asks, as a number (0 when none is recorded yet) */
export function askingPriceOf(lead = {}) {
  const raw = lead.details?.askingPrice ?? lead.askingPrice ?? lead.details?.expectedPrice ?? lead.expectedPrice ?? 0;
  const n = typeof raw === 'number' ? raw : Number(String(raw).replace(/[^0-9.]/g, ''));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/** The owner's unit described as a listing, to look for buyers who fit it */
export function sellerUnitOf(lead = {}) {
  const d = lead.details || {};
  return {
    id: `lead:${lead.id || ''}`,
    areaKey: d.area || lead.area || '',
    type: d.propertyType || lead.propertyType || '',
    price: askingPriceOf(lead),
    size: d.size || lead.size || ''
  };
}

/** The buyers (open buyer leads and buyer requests) who fit an owner's unit, best first */
export function buyersForSeller(lead, leads = [], demands = []) {
  if (!lead) return [];
  const others = leads.filter((l) => l && l.id !== lead.id);
  return findMatchingClientsForProperty(sellerUnitOf(lead), others, demands).sort((a, b) => b.score - a.score);
}
