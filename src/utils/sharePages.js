// =============================================================
//  Pages of the site the team sends to a client on WhatsApp from the CRM, each with a short
//  message in the client's language. Links carry utm_source=crm_whatsapp so a client who opens
//  one shows in analytics, and in the CRM, as coming from the team's message. Pure (tested).
// =============================================================
import { tagged } from './shareLinks.js';

export const SHARE_PAGES = [
  { path: '/match', ar: 'رشح لي عقاري', msg: 'جاوب على ٧ أسئلة بسيطة، ويطلعلك العقارات اللي تناسب ميزانيتك ومنطقتك، وكلها مراجَعة قانونياً:' },
  { path: '/demands?new=1', ar: 'نموذج طلب مشتري', msg: 'سجّل طلبك (نوع العقار والمنطقة والميزانية) من هنا في دقيقتين، ونرشّحلك الأنسب ونبلّغك أول ما يتوفر:' },
  { path: '/properties', ar: 'كل العقارات', msg: 'دي كل العقارات المتاحة عندنا دلوقتي، وكلها مراجَعة قانونياً:' },
  { path: '/sell', ar: 'اعرض عقارك للبيع', for: 'seller', msg: 'تقدر تسجّل بيانات عقارك وصوره من هنا، ونكلمك نحدد معاد المعاينة والتقييم:' },
  { path: '/valuation', ar: 'تقييم العقار مجاناً', for: 'seller', msg: 'اعرف قيمة عقارك بسعر السوق الحقيقي في دقيقتين من هنا:' },
  { path: '/financing', ar: 'التمويل وحاسبة الأقساط', msg: 'احسب أقساطك والمقدم المناسب ليك، وشوف عائد العقار بعد كل المصاريف:' },
  { path: '/market-intelligence', ar: 'أسعار المتر في سوهاج', msg: 'سعر المتر الحقيقي في كل منطقة في سوهاج، من العروض الفعلية:' },
  { path: '/projects', ar: 'المشروعات والكمبوندات', msg: 'المشروعات والكمبوندات المتاحة عندنا وأنظمة السداد:' },
  { path: '/trade-in', ar: 'بدّل عقارك', msg: 'عندك عقار وعايز تبدّله بعقار تاني؟ ابدأ من هنا:' },
  { path: '/commercial-hub', ar: 'محلات وعيادات ومكاتب', msg: 'المحلات والعيادات والمكاتب المتاحة عندنا:' },
  { path: '/about', ar: 'عن 1Line', msg: 'تعرّف على 1Line، أول منصة عقارية متخصصة في العقارات المعتمدة قانونياً:' }
];

/** Pages in the order that suits the client: an owner's pages first for an owner */
export function sharePagesFor(isSeller = false) {
  if (!isSeller) return SHARE_PAGES.filter((p) => p.for !== 'seller').concat(SHARE_PAGES.filter((p) => p.for === 'seller'));
  return SHARE_PAGES.filter((p) => p.for === 'seller').concat(SHARE_PAGES.filter((p) => p.for !== 'seller'));
}

/** The WhatsApp text for a page: greeting, the page's message, the tagged link */
export function sharePageMessage(page, { name = '', siteUrl = '' } = {}) {
  const first = String(name || '').trim().split(/\s+/)[0];
  const url = tagged(`${siteUrl.replace(/\/+$/, '')}${page.path}`, 'crm_whatsapp', 'staff_share');
  return `${first ? `أهلاً أستاذ ${first}، ` : 'أهلاً بحضرتك، '}${page.msg}\n${url}`;
}

/**
 * The WhatsApp text that asks an owner for what his request still lacks (the quick request took only the name, the
 * number and the type): says which items, and links the full form. `missing` = labels such as «المساحة».
 */
export function completeDetailsMessage({ name = '', missing = [], siteUrl = '' } = {}) {
  const first = String(name || '').trim().split(/\s+/)[0];
  const url = tagged(`${siteUrl.replace(/\/+$/, '')}/sell`, 'crm_whatsapp', 'complete_details');
  const list = missing.length ? ` عشان نقيّم عقارك محتاجين: ${missing.join('، ')}.` : '';
  return `${first ? `أهلاً أستاذ ${first}، ` : 'أهلاً بحضرتك، '}شكراً لتواصلك مع 1Line.${list} تقدر تكمّلها في دقيقتين من هنا:\n${url}`;
}
