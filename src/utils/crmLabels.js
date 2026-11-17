// =============================================================
//  Display labels for CRM values that are stored as English keys.
//  Translate at render time: stored records (including existing Firestore leads)
//  keep their original values, so nothing needs migrating.
// =============================================================

const FOLLOW_UP_AR = {
  'Pending Contact': 'بانتظار التواصل',
  'First Call Done': 'تمت المكالمة الأولى',
  'Valuation Shared': 'أُرسل التقييم',
  'Contract Review': 'مراجعة العقد',
  'ROI Presentation Sent': 'أُرسل عرض العائد',
  'Site Visit Scheduled': 'معاينة مجدولة',
  'Negotiation': 'قيد التفاوض',
  'Closed': 'تم الإغلاق'
};

const LEAD_TYPE_AR = {
  buyer: 'مشتري',
  seller: 'بائع',
  investor: 'مستثمر',
  broker: 'وسيط عقاري',
  buyer_demand: 'طلب شراء',
  reservation_request: 'طلب حجز',
  viewing_request: 'طلب معاينة'
};

/** Follow-up / next-action note in the UI language (free text passes through unchanged) */
export function formatFollowUp(value, isAr = true) {
  if (!value) return '';
  const v = String(value).trim();
  return isAr ? (FOLLOW_UP_AR[v] || v) : v;
}

export function formatLeadType(value, isAr = true) {
  if (!value) return '';
  return isAr ? (LEAD_TYPE_AR[value] || value) : value;
}

/** Budget as "3,500,000 ج.م" whether stored as a number or a formatted string */
export function formatBudget(value, isAr = true) {
  if (value === undefined || value === null || value === '') return '';
  const n = typeof value === 'number' ? value : Number(String(value).replace(/[^\d.]/g, ''));
  if (!Number.isFinite(n) || n <= 0) return String(value);
  return `${Math.round(n).toLocaleString('en-US')} ${isAr ? 'ج.م' : 'EGP'}`;
}

// ── Raw values shown to people: the source text, the campaign slug ───────────────────────────────

const SOURCE_TEXT = [
  [/portals?\s*1-step\s*\((sell|valuation)\)/i, 'نموذج سريع: عايز يبيع'],
  [/portals?\s*1-step/i, 'نموذج سريع'],
  [/^(direct entry|direct)$/i, 'إدخال يدوي'],
  [/^(website|web|site)$/i, 'الموقع'],
  [/^whatsapp$/i, 'واتساب'],
  [/^(facebook|fb)$/i, 'فيسبوك'],
  [/^(instagram|ig)$/i, 'إنستجرام'],
  [/^google$/i, 'جوجل'],
  [/^tiktok$/i, 'تيك توك'],
  [/^(import|csv|excel)/i, 'استيراد ملف'],
  [/^client_account$/i, 'حساب عميل']
];

/** The source as written on the lead, in words: «Portals 1-Step (sell)» → «نموذج سريع: عايز يبيع» (Arabic text passes through) */
export function sourceText(raw) {
  const v = String(raw ?? '').trim();
  if (!v) return '';
  for (const [re, ar] of SOURCE_TEXT) if (re.test(v)) return ar;
  return v;
}

const CAMPAIGN_WORDS = {
  owners: 'الملاك', owner: 'المالك', leads: 'عملاء', lead: 'عميل', buyers: 'المشترين', buyer: 'المشتري', sellers: 'البائعين',
  sell: 'بيع', buy: 'شراء', rent: 'إيجار', video: 'فيديو', reel: 'ريل', reels: 'ريلز', story: 'ستوري', post: 'بوست',
  sohag: 'سوهاج', soh: 'سوهاج', new: 'الجديدة', cairo: 'القاهرة', asyut: 'أسيوط', qena: 'قنا', luxor: 'الأقصر',
  jan: 'يناير', feb: 'فبراير', mar: 'مارس', apr: 'أبريل', may: 'مايو', jun: 'يونيو', jul: 'يوليو', aug: 'أغسطس',
  sep: 'سبتمبر', oct: 'أكتوبر', nov: 'نوفمبر', dec: 'ديسمبر'
};
const MONTH_YEAR = /^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)(\d{2})$/i;

/** A campaign slug as words: «owners-leads-soh-owners-nov26» → «الملاك عملاء سوهاج الملاك نوفمبر 26». Arabic or unknown words stay. */
export function campaignLabel(slug) {
  const v = String(slug ?? '').trim();
  if (!v) return '';
  if (/[؀-ۿ]/.test(v) && !/[-_]/.test(v)) return v;
  const out = [];
  for (const w of v.split(/[-_+\s]+/).filter(Boolean)) {
    const m = w.match(MONTH_YEAR);
    if (m) { out.push(CAMPAIGN_WORDS[m[1].toLowerCase()], m[2]); continue; }
    const k = w.toLowerCase();
    if (CAMPAIGN_WORDS[k]) { if (out[out.length - 1] !== CAMPAIGN_WORDS[k]) out.push(CAMPAIGN_WORDS[k]); continue; }
    out.push(w);
  }
  return out.join(' ');
}
