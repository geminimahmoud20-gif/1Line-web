// =============================================================
//  Two pipelines on one status field. A buyer goes lead → qualified → meeting / viewing → negotiating →
//  closing (the stored ids are new → contacted → site_visit → negotiating → closing → closed); an owner who came to sell (or to get a valuation) goes new → contacted →
//  inspection & valuation → listed & offers → signing → sold. Both use the same status ids, so
//  the dashboard, reports and commission keep counting them; only the names, the rules for moving
//  on (stateMachineEngine) and the «matches» tab (units for a buyer, buyers for an owner) differ.
// =============================================================
import { isSellerLead } from './crmLeadViews.js';
import { findMatchingClientsForProperty } from './matchingEngine.js';

export const BUYER_STAGES = [
  { id: 'new', label_ar: 'عميل محتمل', label_en: 'Lead', column_ar: 'عملاء محتملين', column_en: 'Leads' },
  { id: 'contacted', label_ar: 'مؤهل', label_en: 'Qualified', column_ar: 'مؤهل', column_en: 'Qualified' },
  { id: 'site_visit', label_ar: 'اجتماع / معاينة', label_en: 'Meeting / viewing', column_ar: 'اجتماع / معاينة', column_en: 'Meeting / viewing' },
  { id: 'negotiating', label_ar: 'تفاوض', label_en: 'Negotiation', column_ar: 'تفاوض', column_en: 'Negotiation' },
  { id: 'closing', label_ar: 'إغلاق (توقيع وحجز)', label_en: 'Closing (signing & deposit)', column_ar: 'إغلاق', column_en: 'Closed' },
  { id: 'closed', label_ar: 'إغلاق', label_en: 'Closed', column_ar: 'إغلاق', column_en: 'Closed' }
];

export const SELLER_STAGES = [
  { id: 'new', label_ar: 'عميل محتمل', label_en: 'Lead', column_ar: 'عروض بيع جديدة', column_en: 'New listings' },
  { id: 'contacted', label_ar: 'مؤهل', label_en: 'Qualified', column_ar: 'مؤهل', column_en: 'Qualified' },
  { id: 'site_visit', label_ar: 'معاينة وتقييم', label_en: 'Inspection & valuation', column_ar: 'معاينة وتقييم', column_en: 'Inspection & valuation' },
  { id: 'negotiating', label_ar: 'معروض وعروض مشترين', label_en: 'Listed & offers', column_ar: 'معروض للبيع', column_en: 'Listed & offers' },
  { id: 'closing', label_ar: 'إغلاق (توقيع البيع)', label_en: 'Closing (signing)', column_ar: 'إغلاق', column_en: 'Closed' },
  { id: 'closed', label_ar: 'إغلاق (اتباعت)', label_en: 'Closed (sold)', column_ar: 'إغلاق', column_en: 'Closed' }
];

/**
 * The columns of the board for this lead's pipeline: five steps ending in «إغلاق» (the old signing step is
 * part of it), then غير متفاعل and خسارة. Same ids as the stored status, except that a lead in «closing»
 * counts as «closed» here (utils/dealStages boardColumnOf).
 */
export const boardStagesFor = (lead) => {
  const own = stagesFor(lead);
  const pick = (id) => own.find((s) => s.id === id);
  return [
    pick('new'), pick('contacted'), pick('site_visit'), pick('negotiating'),
    { ...pick('closed'), label_ar: lead && pipelineKind(lead) === 'seller' ? 'إغلاق (اتباعت)' : 'إغلاق', label_en: lead && pipelineKind(lead) === 'seller' ? 'Closed (sold)' : 'Closed' },
    { id: 'inactive', label_ar: 'غير متفاعل', label_en: 'Unresponsive', column_ar: 'غير متفاعل', column_en: 'Unresponsive' },
    { id: 'lost', label_ar: 'خسارة', label_en: 'Lost', column_ar: 'خسارة', column_en: 'Lost' }
  ];
};

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
