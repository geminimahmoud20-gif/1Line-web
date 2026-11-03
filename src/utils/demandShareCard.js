// =============================================================
//  Sharing a buyer request (/demands/<id>): the text that goes with the link on WhatsApp / Telegram /
//  X (demandShareText), and a full post caption (demandCaption). Plain text with no emoji: WhatsApp Web
//  and Facebook turned the old 🔥💰📍 into «�». Pure: tests/unit/demand-share.test.mjs.
// =============================================================

const fmt = (n) => {
  const v = Number(String(n ?? '').replace(/[^\d.]/g, ''));
  return Number.isFinite(v) && v > 0 ? v.toLocaleString('en-US') : '';
};

const PAY = { cash: 'كاش', installments: 'تقسيط', installment: 'تقسيط', both: 'كاش أو تقسيط' };

/** Hashtags from the area and the kind: #عقارات_سوهاج #سوهاج_الجديدة #شقق_للبيع */
export function demandHashtags({ areaName = '', typeLabel = '' } = {}) {
  const tag = (s) => String(s || '').trim().replace(/[()،,.]/g, '').replace(/\s+/g, '_');
  const tags = ['عقارات_سوهاج'];
  if (areaName && !/^محافظة سوهاج$/.test(areaName)) tags.push(tag(areaName));
  if (typeLabel) tags.push(tag(`مطلوب ${typeLabel}`));
  tags.push('1Line');
  return [...new Set(tags.filter(Boolean))].map((t) => `#${t}`).join(' ');
}

/**
 * The post text: what is wanted, the details, the budget, how the buyer pays, a call to owners and
 * brokers, the link, hashtags. `whatsapp`: the company number shown as a way to reach us.
 */
export function demandCaption(dem = {}, { areaName = '', typeLabel = '', url = '', whatsapp = '' } = {}) {
  const budget = fmt(dem.budget);
  const lines = [
    `مطلوب للشراء${typeLabel ? `: ${typeLabel}` : ''}${areaName ? ` في ${areaName}` : ''}`,
    '',
    String(dem.text_ar || '').trim(),
    '',
    budget ? `الميزانية: حتى ${budget} ج.م` : '',
    PAY[dem.paymentMethod] ? `طريقة الدفع: ${PAY[dem.paymentMethod]}` : '',
    Number(dem.minSize) > 0 ? `المساحة: من ${Number(dem.minSize)} م²` : '',
    '',
    'المشتري جاد وموجود دلوقتي. عندك وحدة مناسبة أو تعرف مالك؟',
    whatsapp ? `كلمنا واتساب ${whatsapp} أو ابعت تفاصيل وحدتك من هنا:` : 'ابعت تفاصيل وحدتك من هنا:',
    url,
    '',
    demandHashtags({ areaName, typeLabel })
  ];
  // No empty line twice in a row, none at the start
  return lines.filter((l, i, a) => l !== '' || (i > 0 && a[i - 1] !== '')).join('\n').trim();
}

/** One or two lines for WhatsApp / Telegram / X, ending with a call to open the request */
export function demandShareText(dem = {}, { areaName = '', typeLabel = '' } = {}) {
  const budget = fmt(dem.budget);
  const head = `مطلوب للشراء${typeLabel ? `: ${typeLabel}` : ''}${areaName ? ` في ${areaName}` : ''}${budget ? ` بميزانية حتى ${budget} ج.م` : ''}`;
  return `${head}.\nعندك وحدة مناسبة أو تعرف مالك؟ شوف الطلب وتواصل معانا:`;
}
