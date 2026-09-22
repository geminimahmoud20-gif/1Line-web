import { getDynamicWhatsApp, cleanWhatsAppNumber } from './founderCmsData';

// =============================================================
//  ONE LINE REAL ESTATE - INSTANT SALES NOTIFICATION & WEBHOOK HUB
// =============================================================

// Shared unlocked AudioContext singleton for mobile compatibility
let sharedAudioCtx = null;

const getAudioContext = () => {
  if (typeof window === 'undefined') return null;
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;
  if (!sharedAudioCtx || sharedAudioCtx.state === 'closed') {
    sharedAudioCtx = new AudioContextClass();
  }
  if (sharedAudioCtx.state === 'suspended') {
    sharedAudioCtx.resume().catch(() => {});
  }
  return sharedAudioCtx;
};

/**
 * Play a subtle, professional audio notification chime
 */
export const playNotificationChime = (type = 'chime') => {
  try {
    const audioCtx = getAudioContext();
    if (!audioCtx) return;

    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    if (type === 'click') {
      // Subtle micro-click feedback
      osc.type = 'sine';
      osc.frequency.setValueAtTime(640, now);
      osc.frequency.exponentialRampToValueAtTime(800, now + 0.06);

      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start(now);
      osc.stop(now + 0.08);
    } else {
      // Dual-tone harmonic luxury chime (D5 -> A5)
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.14); // A5

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.36);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start(now);
      osc.stop(now + 0.36);
    }
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
