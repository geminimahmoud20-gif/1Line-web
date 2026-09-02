// =============================================================
//  ONE LINE REAL ESTATE - SMART WHATSAPP MATCH & RETARGETING ENGINE
// =============================================================

import { SOHAG_AREAS } from '../data/propertiesData';

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

/**
 * Finds all leads and demands matching a given property
 * @param {Object} property The property being added, sold, or updated
 * @param {Array} leads Registered CRM leads
 * @param {Array} demands Public/Office buyer demands
 * @returns {Array} List of matched client profiles with calculated match score
 */
export function findMatchingClientsForProperty(property, leads = [], demands = []) {
  if (!property) return [];

  const matched = [];
  const propertyPrice = typeof property.price === 'number' ? property.price : parseInt(String(property.price).replace(/,/g, '')) || 0;
  const propertyArea = property.areaKey || '';
  const propertyType = property.type || '';

  // 1. Match with CRM Leads
  leads.forEach((lead) => {
    // Only target active buyers or special requests
    if (lead.status === 'closed' || lead.status === 'lost') return;

    let score = 50; // base score
    const details = lead.details || {};
    const leadArea = details.area || lead.area || '';
    const leadType = details.propertyType || lead.type || '';
    const leadBudget = parseInt(String(details.budget || details.expectedPrice || lead.budget || 0).replace(/[^0-9]/g, '')) || 0;

    // Area Match (+30)
    if (leadArea && (leadArea === propertyArea || leadArea === 'all')) {
      score += 30;
    }

    // Property Type Match (+20)
    if (leadType && (leadType === propertyType || leadType === 'all')) {
      score += 20;
    }

    // Budget Tolerance (within ±25%) (+20)
    if (leadBudget > 0 && propertyPrice > 0) {
      const minBudget = propertyPrice * 0.75;
      const maxBudget = propertyPrice * 1.25;
      if (leadBudget >= minBudget && leadBudget <= maxBudget) {
        score += 20;
      }
    }

    // Must have a valid phone number
    const contactPhone = lead.whatsapp || lead.phone;
    if (score >= 60 && contactPhone) {
      matched.push({
        id: lead.id,
        name: lead.name || 'عميل 1Line',
        phone: contactPhone,
        whatsapp: contactPhone,
        source: 'قاعدة بيانات العملاء (CRM)',
        score: Math.min(100, score),
        leadArea,
        leadType,
        leadBudget,
        notes: lead.notes || ''
      });
    }
  });

  // 2. Match with Buyer Demands (if phone is provided)
  demands.forEach((demand) => {
    if (demand.status !== 'published' && demand.status !== 'pending') return;

    let score = 50;
    const demandArea = demand.area || '';
    const demandType = demand.type || '';
    const demandBudget = typeof demand.budget === 'number' ? demand.budget : parseInt(String(demand.budget).replace(/,/g, '')) || 0;

    if (demandArea && (demandArea === propertyArea || demandArea === 'all')) {
      score += 30;
    }
    if (demandType && (demandType === propertyType || demandType === 'all')) {
      score += 20;
    }
    if (demandBudget > 0 && propertyPrice > 0) {
      const minBudget = propertyPrice * 0.75;
      const maxBudget = propertyPrice * 1.25;
      if (demandBudget >= minBudget && demandBudget <= maxBudget) {
        score += 20;
      }
    }

    const contactPhone = demand.whatsapp || demand.phone;
    if (score >= 60 && contactPhone) {
      // Avoid duplicates if same phone exists
      const exists = matched.some(m => m.phone === contactPhone);
      if (!exists) {
        matched.push({
          id: demand.id,
          name: demand.clientName || 'مشتري عقار',
          phone: contactPhone,
          whatsapp: contactPhone,
          source: 'طلبات المشترين (Demands)',
          score: Math.min(100, score),
          leadArea: demandArea,
          leadType: demandType,
          leadBudget: demandBudget,
          notes: demand.text_ar || ''
        });
      }
    }
  });

  // Sort descending by match score
  return matched.sort((a, b) => b.score - a.score);
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
  const priceFormatted = (property.price || 0).toLocaleString();
  const downPaymentFormatted = (property.downPayment || Math.round((property.price || 0) * 0.2)).toLocaleString();
  const installmentFormatted = (property.monthlyInstallment || Math.round(((property.price || 0) * 0.8) / 60)).toLocaleString();
  const propertyUrl = `${window.location.origin}/properties/${property.id}`;

  if (eventType === 'new_unit') {
    return `مرحباً أ. ${clientName} 🌸،
معك مستشار شركة 1Line للحلول العقارية بسوهاج.

بناءً على اهتمامك وبحثك السابق عن عقار في سوهاج:
يسرنا إبلاغك بإضافة وحدة جديدة ممتازة تطابق اهتماماتك تماماً:

🏠 العقار: ${propertyTitle}
📍 الموقع: ${areaName}
💰 السعر: ${priceFormatted} ج.م
💳 المقدم: ${downPaymentFormatted} ج.م
📅 القسط الشهري: ${installmentFormatted} ج.م

📸 يمكنك معاينة تفاصيل الوحدة والصور والموقع على الخريطة عبر الرابط:
${propertyUrl}

هل يناسبكم تحديد موعد للمعاينة على الطبيعة اليوم أو غداً؟`;
  }

  if (eventType === 'sold_unit') {
    let altText = '';
    if (alternativeProperties.length > 0) {
      altText = `\n\nولكن يسعدنا إخبارك بتوفر وحدات بديلة ممتازة بنفس المنطقة والمواصفات:\n` +
        alternativeProperties.slice(0, 2).map((alt, i) => `🔹 ${alt.title_ar} - بسعر ${(alt.price || 0).toLocaleString()} ج.م`).join('\n') +
        `\n\nتصفح البدائل: ${window.location.origin}/properties`;
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
🔥 السعر الجديد: ${priceFormatted} ج.م (تسهيلات سداد حتى ${property.installmentYears || 5} سنوات)

🔗 رابط المعاينة المباشرة:
${propertyUrl}

الوحدة متاحة بأسبقية الحجز، هل تود تأكيد المعاينة؟`;
  }

  return `مرحباً أ. ${clientName}، نود متابعة طلبك العقاري مع شركة 1Line بسوهاج بخصوص ${propertyTitle}.`;
}
