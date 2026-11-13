// =============================================================
//  The sitemap: which URLs the site offers to search engines. One definition shared by the build
//  (scripts/postbuild-seo.mjs, a fallback copy) and by api/sitemap.js, which serves /sitemap.xml
//  from the live catalog, so a listing published after the last deploy, and the search pages that
//  depend on it (/sohag/apartments-for-sale…), are listed without waiting for a deploy.
//  Pure: tests/unit/sitemap-xml.test.mjs.
// =============================================================
import { landingPages } from './seoLanding.js';
import { guidePages } from './seoGuides.js';

export const STATIC_ROUTES = [
  ['/', '1.0', 'daily'],
  ['/properties', '0.9', 'daily'],
  ['/sell', '0.9', 'monthly'],
  ['/valuation', '0.8', 'monthly'],
  ['/buy', '0.8', 'monthly'],
  ['/private-office', '0.8', 'monthly'],
  ['/trade-in', '0.8', 'monthly'],
  ['/commercial-hub', '0.8', 'weekly'],
  ['/investor', '0.7', 'monthly'],
  ['/market-intelligence', '0.7', 'weekly'],
  ['/projects', '0.7', 'weekly'],
  ['/developers', '0.6', 'weekly'],
  ['/match', '0.7', 'monthly'],
  ['/about', '0.7', 'monthly'],
  ['/financing', '0.6', 'monthly'],
  ['/demands', '0.6', 'daily'],
  ['/special-requests', '0.5', 'monthly'],
  ['/broker', '0.4', 'monthly'],
  ['/referral', '0.4', 'monthly'],
  ['/privacy', '0.2', 'yearly']
];

const dayOf = (v) => {
  const t = typeof v === 'string' || typeof v === 'number' ? new Date(v) : null;
  return t && !Number.isNaN(t.getTime()) ? t.toISOString().slice(0, 10) : '';
};

/**
 * [{ loc, priority, freq, lastmod }] for the static pages, the search landing pages, the listings and
 * the projects. `listings` and `projects` are the public ones (isPublicListing / isPublicProject).
 * lastmod is when the page's content last changed, not the build date: a listing's own update, and
 * for the pages that list listings the newest one.
 */
export function sitemapUrls({ listings = [], projects = [], today = new Date().toISOString().slice(0, 10) } = {}) {
  const newestDay = listings.map((p) => dayOf(p.updatedAt) || dayOf(p.createdAt)).filter(Boolean).sort().pop() || today;
  const LISTS_LISTINGS = new Set(['/', '/properties']);
  return [
    ...STATIC_ROUTES.map(([loc, priority, freq]) => ({ loc, priority, freq, lastmod: LISTS_LISTINGS.has(loc) ? newestDay : '' })),
    ...landingPages(listings).map((l) => ({ loc: l.path, priority: l.area ? '0.7' : '0.8', freq: 'daily', lastmod: newestDay })),
    ...guidePages(listings).map((g) => ({ loc: g.path, priority: g.area ? '0.6' : '0.7', freq: 'daily', lastmod: newestDay })),
    ...listings.map((p) => ({ loc: `/properties/${encodeURIComponent(p.id)}`, priority: '0.8', freq: 'weekly', lastmod: dayOf(p.updatedAt) || dayOf(p.createdAt) })),
    ...projects.filter((p) => /^[\w-]{1,80}$/.test(p.id)).map((p) => ({ loc: `/projects/${encodeURIComponent(p.id)}`, priority: '0.6', freq: 'weekly', lastmod: dayOf(p.updatedAt) }))
  ];
}

const xmlEscape = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function renderSitemap(siteUrl, urls) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${xmlEscape(siteUrl + u.loc)}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}<changefreq>${u.freq}</changefreq><priority>${u.priority}</priority></url>`).join('\n')}
</urlset>
`;
}
