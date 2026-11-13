// =============================================================
//  Ad links with the tracking the campaign report reads: where the ad lands, which platform it is on,
//  the campaign and (optionally) the ad or video. utm_campaign is written as a plain Latin slug
//  (letters, digits, - and _): the visitor analytics keep only keys of that shape, so a campaign
//  named with spaces or Arabic letters would reach the report but not the visitor's journey.
//  Pure: tests/unit/utm-links.test.mjs.
// =============================================================

/** The pages an ad can send people to, and what each one captures */
export const LANDINGS = [
  { path: '/match', ar: 'رشّحلي عقاري (بيسجّل عميل بالرقم)', leads: true },
  { path: '/sell', ar: 'بيع عقارك (ملاك)', leads: true },
  { path: '/valuation', ar: 'قيّم عقارك (ملاك)', leads: true },
  { path: '/special-requests', ar: 'طلب خاص (مشتري)', leads: true },
  { path: '/financing', ar: 'التمويل العقاري', leads: false },
  { path: '/properties', ar: 'كل العقارات', leads: false },
  { path: '/', ar: 'الصفحة الرئيسية', leads: false }
];

export const PLATFORMS = [
  { id: 'facebook', ar: 'فيسبوك', source: 'facebook', medium: 'paid_social' },
  { id: 'instagram', ar: 'إنستجرام', source: 'instagram', medium: 'paid_social' },
  { id: 'tiktok', ar: 'تيك توك', source: 'tiktok', medium: 'paid_social' },
  { id: 'google', ar: 'جوجل', source: 'google', medium: 'cpc' }
];

/** «Sohag Buyers 2026» → «sohag-buyers-2026»; '' when nothing usable is left (Arabic-only names, for one) */
export function slugify(text) {
  return String(text ?? '')
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 64);
}

/**
 * The full ad link, or '' while something is missing.
 * @param {{ siteUrl: string, path: string, platform: string, campaign: string, content?: string }} o
 */
export function buildUtmLink({ siteUrl, path = '/', platform = 'facebook', campaign = '', content = '' } = {}) {
  const p = PLATFORMS.find((x) => x.id === platform);
  const camp = slugify(campaign);
  if (!p || !camp || !siteUrl || !LANDINGS.some((l) => l.path === path)) return '';
  const q = new URLSearchParams({ utm_source: p.source, utm_medium: p.medium, utm_campaign: camp });
  const ad = slugify(content);
  if (ad) q.set('utm_content', ad);
  return `${String(siteUrl).replace(/\/$/, '')}${path}?${q.toString()}`;
}
