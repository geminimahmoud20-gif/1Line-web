import { SITE_URL, LEGAL_IDS, BRAND, CONTACT } from '../config/siteConfig.js';
import { getDynamicPhone } from './founderCmsData.js';

// The reservation form (CRM → استوديو العقود). It used to be drawn with jsPDF, whose built-in fonts
// have no Arabic letters, so the buyer's name and the unit printed as garbage, and missing fields
// were filled with sample values (3,500,000 EGP, 165 m², 35,000 a month, "VERIFIED & ACTIVE").
// It is now an Arabic page the browser prints or saves as PDF; a missing value prints as a blank
// line to fill in by hand, never a made-up one.

const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const BLANK = '..............................';
const money = (n) => (Number(n) > 0 ? `${Math.round(Number(n)).toLocaleString('en-US')} ج.م` : BLANK);
const text = (v) => (String(v ?? '').trim() ? esc(v) : BLANK);

/** The form as a full HTML document (pure, so it can be tested) */
export function buildReservationHtml(data = {}, { now = new Date() } = {}) {
  const p = data.property || {};
  const date = data.contractDate || now.toLocaleDateString('ar-EG-u-nu-latn', { year: 'numeric', month: 'long', day: 'numeric' });
  const legal = [
    LEGAL_IDS.commercialRegistry && `سجل تجاري: ${esc(LEGAL_IDS.commercialRegistry)}`,
    LEGAL_IDS.taxCard && `بطاقة ضريبية: ${esc(LEGAL_IDS.taxCard)}`
  ].filter(Boolean).join(' • ');
  const row = (label, value) => `<tr><th>${label}</th><td>${value}</td></tr>`;
  return `<!doctype html>
<html lang="ar" dir="rtl"><head><meta charset="utf-8">
<title>استمارة حجز وحدة${data.buyerName ? ` - ${esc(data.buyerName)}` : ''}</title>
<style>
  @page { size: A4; margin: 14mm; }
  * { box-sizing: border-box; }
  body { font-family: 'Cairo', 'Segoe UI', Tahoma, Arial, sans-serif; color: #0f172a; margin: 0; font-size: 13px; line-height: 1.7; }
  header { display: flex; justify-content: space-between; gap: 16px; border-bottom: 3px solid #b8892e; padding-bottom: 10px; margin-bottom: 14px; }
  header h1 { font-size: 18px; margin: 0; }
  header small { color: #475569; display: block; }
  h2 { font-size: 15px; text-align: center; margin: 4px 0 2px; }
  .sub { text-align: center; color: #64748b; margin: 0 0 12px; }
  section { border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px 12px; margin-bottom: 10px; break-inside: avoid; }
  section h3 { font-size: 13px; margin: 0 0 6px; color: #0b1b32; }
  table { width: 100%; border-collapse: collapse; }
  th { text-align: right; font-weight: 600; color: #475569; width: 34%; padding: 3px 0; vertical-align: top; }
  td { padding: 3px 0; }
  ol { margin: 0; padding-inline-start: 18px; }
  .sign { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 18px; }
  .sign div { border-top: 1px solid #94a3b8; padding-top: 6px; min-height: 70px; }
  footer { margin-top: 16px; font-size: 11px; color: #64748b; text-align: center; }
  .ltr { direction: ltr; unicode-bidi: embed; }
</style></head>
<body>
<header>
  <div><h1>${esc(BRAND.name_ar)}</h1><small>${esc(CONTACT.address_ar)}</small></div>
  <div><small>التاريخ: ${esc(date)}</small>${data.transactionRef ? `<small>رقم العملية: <span class="ltr">${esc(data.transactionRef)}</span></small>` : ''}</div>
</header>
<h2>استمارة حجز وحدة وإيصال جدية حجز</h2>
<p class="sub">مسودة للتوقيع، ماتبقاش سارية إلا بتوقيع الطرفين وختم الشركة</p>

<section><h3>١. بيانات المشتري</h3><table>
${row('الاسم', text(data.buyerName))}
${row('الرقم القومي', text(data.buyerNationalId))}
${row('التليفون', data.buyerPhone ? `<span class="ltr">${esc(data.buyerPhone)}</span>` : BLANK)}
${row('العنوان', text(data.buyerAddress))}
</table></section>

<section><h3>٢. بيانات الوحدة</h3><table>
${row('الوحدة', text(p.title_ar || p.title_en))}
${row('الموقع', text(p.locationName_ar || p.locationName_en))}
${row('المساحة', Number(p.size) > 0 ? `${esc(p.size)} م²` : BLANK)}
${p.id ? row('كود الوحدة', `<span class="ltr">${esc(String(p.id).toUpperCase())}</span>`) : ''}
</table></section>

<section><h3>٣. المبالغ</h3><table>
${row('إجمالي الثمن المتفق عليه', money(p.price))}
${row('مبلغ جدية الحجز', money(data.depositAmount))}
${row('طريقة الدفع', text(data.paymentMethod))}
</table></section>

<section><h3>٤. الشروط</h3><ol>
  <li>الحجز ده بيحجز الوحدة لمدة (15) يوم لحد توقيع العقد النهائي.</li>
  <li>الشركة بتراجع تسلسل الملكية وترخيص المبنى وبتسلّم ملخص مكتوب قبل العقد النهائي.</li>
  <li>مبلغ جدية الحجز بيتخصم من المقدم عند توقيع العقد النهائي.</li>
  <li>الاستمارة دي ماتبقاش سارية إلا بتوقيع الطرفين وختم الشركة. يُفضّل مراجعتها مع محامي المشتري قبل التوقيع.</li>
</ol></section>

<div class="sign">
  <div><strong>الطرف الأول: ${esc(BRAND.name_ar)}</strong><br>الختم والتوقيع:</div>
  <div><strong>الطرف الثاني (المشتري)</strong><br>الاسم: ${text(data.buyerName)}<br>التوقيع:</div>
</div>

<footer>${esc(BRAND.name_ar)} • <span class="ltr">${esc(getDynamicPhone())}</span> • <span class="ltr">${esc(SITE_URL.replace(/^https?:\/\//, ''))}</span>${legal ? ` • ${legal}` : ''}</footer>
</body></html>`;
}

/**
 * Opens the form in a new tab and the print dialog (print or "Save as PDF").
 * Pass a window opened during the click (popup blockers allow only those); falls back to opening one.
 */
export const generateReservationContractPdf = async (contractData, targetWindow = null) => {
  const win = targetWindow || window.open('', '_blank');
  if (!win) throw new Error('popup-blocked');
  win.document.open();
  win.document.write(buildReservationHtml(contractData));
  win.document.close();
  win.focus();
  setTimeout(() => { try { win.print(); } catch { /* the page stays open to print by hand */ } }, 400);
  return true;
};
