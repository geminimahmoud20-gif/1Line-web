// =============================================================
//  Sharing a buyer request (/demands): a ready-to-post square image and a caption.
//  The image (1080×1080 PNG, drawn on a canvas in the visitor's browser) says what is wanted, where
//  and for how much, so a Facebook / WhatsApp post reads on its own. The caption is plain text with
//  no emoji (WhatsApp Web and Facebook turned the old 🔥💰📍 into «�») and ends with the link to this
//  request. demandCaption is pure (tests/unit/demand-share.test.mjs); drawDemandCard needs a browser.
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

// ── The image ────────────────────────────────────────────────────────────────────────────
const SIZE = 1080;
const NAVY = '#0B1B32';
const GOLD = '#D4AF37';

function wrap(ctx, text, maxWidth, maxLines) {
  const words = String(text || '').replace(/\s+/g, ' ').trim().split(' ');
  const lines = [];
  let line = '';
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (ctx.measureText(next).width <= maxWidth) { line = next; continue; }
    if (line) lines.push(line);
    line = w;
    if (lines.length === maxLines) break;
  }
  if (line && lines.length < maxLines) lines.push(line);
  if (lines.length === maxLines && words.join(' ').length > lines.join(' ').length) {
    lines[maxLines - 1] = `${lines[maxLines - 1].replace(/\s+\S*$/, '')}…`;
  }
  return lines;
}

// A rounded rectangle path (plain rectangle on browsers without roundRect)
const box = (ctx, x, y, w, h, r) => (typeof ctx.roundRect === 'function' ? ctx.roundRect(x, y, w, h, r) : ctx.rect(x, y, w, h));

const loadImage = (src) => new Promise((resolve) => {
  const img = new Image();
  img.onload = () => resolve(img);
  img.onerror = () => resolve(null);
  img.src = src;
});

/**
 * Draws the request card and resolves a PNG Blob (null when the browser can't draw it).
 * { typeLabel, areaName, budget, text, payment, site }
 */
export async function drawDemandCard({ typeLabel = '', areaName = '', budget = '', text = '', payment = '', site = '1lineestate.com' } = {}) {
  if (typeof document === 'undefined') return null;
  try { await document.fonts?.load?.('800 40px Cairo'); await document.fonts?.load?.('600 30px Cairo'); } catch { /* system font */ }
  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const font = (w, px) => `${w} ${px}px Cairo, "Segoe UI", Tahoma, sans-serif`;
  const R = SIZE - 90; // right edge for RTL text
  ctx.direction = 'rtl';
  ctx.textAlign = 'right';

  // Background and frame
  const g = ctx.createLinearGradient(0, 0, SIZE, SIZE);
  g.addColorStop(0, '#13294B');
  g.addColorStop(1, NAVY);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, SIZE, SIZE);
  ctx.strokeStyle = 'rgba(212, 175, 55, 0.55)';
  ctx.lineWidth = 3;
  ctx.strokeRect(40, 40, SIZE - 80, SIZE - 80);

  // Brand
  const logo = await loadImage('/logo-emblem.png');
  if (logo) ctx.drawImage(logo, 90, 78, 76, 76);
  ctx.textAlign = 'left';
  ctx.direction = 'ltr';
  ctx.fillStyle = '#FFFFFF';
  ctx.font = font(800, 44);
  ctx.fillText('1LINE', logo ? 180 : 90, 132);
  ctx.direction = 'rtl';
  ctx.textAlign = 'right';

  // Ribbon: «مطلوب للشراء»
  ctx.font = font(800, 34);
  const ribbon = 'مطلوب للشراء';
  const rw = ctx.measureText(ribbon).width + 56;
  ctx.fillStyle = GOLD;
  ctx.beginPath();
  box(ctx, R - rw, 84, rw, 64, 32);
  ctx.fill();
  ctx.fillStyle = NAVY;
  ctx.fillText(ribbon, R - 28, 129);

  // What and where
  let y = 260;
  ctx.fillStyle = '#FFFFFF';
  ctx.font = font(800, 72);
  for (const l of wrap(ctx, typeLabel || 'عقار', SIZE - 180, 2)) { ctx.fillText(l, R, y); y += 88; }
  if (areaName) {
    ctx.fillStyle = GOLD;
    ctx.font = font(700, 46);
    ctx.fillText(`في ${areaName}`, R, y);
    y += 80;
  }

  // The request itself
  ctx.fillStyle = 'rgba(255, 255, 255, 0.86)';
  ctx.font = font(600, 36);
  for (const l of wrap(ctx, text, SIZE - 180, 4)) { ctx.fillText(l, R, y); y += 56; }

  // Budget box
  const boxY = Math.max(y + 30, 700);
  ctx.fillStyle = 'rgba(212, 175, 55, 0.12)';
  ctx.strokeStyle = 'rgba(212, 175, 55, 0.6)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  box(ctx, 90, boxY, SIZE - 180, 150, 24);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
  ctx.font = font(600, 32);
  ctx.fillText(payment ? `الميزانية · ${payment}` : 'الميزانية', R - 30, boxY + 52);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = font(800, 60);
  ctx.fillText(budget ? `حتى ${budget} ج.م` : 'حسب المعروض', R - 30, boxY + 122);

  // Call to action and site
  ctx.fillStyle = GOLD;
  ctx.font = font(700, 34);
  ctx.fillText('عندك وحدة مناسبة؟ كلمنا', R, SIZE - 92);
  ctx.textAlign = 'left';
  ctx.direction = 'ltr';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
  ctx.font = font(600, 30);
  ctx.fillText(site, 90, SIZE - 92);

  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), 'image/png'));
}
