// =============================================================
//  A listing as a social media post image, drawn on a canvas in the browser:
//    post   1080×1350 (4:5, the tallest a Facebook / Instagram feed shows in full)
//    square 1080×1080
//    story  1080×1920 (9:16)
//  The unit's own photo (plus two more when it has them), the price or the plan, the title, the
//  area, the key facts as chips, and the 1LINE brand with the phone and the site. Photos that refuse
//  to be drawn (no CORS) leave a navy background instead of failing.
// =============================================================
import { paymentTerms, hasInstallmentPlan, installmentsPhrase } from './paymentTerms.js';

export const POST_FORMATS = {
  post: { w: 1080, h: 1350, photo: 0.56, label_ar: 'منشور (4:5)', label_en: 'Post 4:5' },
  square: { w: 1080, h: 1080, photo: 0.5, label_ar: 'مربع', label_en: 'Square' },
  story: { w: 1080, h: 1920, photo: 0.58, label_ar: 'ستوري (9:16)', label_en: 'Story 9:16' }
};

const NAVY = '#0B1B32';
const NAVY_2 = '#13294B';
const GOLD = '#D4AF37';
const money = (n) => Math.round(Number(n) || 0).toLocaleString('en-US');
const TYPE_AR = { apartment: 'شقة', villa: 'فيلا', house: 'منزل', commercial: 'محل تجاري', retail: 'محل تجاري', office: 'مكتب إداري', clinic: 'عيادة', land: 'أرض', building: 'مبنى' };

/** What the price badge says: { label, amount, sub } */
export function priceBadge(p) {
  const t = paymentTerms(p);
  if (hasInstallmentPlan(t)) {
    const resale = t.type === 'resale';
    return t.down > 0
      ? { label: resale ? 'كاش للمالك' : 'المقدم', amount: `${money(t.down)} ج.م`, sub: `+ ${installmentsPhrase(t.periods, t.every)} × ${money(t.amount)}` }
      : { label: 'القسط', amount: `${money(t.amount)} ج.م`, sub: installmentsPhrase(t.periods, t.every) };
  }
  return { label: 'السعر', amount: Number(p.price) > 0 ? `${money(p.price)} ج.م` : 'السعر عند التواصل', sub: Number(p.price) > 0 ? 'كاش' : '' };
}

/** The fact chips: «140 م²», «3 غرف», «2 حمام», «الدور 4», «استلام فوري» */
export function factChips(p) {
  const n = (v) => Number(v) || 0;
  return [
    n(p.size) ? `${n(p.size)} م²` : '',
    n(p.bedrooms) ? `${n(p.bedrooms)} ${n(p.bedrooms) >= 3 && n(p.bedrooms) <= 10 ? 'غرف' : 'غرفة'}` : '',
    n(p.bathrooms) ? `${n(p.bathrooms)} ${n(p.bathrooms) >= 3 && n(p.bathrooms) <= 10 ? 'حمامات' : 'حمام'}` : '',
    n(p.floor) ? `الدور ${n(p.floor)}` : '',
    p.completionStatus === 'ready' ? 'استلام فوري' : (p.deliveryYear ? `استلام ${p.deliveryYear}` : '')
  ].filter(Boolean);
}

const loadImage = (src) => new Promise((resolve) => {
  if (!src) { resolve(null); return; }
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => resolve(img);
  img.onerror = () => resolve(null);
  img.src = src;
});

// Draws `img` to fill the box (cover), centred
function cover(ctx, img, x, y, w, h) {
  const s = Math.max(w / img.width, h / img.height);
  const sw = w / s;
  const sh = h / s;
  ctx.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, x, y, w, h);
}

const roundBox = (ctx, x, y, w, h, r) => {
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') ctx.roundRect(x, y, w, h, r);
  else ctx.rect(x, y, w, h);
};

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

/** Can the photo be drawn and exported? (A photo without CORS taints the canvas.) */
function exportable(canvas) {
  try { canvas.getContext('2d').getImageData(0, 0, 1, 1); return true; } catch { return false; }
}

/**
 * Draws the post and resolves a PNG Blob (null when the browser can't draw one).
 * { property, format: 'post' | 'square' | 'story', areaName, phone, site }
 */
export async function drawListingPost({ property: p, format = 'post', areaName = '', phone = '', site = '1lineestate.com' } = {}) {
  if (typeof document === 'undefined' || !p) return null;
  const F = POST_FORMATS[format] || POST_FORMATS.post;
  const W = F.w;
  const H = F.h;
  try { await document.fonts?.load?.('800 40px Cairo'); await document.fonts?.load?.('600 30px Cairo'); } catch { /* system font */ }
  const font = (w, px) => `${w} ${px}px Cairo, "Segoe UI", Tahoma, sans-serif`;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // ── Photos: the cover, and two more under it when there are, leaving a navy frame ──
  const photos = (Array.isArray(p.images) ? p.images : []).filter((u) => /^https?:\/\//.test(u || '')).slice(0, 3);
  const loaded = (await Promise.all(photos.map(loadImage))).filter(Boolean);
  const photoH = Math.round(H * F.photo);
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, NAVY_2);
  bg.addColorStop(1, NAVY);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  const drawPhotos = (list) => {
    if (!list.length) return;
    if (list.length >= 3 && format !== 'square') {
      const mainH = Math.round(photoH * 0.72);
      cover(ctx, list[0], 0, 0, W, mainH);
      const gap = 8;
      const sw = (W - gap) / 2;
      cover(ctx, list[1], 0, mainH + gap, sw, photoH - mainH - gap);
      cover(ctx, list[2], sw + gap, mainH + gap, sw, photoH - mainH - gap);
    } else {
      cover(ctx, list[0], 0, 0, W, photoH);
    }
  };
  drawPhotos(loaded);
  // A photo served without CORS can't be exported: redraw without photos rather than fail
  if (loaded.length && !exportable(canvas)) {
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);
  }
  // Shade the top for the brand and the bottom of the photo for the price
  const topShade = ctx.createLinearGradient(0, 0, 0, 200);
  topShade.addColorStop(0, 'rgba(11, 27, 50, 0.75)');
  topShade.addColorStop(1, 'rgba(11, 27, 50, 0)');
  ctx.fillStyle = topShade;
  ctx.fillRect(0, 0, W, 200);
  const botShade = ctx.createLinearGradient(0, photoH - 260, 0, photoH);
  botShade.addColorStop(0, 'rgba(11, 27, 50, 0)');
  botShade.addColorStop(1, 'rgba(11, 27, 50, 0.92)');
  ctx.fillStyle = botShade;
  ctx.fillRect(0, photoH - 260, W, 260);

  // ── Brand (top left) and «للبيع» (top right) ──
  const logo = await loadImage('/logo-emblem.png');
  ctx.direction = 'ltr';
  ctx.textAlign = 'left';
  if (logo) ctx.drawImage(logo, 48, 40, 70, 70);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = font(800, 44);
  ctx.fillText('1LINE', logo ? 130 : 48, 92);
  ctx.direction = 'rtl';
  ctx.textAlign = 'right';
  const tag = `${TYPE_AR[p.type] || 'عقار'} للبيع`;
  ctx.font = font(800, 34);
  const tw = ctx.measureText(tag).width + 52;
  ctx.fillStyle = GOLD;
  roundBox(ctx, W - 48 - tw, 44, tw, 62, 31);
  ctx.fill();
  ctx.fillStyle = NAVY;
  ctx.fillText(tag, W - 48 - 26, 88);

  // ── Price badge on the bottom edge of the photo ──
  const badge = priceBadge(p);
  ctx.font = font(800, 62);
  const amountW = ctx.measureText(badge.amount).width;
  ctx.font = font(700, 28);
  const subW = badge.sub ? ctx.measureText(badge.sub).width : 0;
  const bw = Math.min(W - 96, Math.max(amountW, subW) + 80);
  const bh = badge.sub ? 168 : 136;
  const by = photoH - bh + 40;
  ctx.fillStyle = GOLD;
  roundBox(ctx, W - 48 - bw, by, bw, bh, 24);
  ctx.fill();
  ctx.fillStyle = 'rgba(11, 27, 50, 0.75)';
  ctx.font = font(700, 28);
  ctx.fillText(badge.label, W - 48 - 40, by + 42);
  ctx.fillStyle = NAVY;
  ctx.font = font(800, 62);
  ctx.fillText(badge.amount, W - 48 - 40, by + 106);
  if (badge.sub) {
    ctx.font = font(700, 28);
    ctx.fillText(badge.sub, W - 48 - 40, by + 148);
  }

  // ── Title, area, chips ──
  const R = W - 64;
  let y = photoH + 100 + (badge.sub ? 20 : 0);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = font(800, format === 'story' ? 60 : 52);
  for (const l of wrap(ctx, p.title_ar || p.title_en || '', W - 128, 2)) { ctx.fillText(l, R, y); y += format === 'story' ? 76 : 66; }
  const place = String(p.locationName_ar || areaName || '').replace(/\s+/g, ' ').trim();
  if (place) {
    ctx.fillStyle = GOLD;
    ctx.font = font(700, 36);
    ctx.fillText(wrap(ctx, place, W - 128, 1)[0] || '', R, y + 6);
    y += 66;
  }
  const chips = factChips(p);
  if (chips.length) {
    ctx.font = font(700, 32);
    let x = R;
    let rowY = y + 8;
    for (const c of chips) {
      const cw = ctx.measureText(c).width + 44;
      if (x - cw < 64) { x = R; rowY += 72; }
      ctx.strokeStyle = 'rgba(212, 175, 55, 0.65)';
      ctx.lineWidth = 2;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
      roundBox(ctx, x - cw, rowY, cw, 58, 29);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(c, x - 22, rowY + 40);
      x -= cw + 14;
    }
  }

  // ── Footer: phone and site ──
  ctx.fillStyle = 'rgba(212, 175, 55, 0.5)';
  ctx.fillRect(64, H - 128, W - 128, 2);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = font(800, 38);
  if (phone) {
    ctx.direction = 'rtl';
    ctx.textAlign = 'right';
    ctx.fillText('للمعاينة:', R, H - 62);
    const lw = ctx.measureText('للمعاينة: ').width;
    ctx.direction = 'ltr';
    ctx.textAlign = 'right';
    ctx.fillStyle = GOLD;
    ctx.fillText(phone, R - lw, H - 62);
  }
  ctx.direction = 'ltr';
  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
  ctx.font = font(600, 30);
  ctx.fillText(site, 64, H - 62);

  return new Promise((resolve) => {
    try { canvas.toBlob((b) => resolve(b), 'image/png'); } catch { resolve(null); }
  });
}
