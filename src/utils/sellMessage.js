// The WhatsApp text an owner sends to the team after listing a property: what they filled in, in one message.
const toNum = (v) => String(v ?? '').replace(/\D/g, '');

export const firstName = (name) => String(name || '').trim().split(/\s+/)[0] || '';

export function sellWhatsappMessage({ name, typeLabel, areaLabel, size, address, askingPrice, isAr = true } = {}) {
  const price = Number(toNum(askingPrice));
  const lines = isAr
    ? [
      `أهلاً 1Line، أنا ${String(name || '').trim() || 'صاحب عقار'}. لسه باعت طلب عرض عقاري من الموقع، وده ملخصه:`,
      typeLabel && `• النوع: ${typeLabel}`,
      areaLabel && `• المنطقة: ${areaLabel}`,
      toNum(size) && `• المساحة: ${toNum(size)} م²`,
      String(address || '').trim() && `• العنوان: ${String(address).trim()}`,
      price > 0 && `• السعر المطلوب: ${price.toLocaleString('en-US')} ج.م`,
      'ممكن نكمّل؟'
    ]
    : [
      `Hello 1Line, I'm ${String(name || '').trim() || 'a property owner'}. I just sent a listing request on the site:`,
      typeLabel && `• Type: ${typeLabel}`,
      areaLabel && `• Area: ${areaLabel}`,
      toNum(size) && `• Size: ${toNum(size)} m²`,
      String(address || '').trim() && `• Address: ${String(address).trim()}`,
      price > 0 && `• Asking price: EGP ${price.toLocaleString('en-US')}`,
      'Can we continue?'
    ];
  return lines.filter(Boolean).join('\n');
}
