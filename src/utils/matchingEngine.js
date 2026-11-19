// =============================================================
//  ONE LINE REAL ESTATE - SMART WHATSAPP MATCH & RETARGETING ENGINE
// =============================================================

import { normalizeAreaKey, getAreas } from './areasData.js';
import { SITE_URL } from '../config/siteConfig.js';
import { isSellerLead, parseMoney } from './crmLeadViews.js';
import { liveListings } from './marketStats.js';
import { matchUnit, hardFit } from './buyerMatch.js';
import { requestOf, missingInRequest } from './buyerRequest.js';
import { paymentTerms, planSummary } from './paymentTerms.js';
import { trackedListingUrl } from './linkTracking.js';

/**
 * Normalizes phone number for WhatsApp URL
 */
export function formatWhatsAppPhone(phone) {
  if (!phone) return '';
  let cleaned = phone.replace(/[^0-9]/g, '');
  if (cleaned.startsWith('01')) {
    cleaned = '2' + cleaned;
  } else if (!cleaned.startsWith('20') && cleaned.length === 10) {
    cleaned = '20' + cleaned;
  }
  return cleaned;
}

/** A unit more than 20% above the buyer's budget is never offered (see BUDGET_STRETCH) */
export const BUDGET_STRETCH = 1.2;
/** Out of 100; below this a buyer is not matched */
export const MATCH_THRESHOLD = 70;
/** A unit under a quarter of the buyer's budget is not what they are after (a typo in the budget, or a buyer for something bigger): capped below the threshold */
export const MIN_BUDGET_RATIO = 0.25;
/** What the budget or the area is worth when the buyer gave none (a client the team entered by hand, with little written) */
const UNKNOWN_CORE = 0.3;
/** No kind of property asked for: the match is less certain */
const UNKNOWN_KIND_PENALTY = 20;

const phoneKey = (phone) => String(phone || '').replace(/[^0-9]/g, '').slice(-10);

/**
 * How well a listing fits one buyer (a lead or a buyer request), or null when it clearly doesn't. One scoring
 * for everybody (utils/buyerMatch): the buyer's request is read by utils/buyerRequest from his own answers,
 * what the advisor wrote in «طلب العميل» and the plain fields (kind, area, budget). The kind, the area, the
 * budget (up to 20% above) and a minimum size are firm; rooms, handover and purpose only move the score.
 * @returns {{score: number, reasons: string[], misses: string[], missing: string[]} | null}
 */
export function scoreForBuyer(property, source) {
  const { answers, complete } = requestOf(source);
  const areas = getAreas();
  const hard = hardFit(property, answers, areas, { stretch: BUDGET_STRETCH - 1 });
  if ((answers.kind && !hard.kind) || !hard.area || !hard.budget || !hard.size) return null;
  const fit = matchUnit(property, answers, areas, { unknownScore: complete ? 1 : UNKNOWN_CORE, stretch: BUDGET_STRETCH - 1 });
  let score = fit.score - (answers.kind ? 0 : UNKNOWN_KIND_PENALTY);
  const reasons = [...(answers.kind ? ['نفس نوع العقار'] : []), ...fit.matches];
  // A unit far below the budget: most likely a typo in the budget, not a buyer who wants it
  const price = parseMoney(property.price);
  const budget = answers.payment === 'cash' ? parseMoney(answers.budget) : 0;
  if (budget > 0 && price > 0 && price / budget < MIN_BUDGET_RATIO) {
    score = Math.min(score, MATCH_THRESHOLD - 10);
    reasons.push('العقار أرخص بكتير من الميزانية، راجع الميزانية');
  }
  return { score: Math.max(0, Math.min(100, Math.round(score))), reasons, misses: fit.misses, missing: missingInRequest(answers) };
}

/**
 * Finds all leads and demands matching a given property
 * @param {Object} property The property being added, sold, or updated
 * @param {Array} leads Registered CRM leads
 * @param {Array} demands Public/Office buyer demands
 * @returns {Array} List of matched client profiles with calculated match score, best first. A person
 * registered more than once (same phone) appears once, with the best score.
 */
export function findMatchingClientsForProperty(property, leads = [], demands = []) {
  if (!property) return [];
  const byPhone = new Map();
  const keep = (entry) => {
    const key = phoneKey(entry.phone) || `id:${entry.id}`;
    const prev = byPhone.get(key);
    if (!prev || entry.score > prev.score) byPhone.set(key, entry);
  };

  // 1. CRM leads: active buyers only (an owner who came to sell is not a buyer)
  leads.forEach((lead) => {
    if (lead.status === 'closed' || lead.status === 'lost' || lead.status === 'inactive' || lead.isArchived) return;
    if (isSellerLead(lead)) return;
    const contactPhone = lead.whatsapp || lead.phone;
    if (!contactPhone) return;
    // A listing the client turned down is not offered again
    if ((lead.details?.matchDismissed || []).includes(property.id)) return;
    const fit = scoreForBuyer(property, lead);
    if (!fit || fit.score < MATCH_THRESHOLD) return;
    const { answers } = requestOf(lead);
    keep({
      id: lead.id,
      name: lead.name || 'عميل 1Line',
      phone: contactPhone,
      whatsapp: contactPhone,
      source: 'قاعدة بيانات العملاء (CRM)',
      score: fit.score,
      reasons: fit.reasons,
      missing: fit.missing,
      leadArea: normalizeAreaKey((answers.areas || [])[0] || ''),
      leadType: answers.kind,
      leadBudget: parseMoney(answers.payment === 'cash' ? answers.budget : (answers.down || answers.budget)),
      notes: lead.notes || ''
    });
  });

  // 2. Buyer demands (if a phone is provided): the same request shape
  demands.forEach((demand) => {
    if (demand.status !== 'published' && demand.status !== 'pending') return;
    const contactPhone = demand.whatsapp || demand.phone;
    if (!contactPhone) return;
    const fit = scoreForBuyer(property, { propertyType: demand.type, area: demand.area, budget: demand.budget, minSize: demand.minSize, paymentMethod: demand.paymentMethod });
    if (!fit || fit.score < MATCH_THRESHOLD) return;
    keep({
      id: demand.id,
      name: demand.clientName || 'مشتري عقار',
      phone: contactPhone,
      whatsapp: contactPhone,
      source: 'طلبات المشترين (Demands)',
      score: fit.score,
      reasons: fit.reasons,
      missing: fit.missing,
      leadArea: normalizeAreaKey(demand.area || ''),
      leadType: demand.type || '',
      leadBudget: parseMoney(demand.budget),
      notes: demand.text_ar || ''
    });
  });

  // Best score first; among equals the closer budget
  return [...byPhone.values()].sort((a, b) => b.score - a.score || (b.leadBudget || 0) - (a.leadBudget || 0));
}

/**
 * The matching screen's data: one row per buyer (a person, by phone) with the best few listings that
 * fit them, best buyer first. Listings that are sold, hidden, sample or unpriced never appear, and the
 * buyer rules are findMatchingClientsForProperty's (active buyers only, kind, area, budget, answers).
 * @returns {{key: string, lead: object|null, name: string, phone: string, budget: number, best: number, total: number,
 *            items: {property: object, score: number, reasons: string[]}[]}[]}
 */
export function matchBuyersToProperties(leads = [], properties = [], { minScore = MATCH_THRESHOLD, perBuyer = 3 } = {}) {
  const leadById = new Map(leads.map((l) => [String(l.id), l]));
  const rows = new Map();
  for (const property of liveListings(properties)) {
    for (const m of findMatchingClientsForProperty(property, leads, [])) {
      if (m.score < minScore) continue;
      const key = phoneKey(m.phone) || `id:${m.id}`;
      let row = rows.get(key);
      if (!row) { row = { key, lead: null, name: m.name, phone: m.phone, budget: 0, best: 0, missing: [], items: [] }; rows.set(key, row); }
      if (m.score > row.best) { row.best = m.score; row.lead = leadById.get(String(m.id)) || row.lead; row.name = m.name; row.phone = m.phone; }
      row.budget = Math.max(row.budget, m.leadBudget || 0);
      row.missing = m.missing || row.missing || [];
      row.items.push({ property, score: m.score, reasons: m.reasons });
    }
  }
  return [...rows.values()]
    .map((r) => ({ ...r, total: r.items.length, items: r.items.sort((a, b) => b.score - a.score).slice(0, perBuyer) }))
    .sort((a, b) => b.best - a.best || b.total - a.total);
}

/**
 * Generates personalized WhatsApp message template based on event type
 * @param {string} eventType 'new_unit' | 'sold_unit' | 'price_drop'
 * @param {Object} client The matched client
 * @param {Object} property The target property
 * @param {Array} alternativeProperties Optional alternatives if unit was sold
 */
export function generateWhatsAppMessage(eventType, client, property, alternativeProperties = []) {
  const clientName = client.name || 'عزيزي العميل';
  const propertyTitle = property.title_ar || property.title_en || 'وحدة عقارية مميزة';
  const areaName = property.locationName_ar || property.locationName_en || 'سوهاج';
  const priceFormatted = (property.price || 0).toLocaleString('en-US');
  // Only the listing's own plan goes to the client; no invented 20% / 60-month figures
  const planLines = [
    ...(() => {
      const s = planSummary(paymentTerms(property), (n) => `${Number(n).toLocaleString('en-US')} ج.م`, true);
      return s ? [s.now ? `💳 ${s.now.label}: ${Number(s.now.amount).toLocaleString('en-US')} ج.م` : '', `📅 الأقساط: ${s.then}`, s.yearly ? `📅 الدفعات السنوية: ${s.yearly}` : ''] : [];
    })(),
  ].filter(Boolean).join('\n');
  const origin = SITE_URL;
  // The link carries the client's id, so the salesperson is told when the client opens it (utils/linkTracking)
  const propertyUrl = trackedListingUrl(origin, property.id, client.id);

  if (eventType === 'new_unit') {
    return `مرحباً أ. ${clientName} 🌸،
معك مستشار شركة 1Line للحلول العقارية بسوهاج.

بناءً على اهتمامك وبحثك السابق عن عقار في سوهاج:
يسرنا إبلاغك بإضافة وحدة جديدة ممتازة تطابق اهتماماتك تماماً:

🏠 العقار: ${propertyTitle}
📍 الموقع: ${areaName}
💰 السعر: ${priceFormatted} ج.م${planLines ? `\n${planLines}` : ''}

📸 يمكنك معاينة تفاصيل الوحدة والصور والموقع على الخريطة عبر الرابط:
${propertyUrl}

هل يناسبكم تحديد موعد للمعاينة على الطبيعة اليوم أو غداً؟`;
  }

  if (eventType === 'sold_unit') {
    let altText = '';
    if (alternativeProperties.length > 0) {
      altText = `\n\nولكن يسعدنا إخبارك بتوفر وحدات بديلة ممتازة بنفس المنطقة والمواصفات:\n` +
        alternativeProperties.slice(0, 2).map((alt) => `🔹 ${alt.title_ar} - بسعر ${(alt.price || 0).toLocaleString('en-US')} ج.م`).join('\n') +
        `\n\nتصفح البدائل: ${origin}/properties`;
    }

    return `مرحباً أ. ${clientName}،
معك إدارة المبيعات بشركة 1Line للحلول العقارية بسوهاج.

نود إحاطتكم علماً بأنه قد تم رسمياً حجز وبيع الوحدة التالية:
🔒 ${propertyTitle} في ${areaName}${altText}

يسعدنا مساعدتك في اختيار وحجز أفضل وحدة بديلة تناسب ميزانيتك. هل تود أن نرسل لك قائمة البدائل المتاحة؟`;
  }

  if (eventType === 'price_drop') {
    return `فرصة استثمارية عاجلة ⚡
مرحباً أ. ${clientName}،
معك مستشار شركة 1Line بسوهاج.

نود إعلامكم بتحديث سعر مميز وتسهيلات دفع استثنائية على الوحدة:
🏠 ${propertyTitle}
📍 ${areaName}
🔥 السعر الجديد: ${priceFormatted} ج.م${property.installmentYears ? ` (تقسيط حتى ${property.installmentYears} سنوات)` : ''}

🔗 رابط المعاينة المباشرة:
${propertyUrl}

الوحدة متاحة بأسبقية الحجز، هل تود تأكيد المعاينة؟`;
  }

  return `مرحباً أ. ${clientName}، نود متابعة طلبك العقاري مع شركة 1Line بسوهاج بخصوص ${propertyTitle}.`;
}
