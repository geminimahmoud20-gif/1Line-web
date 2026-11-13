// =============================================================
//  ONE LINE REAL ESTATE - SMART WHATSAPP MATCH & RETARGETING ENGINE
// =============================================================

import { normalizeAreaKey, getAreas } from './areasData.js';
import { SITE_URL } from '../config/siteConfig.js';
import { inArea } from './areaLookup.js';
import { isSellerLead, parseMoney } from './crmLeadViews.js';
import { assetClass } from './marketStats.js';
import { matchUnit, hardFit } from './buyerMatch.js';
import { paymentTerms, planSummary } from './paymentTerms.js';

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
/** Out of 100: area 40, kind of property 30, budget 30; below this a buyer is not matched */
export const MATCH_THRESHOLD = 70;

const phoneKey = (phone) => String(phone || '').replace(/[^0-9]/g, '').slice(-10);

/**
 * How well a property fits one buyer (a lead or a buyer request), or null when it clearly doesn't.
 *  - Kind: compared by market class (an «apartment» listing fits a buyer who asked for «residential»,
 *    which is what the website forms save). A different kind is never a match; an unknown kind is neutral.
 *  - Area: the buyer's area, or any area when none was given.
 *  - Budget: the unit must fit the budget. Up to 20% above it is still shown, lower; more is dropped.
 *    A budget written in words or Arabic digits is read ("2 مليون"). No budget is neutral.
 * @returns {{score: number, reasons: string[]} | null}
 */
export function scoreBuyer(property, buyer) {
  const price = parseMoney(property.price);
  const propertyArea = normalizeAreaKey(property.areaKey);
  const propertyClass = property.type ? assetClass({ type: property.type }) : '';
  const buyerClass = buyer.type ? assetClass({ type: buyer.type }) : '';
  const reasons = [];
  let score = 0;

  if (buyerClass && propertyClass && buyerClass !== propertyClass) return null;
  if (buyerClass) { score += 30; reasons.push('نفس نوع العقار'); } else score += 10;

  if (buyer.area) {
    if (propertyArea === 'all' || inArea(propertyArea, buyer.area, getAreas())) { score += 40; reasons.push('نفس المنطقة'); }
  } else {
    score += 20;
  }

  if (buyer.budget > 0 && price > 0) {
    const ratio = price / buyer.budget;
    if (ratio > BUDGET_STRETCH) return null;
    if (ratio <= 1) { score += ratio >= 0.6 ? 30 : 20; reasons.push('داخل الميزانية'); }
    else if (ratio <= 1.1) { score += 20; reasons.push('قريبة من الميزانية'); }
    else { score += 8; reasons.push('أعلى من الميزانية بشوية'); }
  } else {
    score += 10;
  }
  return { score: Math.min(100, score), reasons };
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
    if (lead.status === 'closed' || lead.status === 'lost' || lead.isArchived) return;
    if (isSellerLead(lead)) return;
    const details = lead.details || {};
    const contactPhone = lead.whatsapp || lead.phone;
    if (!contactPhone) return;

    // A buyer who answered «رشّحلي عقاري» left real answers: size, rooms, handover, installments…
    // They are scored the way the website scored them for the buyer, and kind, area, budget and minimum size are firm.
    const answers = details.matchAnswers;
    if (answers && typeof answers === 'object' && answers.kind) {
      const areas = getAreas();
      const hard = hardFit(property, answers, areas);
      if (!hard.kind || !hard.area || !hard.budget || !hard.size) return;
      const fit = matchUnit(property, answers, areas);
      if (fit.score < MATCH_THRESHOLD) return;
      keep({
        id: lead.id,
        name: lead.name || 'عميل 1Line',
        phone: contactPhone,
        whatsapp: contactPhone,
        source: 'قاعدة بيانات العملاء (CRM)',
        score: fit.score,
        reasons: fit.matches,
        leadArea: normalizeAreaKey((answers.areas || [])[0] || ''),
        leadType: answers.kind,
        leadBudget: parseMoney(answers.payment === 'cash' ? answers.budget : answers.down),
        notes: lead.notes || ''
      });
      return;
    }

    // lead.type is the kind of request («buyer», «viewing»…), not of property: only propertyType counts
    const buyer = {
      type: details.propertyType || lead.propertyType || '',
      area: normalizeAreaKey(details.area || lead.area || ''),
      budget: parseMoney(details.budget) || parseMoney(details.expectedPrice) || parseMoney(lead.budget)
    };
    const fit = scoreBuyer(property, buyer);
    if (!fit || fit.score < MATCH_THRESHOLD) return;
    keep({
      id: lead.id,
      name: lead.name || 'عميل 1Line',
      phone: contactPhone,
      whatsapp: contactPhone,
      source: 'قاعدة بيانات العملاء (CRM)',
      score: fit.score,
      reasons: fit.reasons,
      leadArea: buyer.area,
      leadType: buyer.type,
      leadBudget: buyer.budget,
      notes: lead.notes || ''
    });
  });

  // 2. Buyer demands (if a phone is provided)
  demands.forEach((demand) => {
    if (demand.status !== 'published' && demand.status !== 'pending') return;
    const buyer = {
      type: demand.type || '',
      area: normalizeAreaKey(demand.area || ''),
      budget: parseMoney(demand.budget)
    };
    const contactPhone = demand.whatsapp || demand.phone;
    if (!contactPhone) return;
    const fit = scoreBuyer(property, buyer);
    if (!fit || fit.score < MATCH_THRESHOLD) return;
    keep({
      id: demand.id,
      name: demand.clientName || 'مشتري عقار',
      phone: contactPhone,
      whatsapp: contactPhone,
      source: 'طلبات المشترين (Demands)',
      score: fit.score,
      reasons: fit.reasons,
      leadArea: buyer.area,
      leadType: buyer.type,
      leadBudget: buyer.budget,
      notes: demand.text_ar || ''
    });
  });

  // Best score first; among equals the closer budget
  return [...byPhone.values()].sort((a, b) => b.score - a.score || (b.leadBudget || 0) - (a.leadBudget || 0));
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
  const propertyUrl = `${origin}/properties/${property.id}`;

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
