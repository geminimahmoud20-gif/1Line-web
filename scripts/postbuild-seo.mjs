// Emits sitemap.xml, robots.txt and 404.html into dist/ after `vite build`.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');

// Read VITE_SITE_URL from the environment or .env (same source Vite uses)
let siteUrl = process.env.VITE_SITE_URL;
if (!siteUrl && fs.existsSync(path.join(root, '.env'))) {
  const m = fs.readFileSync(path.join(root, '.env'), 'utf8').match(/^VITE_SITE_URL=(.+)$/m);
  if (m) siteUrl = m[1].trim();
}
siteUrl = (siteUrl || 'https://1-line-qkzp9.vercel.app').replace(/\/+$/, '');

const { PROPERTIES_DATA } = await import(pathToFileURL(path.join(root, 'src/data/propertiesData.js')).href);

const today = new Date().toISOString().slice(0, 10);
const staticRoutes = [
  ['/', '1.0', 'daily'],
  ['/properties', '0.9', 'daily'],
  ['/sell', '0.9', 'monthly'],
  ['/valuation', '0.8', 'monthly'],
  ['/buy', '0.8', 'monthly'],
  ['/private-office', '0.8', 'monthly'],
  ['/investor', '0.7', 'monthly'],
  ['/market-intelligence', '0.7', 'weekly'],
  ['/projects', '0.7', 'weekly'],
  ['/about', '0.7', 'monthly'],
  ['/financing', '0.6', 'monthly'],
  ['/demands', '0.6', 'daily'],
  ['/special-requests', '0.5', 'monthly'],
  ['/broker', '0.4', 'monthly'],
  ['/referral', '0.4', 'monthly'],
  ['/privacy', '0.2', 'yearly'],
];

const urls = [
  ...staticRoutes.map(([loc, priority, freq]) => ({ loc, priority, freq })),
  ...PROPERTIES_DATA.filter((p) => p && p.id && p.status !== 'sold' && p.status !== 'hidden')
    .map((p) => ({ loc: `/properties/${p.id}`, priority: '0.8', freq: 'weekly' })),
];

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${siteUrl}${u.loc}</loc><lastmod>${today}</lastmod><changefreq>${u.freq}</changefreq><priority>${u.priority}</priority></url>`).join('\n')}
</urlset>
`;
fs.writeFileSync(path.join(dist, 'sitemap.xml'), xml);

fs.writeFileSync(path.join(dist, 'robots.txt'), `User-agent: *
Allow: /
Disallow: /crm
Disallow: /my-account
Disallow: /favorites
Disallow: /compare

Sitemap: ${siteUrl}/sitemap.xml
`);

// Unknown URLs are served dist/404.html with a real 404 status by Vercel; the SPA renders its NotFound view.
fs.copyFileSync(path.join(dist, 'index.html'), path.join(dist, '404.html'));

console.log(`postbuild-seo: ${urls.length} URLs → sitemap.xml, robots.txt, 404.html (${siteUrl})`);
