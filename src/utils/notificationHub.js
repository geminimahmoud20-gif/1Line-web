// =============================================================
//  ONE LINE REAL ESTATE - INSTANT SALES NOTIFICATION HUB
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
    callback_request: 'طلب اتصال سريع'
  };

  const typeName = typeMap[lead.type] || lead.type;

  return `*🚨 تنبيه عميل جديد - منصة ون لاين سوهاج*
----------------------------------------
👤 *الاسم:* ${lead.name || 'عميل'}
📱 *الهاتف:* ${lead.phone || '-'}
💬 *واتساب:* ${lead.whatsapp || lead.phone || '-'}
🏷️ *نوع الطلب:* ${typeName}
📝 *ملاحظات:* ${lead.notes || '-'}
🕒 *التوقيت:* ${new Date(lead.timestamp || Date.now()).toLocaleTimeString('ar-EG')}
----------------------------------------
⚡ يرجى التواصل مع العميل خلال 5 دقائق لإتمام الحجز.`;
};

/**
 * Direct forward to Telegram or WhatsApp sales team
 */
export const forwardLeadToSalesWhatsApp = (lead, salesPhoneNumber = '201012345678') => {
  const text = formatSalesAlert(lead);
  const waUrl = `https://wa.me/${salesPhoneNumber}?text=${encodeURIComponent(text)}`;
  window.open(waUrl, '_blank');
};
