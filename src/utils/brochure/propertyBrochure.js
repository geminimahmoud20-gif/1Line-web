// =============================================================
//  Property brochure PDF — Arabic, one A4 page.
//
//  The page is laid out in HTML (so Arabic shapes correctly), drawn to one image, and that
//  image is the whole PDF page: the logo watermark is part of the same pixels as the text and
//  photo, so there is no separate layer or object a PDF editor can select and delete. The file
//  is also locked against editing and copying (print only).
// =============================================================

import { brochureData } from './brochureData.js';
import { getDynamicPhone, getDynamicWhatsApp } from '../founderCmsData.js';
import { CONTACT, BRAND, SITE_URL } from '../../config/siteConfig.js';

const W = 794; // A4 at 96 dpi
const H = 1123;
const NAVY = '#0B1B32';
const GOLD = '#C9A15A';
const GOLD_LIGHT = '#E9D29A';
const INK = '#1E293B';
const MUTED = '#5B6577';
const FONT = "'IBM Plex Sans Arabic', 'Cairo', 'Segoe UI', Tahoma, sans-serif";

/** Tiny element helper: text always goes through textContent (listing data is never parsed as HTML) */
function h(tag, style = {}, children = []) {
  const el = document.createElement(tag);
  Object.assign(el.style, style);
  for (const c of [].concat(children)) {
    if (c == null || c === false || c === '') continue;
    el.append(typeof c === 'string' ? document.createTextNode(c) : c);
  }
  return el;
}

/** A remote photo as a data URL, so drawing the page never hits a cross-origin block */
async function toDataUrl(url) {
  if (!url) return '';
  if (url.startsWith('data:')) return url;
  try {
    const res = await fetch(url, { mode: 'cors' });
    if (!res.ok) return '';
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result || ''));
      r.onerror = () => resolve('');
      r.readAsDataURL(blob);
    });
  } catch {
    return '';
  }
}

const loadImage = (src) => new Promise((resolve) => {
  if (!src) return resolve(null);
  const img = new Image();
  img.onload = () => resolve(img);
  img.onerror = () => resolve(null);
  img.src = src;
});

function watermark(logo) {
  // A diagonal grid of logos over the whole page, on top of the content, plus one large mark
  const layer = h('div', { position: 'absolute', inset: '0', overflow: 'hidden', pointerEvents: 'none', zIndex: '5' });
  const grid = h('div', {
    position: 'absolute', left: '-30%', top: '-30%', width: '160%', height: '160%',
    display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gridAutoRows: '170px',
    alignItems: 'center', justifyItems: 'center', transform: 'rotate(-28deg)', opacity: '0.11'
  });
  for (let i = 0; i < 72; i++) {
    grid.append(h('div', { display: 'flex', alignItems: 'center', gap: '8px', direction: 'ltr' }, [
      logo ? h('img', { width: '46px', height: '46px' }) : null,
      h('span', { font: `800 22px ${FONT}`, color: NAVY, letterSpacing: '1px' }, '1Line')
    ]));
    if (logo) grid.lastChild.firstChild.src = logo;
  }
  layer.append(grid);
  if (logo) {
    const big = h('img', { position: 'absolute', left: '50%', top: '52%', width: '420px', height: '420px', transform: 'translate(-50%, -50%)', opacity: '0.09' });
    big.src = logo;
    layer.append(big);
  }
  return layer;
}

function buildPage(d, { photo, logo, qr }) {
  const page = h('div', {
    position: 'relative', width: `${W}px`, height: `${H}px`, overflow: 'hidden', direction: 'rtl',
    background: '#FFFFFF', color: INK, font: `400 14px ${FONT}`, boxSizing: 'border-box',
    display: 'flex', flexDirection: 'column'
  });
  const body = h('div', { flex: '1', minHeight: '0', overflow: 'hidden', paddingBottom: '14px' });

  // Header
  const brand = h('div', { display: 'flex', alignItems: 'center', gap: '12px' }, [
    logo ? Object.assign(h('img', { width: '54px', height: '54px', borderRadius: '12px', background: '#FFFFFF', padding: '4px' }), { src: logo }) : null,
    h('div', {}, [
      h('div', { font: `800 22px ${FONT}`, color: '#FFFFFF' }, BRAND.name_ar),
      h('div', { font: `500 12.5px ${FONT}`, color: GOLD_LIGHT, marginTop: '2px' }, 'وساطة واستشارات عقارية في سوهاج والقاهرة')
    ])
  ]);
  const meta = h('div', { textAlign: 'left', font: `500 12.5px ${FONT}`, color: 'rgba(255,255,255,0.85)', lineHeight: '1.8' }, [
    h('div', {}, ['كود الوحدة: ', h('b', { color: GOLD_LIGHT, direction: 'ltr', unicodeBidi: 'embed' }, d.code)]),
    h('div', {}, `تاريخ الإصدار: ${d.issued}`)
  ]);
  page.append(h('div', {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '22px 36px',
    background: `linear-gradient(135deg, ${NAVY}, #1B3561)`, borderBottom: `4px solid ${GOLD}`
  }, [brand, meta]));

  // Photo
  const hero = h('div', { position: 'relative', height: d.description ? '286px' : '320px', margin: '22px 36px 0', borderRadius: '16px', overflow: 'hidden', background: `linear-gradient(135deg, #16294A, ${NAVY})` });
  if (photo) {
    const img = h('img', { width: '100%', height: '100%', objectFit: 'cover', display: 'block' });
    img.src = photo;
    hero.append(img);
  } else {
    hero.append(h('div', { position: 'absolute', inset: '0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: GOLD_LIGHT, font: `600 18px ${FONT}` }, 'الصور متاحة عند الطلب'));
  }
  if (d.price?.discount) {
    hero.append(h('div', {
      position: 'absolute', top: '16px', right: '16px', padding: '8px 16px', borderRadius: '999px',
      background: 'linear-gradient(135deg, #2F9E6E, #1E6B4C)', color: '#FFFFFF', font: `800 16px ${FONT}`
    }, `عرض حصري: خصم ${d.price.discount}`));
  }
  body.append(hero);

  // Title + location
  body.append(h('div', { padding: '20px 36px 0' }, [
    h('div', { font: `800 26px ${FONT}`, color: NAVY, lineHeight: '1.45' }, d.title),
    d.location ? h('div', { font: `500 15px ${FONT}`, color: MUTED, marginTop: '4px' }, `📍 ${d.location}`) : null
  ]));

  // Price
  if (d.price) {
    const priceBox = h('div', {
      margin: '16px 36px 0', padding: '16px 20px', borderRadius: '14px', background: '#FBF6EC',
      border: `1px solid ${GOLD_LIGHT}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px'
    }, [
      h('div', {}, [
        h('div', { font: `600 13px ${FONT}`, color: MUTED }, d.price.discount ? 'سعر الوحدة بعد الخصم (كاش)' : 'السعر (كاش)'),
        h('div', { font: `800 30px ${FONT}`, color: NAVY, direction: 'rtl' }, d.price.now),
        d.price.was ? h('div', { font: `500 13px ${FONT}`, color: '#8A94A6' }, ['بدلاً من ', h('s', {}, d.price.was)]) : null
      ]),
      d.price.discount ? h('div', { textAlign: 'center', padding: '10px 16px', borderRadius: '12px', background: NAVY, color: '#FFFFFF' }, [
        h('div', { font: `500 12px ${FONT}`, color: 'rgba(255,255,255,0.8)' }, 'قيمة الخصم المباشر'),
        h('div', { font: `800 20px ${FONT}`, color: GOLD_LIGHT }, d.price.discount),
        h('div', { font: `500 11.5px ${FONT}`, color: 'rgba(255,255,255,0.75)', marginTop: '2px' }, `العرض ساري حتى ${d.price.until}`)
      ]) : null
    ]);
    body.append(priceBox);
  }
  if (d.plan) {
    body.append(h('div', { margin: '10px 36px 0', font: `500 13.5px ${FONT}`, color: INK }, [
      h('b', { color: NAVY }, 'متاح تقسيط لهذه الوحدة: '),
      [d.plan.down && `مقدم ${d.plan.down}`, `قسط شهري ${d.plan.monthly}`, `لمدة ${d.plan.years}`].filter(Boolean).join(' • ')
    ]));
  }

  // Specs + legal side by side
  const specs = d.specs.length ? h('div', { flex: '1.25' }, [
    h('div', { font: `800 16px ${FONT}`, color: NAVY, marginBottom: '8px', borderBottom: `2px solid ${GOLD_LIGHT}`, paddingBottom: '6px' }, 'مواصفات الوحدة'),
    h('div', { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }, d.specs.map(([k, v]) => h('div', {
      padding: '8px 12px', borderRadius: '10px', background: '#F4F6FA'
    }, [h('div', { font: `500 11.5px ${FONT}`, color: MUTED }, k), h('div', { font: `700 15px ${FONT}`, color: INK }, v)])))
  ]) : null;

  const legalRows = d.legal.length
    ? d.legal.map(([k, v]) => h('div', { font: `500 12.5px ${FONT}`, lineHeight: '1.7' }, [h('b', { color: NAVY }, `${k}: `), v]))
    : [h('div', { font: `500 12.5px ${FONT}`, lineHeight: '1.7' }, 'ملخص المراجعة القانونية والمستندات متاح عند الطلب قبل أي حجز.')];
  const legal = h('div', { flex: '1', padding: '12px 14px', borderRadius: '12px', background: '#F0FBF5', border: '1px solid #A7E3C6' }, [
    h('div', { font: `800 16px ${FONT}`, color: '#1E6B4C', marginBottom: '6px' }, 'الموقف القانوني'),
    ...legalRows,
    h('div', { font: `500 11px ${FONT}`, color: MUTED, marginTop: '6px', lineHeight: '1.6' }, 'هذا الملخص لا يغني عن مراجعة محاميك وإجراءات الشهر العقاري.')
  ]);
  body.append(h('div', { display: 'flex', gap: '18px', margin: '16px 36px 0', alignItems: 'flex-start' }, [specs, legal]));

  if (d.description) {
    body.append(h('div', { margin: '12px 36px 0', font: `400 13.5px ${FONT}`, color: INK, lineHeight: '1.85' }, d.description));
  }

  // Footer
  const contact = h('div', { font: `500 13.5px ${FONT}`, lineHeight: '1.9', color: '#FFFFFF' }, [
    h('div', { font: `800 16px ${FONT}`, color: GOLD_LIGHT, marginBottom: '2px' }, 'لحجز معاينة أو الاستفسار'),
    h('div', {}, ['هاتف: ', h('span', { direction: 'ltr', unicodeBidi: 'embed' }, getDynamicPhone())]),
    h('div', {}, ['واتساب: ', h('span', { direction: 'ltr', unicodeBidi: 'embed' }, `+${String(getDynamicWhatsApp()).replace(/^\+/, '')}`)]),
    h('div', {}, `العنوان: ${CONTACT.address_ar}`)
  ]);
  const qrBox = qr ? h('div', { textAlign: 'center' }, [
    Object.assign(h('img', { width: '104px', height: '104px', background: '#FFFFFF', padding: '6px', borderRadius: '10px' }), { src: qr }),
    h('div', { font: `500 11px ${FONT}`, color: 'rgba(255,255,255,0.8)', marginTop: '4px' }, 'امسح لفتح صفحة الوحدة')
  ]) : null;
  page.append(body);
  page.append(h('div', {
    flexShrink: '0', padding: '18px 36px', display: 'flex',
    alignItems: 'center', justifyContent: 'space-between', background: NAVY, borderTop: `4px solid ${GOLD}`
  }, [contact, qrBox]));

  page.append(watermark(logo));
  return page;
}

/**
 * Builds the brochure and downloads it. Resolves to the file name.
 * (The second argument is kept for older callers; the brochure is Arabic only.)
 */
export async function generatePropertyPdf(property) {
  const [{ jsPDF }, { default: html2canvas }, QR] = await Promise.all([
    import('jspdf'),
    import('html2canvas'),
    import('qrcode')
  ]);
  const d = brochureData(property, { siteUrl: SITE_URL });
  const [photo, logoImg] = await Promise.all([toDataUrl(d.image), loadImage('/logo-emblem.png')]);
  const logo = logoImg ? '/logo-emblem.png' : '';
  const qr = d.url ? await QR.toDataURL(d.url, { margin: 0, width: 220, color: { dark: NAVY, light: '#FFFFFF' } }) : '';

  const host = h('div', { position: 'fixed', left: '-10000px', top: '0', width: `${W}px`, height: `${H}px`, zIndex: '-1' });
  host.append(buildPage(d, { photo, logo, qr }));
  document.body.append(host);
  try {
    if (document.fonts?.ready) await document.fonts.ready;
    await Promise.all([...host.querySelectorAll('img')].map((img) => (img.complete ? null : new Promise((r) => { img.onload = r; img.onerror = r; }))));
    const canvas = await html2canvas(host.firstChild, { scale: 2, backgroundColor: '#FFFFFF', useCORS: true, logging: false, width: W, height: H });

    // Locked file: anyone can open and print it; editing, copying and form changes need a password
    // nobody has (generated here and thrown away)
    const owner = Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, '0')).join('');
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', encryption: { userPassword: '', ownerPassword: owner, userPermissions: ['print'] } });
    // File properties in Latin script: the PDF metadata encoding garbles Arabic
    pdf.setProperties({ title: `1Line property brochure ${d.code}`, author: BRAND.name_en, creator: BRAND.name_en, subject: `Unit ${d.code}` });
    pdf.addImage(canvas.toDataURL('image/jpeg', 0.9), 'JPEG', 0, 0, 210, 297, undefined, 'FAST');
    const filename = `1Line_${d.code.replace(/[^\w-]+/g, '_')}.pdf`;
    pdf.save(filename);
    return filename;
  } finally {
    host.remove();
  }
}
