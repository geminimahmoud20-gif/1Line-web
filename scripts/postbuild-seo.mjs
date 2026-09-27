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

// ── Real listings from Firestore (public read) ────────────────────────────────────────
// The bundled PROPERTIES_DATA are demo samples: never put them in the sitemap as real listings.
const FIRESTORE_PROJECT = 'line-c9601';
const FIRESTORE_KEY = 'AIzaSyDPgFF3temb0pgQfSbycUj3DMkZdzcNGRs'; // same public web key as src/firebase.js

const fromFirestoreValue = (v) => {
  if (!v || typeof v !== 'object') return undefined;
  if ('stringValue' in v) return v.stringValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return Number(v.doubleValue);
  if ('booleanValue' in v) return v.booleanValue;
  if ('nullValue' in v) return null;
  if ('timestampValue' in v) return v.timestampValue;
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(fromFirestoreValue);
  if ('mapValue' in v) return Object.fromEntries(Object.entries(v.mapValue.fields || {}).map(([k, x]) => [k, fromFirestoreValue(x)]));
  return undefined;
};

async function fetchRealListings() {
  const out = [];
  let pageToken = '';
  try {
    for (let page = 0; page < 10; page++) {
      const url = `https://firestore.googleapis.com/v1/projects/${FIRESTORE_PROJECT}/databases/(default)/documents/properties?pageSize=300&key=${FIRESTORE_KEY}${pageToken ? `&pageToken=${pageToken}` : ''}`;
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 15000);
      const res = await fetch(url, { signal: ctrl.signal });
      clearTimeout(timer);
      if (!res.ok) { console.warn(`postbuild-seo: Firestore listings unavailable (${res.status})`); break; }
      const data = await res.json();
      for (const d of data.documents || []) {
        const f = Object.fromEntries(Object.entries(d.fields || {}).map(([k, v]) => [k, fromFirestoreValue(v)]));
        const id = f.id || d.name.split('/').pop();
        out.push({ ...f, id: String(id) });
      }
      if (!data.nextPageToken) break;
      pageToken = encodeURIComponent(data.nextPageToken);
    }
  } catch (err) {
    console.warn('postbuild-seo: could not reach Firestore —', err.message);
  }
  return out.filter((p) => p.id && !p.deleted && !p.isDeleted && !['trash', 'hidden', 'draft', 'sold'].includes(p.status));
}

const realListings = await fetchRealListings();

const today = new Date().toISOString().slice(0, 10);
const staticRoutes = [
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
  ...realListings.map((p) => ({ loc: `/properties/${encodeURIComponent(p.id)}`, priority: '0.8', freq: 'weekly' })),
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

// ── Per-listing HTML shells ───────────────────────────────────────────────────────────
// Same app shell (same /assets bundle), but <head> carries the listing's own title, description,
// photo and canonical URL — so WhatsApp/Facebook previews and crawlers see the real listing.
// Served from dist/properties/<id>/index.html; anything not pre-rendered still falls back to the SPA.
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const shell = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');
const fmtPrice = (n) => (Number(n) > 0 ? `${Number(n).toLocaleString('en-US')} ج.م` : '');
let prerendered = 0;
for (const p of realListings) {
  if (!/^[\w-]{1,80}$/.test(p.id)) continue;
  const title = `${p.title_ar || p.title_en || 'عقار'} | 1Line Solutions`;
  const summary = [p.locationName_ar, fmtPrice(p.price), p.size ? `${p.size} م²` : ''].filter(Boolean).join(' — ');
  const desc = (p.description_ar || summary || '').replace(/\s+/g, ' ').slice(0, 180);
  const image = Array.isArray(p.images) && /^https?:\/\//.test(p.images[0] || '') ? p.images[0] : `${siteUrl}/og-image.jpg`;
  const url = `${siteUrl}/properties/${p.id}`;
  let html = shell
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(title)}</title>`)
    .replace(/(<meta name="description" content=")[^"]*(")/, `$1${esc(desc)}$2`)
    .replace(/(<link rel="canonical" href=")[^"]*(")/, `$1${esc(url)}$2`)
    .replace(/(<meta property="og:type" content=")[^"]*(")/, '$1article$2')
    .replace(/(<meta property="og:url" content=")[^"]*(")/, `$1${esc(url)}$2`)
    .replace(/(<meta property="og:title" content=")[^"]*(")/, `$1${esc(title)}$2`)
    .replace(/(<meta property="og:description" content=")[^"]*(")/, `$1${esc(summary || desc)}$2`)
    .replace(/(<meta property="og:image" content=")[^"]*(")/, `$1${esc(image)}$2`)
    .replace(/(<meta name="twitter:title" content=")[^"]*(")/, `$1${esc(title)}$2`)
    .replace(/(<meta name="twitter:description" content=")[^"]*(")/, `$1${esc(summary || desc)}$2`)
    .replace(/(<meta name="twitter:image" content=")[^"]*(")/, `$1${esc(image)}$2`);
  const dir = path.join(dist, 'properties', p.id);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), html);
  prerendered++;
}

console.log(`postbuild-seo: ${urls.length} URLs → sitemap.xml, robots.txt, 404.html; ${prerendered} listing previews (${siteUrl})`);
