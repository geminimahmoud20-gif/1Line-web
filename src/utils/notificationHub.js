import { getDynamicWhatsApp, cleanWhatsAppNumber } from './founderCmsData';

// =============================================================
//  ONE LINE REAL ESTATE - INSTANT SALES NOTIFICATION & WEBHOOK HUB
// =============================================================

/**
 * Play a subtle, professional audio notification chime
 */
export const playNotificationChime = () => {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
    osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.15); // A5

    gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.35);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start();
    osc.stop(audioCtx.currentTime + 0.35);
  } catch (e) {
    // AudioContext blocked by browser policy until user interaction
  }
};

/**
 * Generate a formatted alert message for Telegram/WhatsApp sales broadcast
 */
export const formatSalesAlert = (lead, lang = 'ar') => {
  const isAr = lang === 'ar';
  const typeMap = {
    buyer: 'طلب شراء عقار',
    seller: 'طلب بيع / تقييم عقار',
    investor: 'مستثمر / كبار عملاء',
    broker: 'شريك وسيط جديد',
    callback_request: 'طلب اتصال سريع',
    deposit: 'جدية حجز وحدة عقارية',
    special_request: 'طلب عقاري بمواصفات استثنائية'
  };

  const typeName = typeMap[lead.type] || lead.type;

  return `*🚨 تنبيه عميل جديد - منصة 1Line سوهاج*
----------------------------------------
👤 *الاسم:* ${lead.name || 'عميل'}
📱 *الهاتف:* ${lead.phone || '-'}
💬 *واتساب:* ${lead.whatsapp || lead.phone || '-'}
🏷️ *نوع الطلب:* ${typeName}
📍 *المنطقة:* ${lead.details?.area || 'سوهاج'}
💰 *الميزانية:* ${lead.details?.budget || lead.details?.expectedPrice || '-'}
📝 *ملاحظات:* ${lead.notes || '-'}
🕒 *التوقيت:* ${new Date(lead.timestamp || Date.now()).toLocaleTimeString('ar-EG')}
----------------------------------------
⚡ يرجى التواصل مع العميل خلال 5 دقائق لإتمام الحجز.`;
};

/**
 * Generate formatted client confirmation message for direct WhatsApp follow-up
 */
export const formatClientAutoResponder = (lead, lang = 'ar') => {
  const isAr = lang === 'ar';
  const clientName = lead.name || (isAr ? 'عميلنا العزيز' : 'Dear Client');
  const refCode = lead.id || `REQ-${Math.floor(100000 + Math.random() * 900000)}`;

  if (isAr) {
    return `أهلاً بك أ. ${clientName} في منصة 1Line العقارية بسوهاج 🏢
تم تسجيل طلبك بنجاح برقم مرجعي: [${refCode}]
مستشارك العقاري سيتواصل معك هاتفياً لمساعدتك وتوفير أفضل الفرص المتاحة فوراً.`;
  }

  return `Hello ${clientName}, welcome to 1Line Real Estate Sohag.
Your request is logged with Reference Code: [${refCode}].
Our advisor will contact you shortly.`;
};

/**
 * Standard Webhook Payload Formatter (Compatible with Twilio, Meta WhatsApp Cloud API, Make, Zapier)
 */
export const generateWebhookPayload = (eventType, data) => {
  return {
    event: eventType,
    timestamp: new Date().toISOString(),
    source: '1line_sohag_platform',
    version: '2026.1',
    data: {
      ...data,
      platform_metadata: {
        agent: '1Line AI Lead Router',
        region: 'Sohag, Egypt'
      }
    }
  };
};

/**
 * Dispatch webhook event asynchronously (fire-and-forget)
 */
export const dispatchWebhookEvent = async (eventType, data) => {
  const webhookUrl = localStorage.getItem('oneline_crm_webhook_url');
  if (!webhookUrl || typeof webhookUrl !== 'string' || !webhookUrl.startsWith('http')) {
    return false;
  }

  try {
    const payload = generateWebhookPayload(eventType, data);
    fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-1Line-Event': eventType
      },
      body: JSON.stringify(payload)
    }).catch(() => {});
    return true;
  } catch (err) {
    return false;
  }
};

/**
 * Direct forward to Telegram or WhatsApp sales team
 */
export const forwardLeadToSalesWhatsApp = (lead, salesPhoneNumber = null) => {
  const phone = salesPhoneNumber ? cleanWhatsAppNumber(salesPhoneNumber) : getDynamicWhatsApp();
  const text = formatSalesAlert(lead);
  const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
  window.open(waUrl, '_blank');
};
