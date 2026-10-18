// Arabic names for the site's pages, for staff screens that show where a visitor was
// (Inbox → "واتساب من الموقع"). Unit pages are shown by the caller with the unit's own title.

const PAGES = {
  '/': 'الصفحة الرئيسية',
  '/properties': 'صفحة العقارات',
  '/projects': 'المشروعات',
  '/sell': 'اعرض عقارك',
  '/valuation': 'تقييم عقار',
  '/buy': 'اطلب عقار',
  '/demands': 'طلبات المشترين',
  '/special-requests': 'طلبات خاصة',
  '/special': 'طلبات خاصة',
  '/broker': 'بوابة الوسطاء',
  '/investor': 'المستثمرين',
  '/commercial-hub': 'العقارات التجارية',
  '/financing': 'التمويل',
  '/trade-in': 'بدّل عقارك',
  '/off-market': 'عروض خارج السوق',
  '/private-office': 'المكتب الخاص',
  '/vault': 'المكتب الخاص',
  '/market-intelligence': 'أسعار السوق',
  '/compare': 'مقارنة العقارات',
  '/favorites': 'المفضلة',
  '/my-account': 'حساب العميل',
  '/referral': 'رشّح عميل',
  '/about': 'من نحن',
  '/about-us': 'من نحن',
  '/privacy': 'الخصوصية',
  '/terms': 'الشروط'
};

/** "/" → "الصفحة الرئيسية"; unknown paths come back as they are */
export function sitePageLabel(path) {
  const p = String(path || '/').split(/[?#]/)[0].replace(/\/+$/, '') || '/';
  if (PAGES[p]) return PAGES[p];
  if (/^\/properties\/[^/]+/.test(p)) return 'صفحة وحدة';
  return p;
}
