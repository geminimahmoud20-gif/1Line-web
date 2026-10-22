// Emits sitemap.xml, robots.txt, 404.html and prerendered HTML shells into dist/ after `vite build`.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');

// Read VITE_SITE_URL from the environment or .env (same source Vite uses)
let siteUrl = process.env.VITE_SITE_URL;
if (!siteUrl && fs.existsSync(path.join(root, '.env'))) {
  const m = fs.readFileSync(path.join(root, '.env'), 'utf8').match(/^VITE_SITE_URL=(.+)$/m);
  if (m) siteUrl = m[1].trim();
}
siteUrl = (siteUrl || 'https://www.1lineestate.com').replace(/\/+$/, '');

// ── Sanitization and escaping helpers ──────────────────────────────────────────────────
export const esc = (s) => String(s ?? '')
  .replace(/&/g, '&amp;')
  .replace(/"/g, '&quot;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;');

/**
 * Strips phone numbers, email addresses, and contact URLs to prevent privacy leaks in metadata.
 */
export const sanitizeMetaText = (text) => {
  if (!text) return '';
  return String(text)
    .replace(/(?:\+?20|0020|0)?1[0125]\d{8}\b/g, '') // Egyptian mobile numbers
    .replace(/\b\d{8,14}\b/g, '')                     // Landlines or numeric series
    .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '') // Emails
    .replace(/https?:\/\/(wa\.me|api\.whatsapp\.com)[^\s]+/g, '')    // WhatsApp links
    .replace(/\s+/g, ' ')
    .trim();
};

/**
 * Replaces a pattern in HTML template and verifies that the replacement succeeded (never fails silently).
 */
export function strictReplace(html, pattern, replacement, label) {
  if (!pattern.test(html)) {
    throw new Error(`postbuild-seo: Mandatory template tag for [${label}] was not found in HTML template.`);
  }
  return html.replace(pattern, replacement);
}

export const fmtPrice = (n) => (Number(n) > 0 ? `${Number(n).toLocaleString('en-US')} ج.م` : '');

/**
 * Builds and validates an HTML shell for a property listing.
 */
export function buildPropertyShell(template, p, baseOrigin) {
  const origin = (baseOrigin || siteUrl).replace(/\/+$/, '');
  const title = `${sanitizeMetaText(p.title_ar || p.title_en || 'عقار')} | 1Line Solutions`;
  const location = sanitizeMetaText(p.locationName_ar || p.areaKey || '');
  const summary = [location, fmtPrice(p.price), p.size ? `${p.size} م²` : ''].filter(Boolean).join(' — ');
  const rawDesc = p.description_ar || p.description_en || summary || '';
  const desc = sanitizeMetaText(rawDesc).slice(0, 180);
  const image = Array.isArray(p.images) && /^https?:\/\//.test(p.images[0] || '') ? p.images[0] : `${origin}/og-image.jpg`;
  const url = `${origin}/properties/${encodeURIComponent(p.id)}`;
  const today = new Date().toISOString().slice(0, 10);

  const breadcrumbsSchema = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'الرئيسية', item: `${origin}/` },
      { '@type': 'ListItem', position: 2, name: 'العقارات', item: `${origin}/properties` },
      { '@type': 'ListItem', position: 3, name: sanitizeMetaText(p.title_ar || p.title_en || 'عقار'), item: url }
    ]
  }, null, 2);

  const propertySchema = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'RealEstateListing',
    name: sanitizeMetaText(p.title_ar || p.title_en || 'عقار'),
    description: desc,
    url: url,
    image: Array.isArray(p.images) && p.images.length > 0 ? p.images : [image],
    offers: {
      '@type': 'Offer',
      price: Number(p.price) || 0,
      priceCurrency: 'EGP',
      availability: p.status === 'sold' ? 'https://schema.org/Sold' : 'https://schema.org/InStock',
      validFrom: p.createdAt || today
    }
  }, null, 2);

  let html = template;
  html = strictReplace(html, /<title>[\s\S]*?<\/title>/, `<title>${esc(title)}</title>`, 'title');
  html = strictReplace(html, /(<meta name="description" content=")[^"]*(")/, `$1${esc(desc)}$2`, 'description');
  html = strictReplace(html, /(<link rel="canonical" href=")[^"]*(")/, `$1${esc(url)}$2`, 'canonical');
  html = strictReplace(html, /(<meta property="og:type" content=")[^"]*(")/, '$1article$2', 'og:type');
  html = strictReplace(html, /(<meta property="og:url" content=")[^"]*(")/, `$1${esc(url)}$2`, 'og:url');
  html = strictReplace(html, /(<meta property="og:title" content=")[^"]*(")/, `$1${esc(title)}$2`, 'og:title');
  html = strictReplace(html, /(<meta property="og:description" content=")[^"]*(")/, `$1${esc(summary || desc)}$2`, 'og:desc');
  html = strictReplace(html, /(<meta property="og:image" content=")[^"]*(")/, `$1${esc(image)}$2`, 'og:image');
  html = strictReplace(html, /(<meta name="twitter:title" content=")[^"]*(")/, `$1${esc(title)}$2`, 'twitter:title');
  html = strictReplace(html, /(<meta name="twitter:description" content=")[^"]*(")/, `$1${esc(summary || desc)}$2`, 'twitter:desc');
  html = strictReplace(html, /(<meta name="twitter:image" content=")[^"]*(")/, `$1${esc(image)}$2`, 'twitter:image');

  // Inject structured data
  html = html.replace('</head>', `    <script type="application/ld+json" id="breadcrumb-schema">\n${breadcrumbsSchema}\n    </script>\n    <script type="application/ld+json" id="property-jsonld-schema">\n${propertySchema}\n    </script>\n  </head>`);

  return html;
}

// ── Firestore Data Fetcher ─────────────────────────────────────────────────────────────
const FIRESTORE_PROJECT = 'line-c9601';
const FIRESTORE_KEY = 'AIzaSyDPgFF3temb0pgQfSbycUj3DMkZdzcNGRs';

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

// ── Main Build Runner ──────────────────────────────────────────────────────────────────
export async function runPostbuild() {
  const indexHtmlPath = path.join(dist, 'index.html');
  if (!fs.existsSync(indexHtmlPath)) {
    throw new Error(`postbuild-seo: ${indexHtmlPath} does not exist. Run vite build first.`);
  }

  let indexHtml = fs.readFileSync(indexHtmlPath, 'utf8');
  if (indexHtml.includes('%VITE_SITE_URL%')) {
    indexHtml = indexHtml.replaceAll('%VITE_SITE_URL%', siteUrl);
    fs.writeFileSync(indexHtmlPath, indexHtml);
  }

  const unresolved = indexHtml.match(/%[A-Z0-9_]+%/g);
  if (unresolved && unresolved.length > 0) {
    throw new Error(`postbuild-seo: Unresolved environment placeholders found in dist/index.html: ${unresolved.join(', ')}`);
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

  // 1. Sitemap.xml
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${siteUrl}${u.loc}</loc><lastmod>${today}</lastmod><changefreq>${u.freq}</changefreq><priority>${u.priority}</priority></url>`).join('\n')}
</urlset>
`;
  fs.writeFileSync(path.join(dist, 'sitemap.xml'), xml);

  // 2. Robots.txt
  fs.writeFileSync(path.join(dist, 'robots.txt'), `User-agent: *
Allow: /
Disallow: /crm
Disallow: /my-account
Disallow: /favorites
Disallow: /compare

Sitemap: ${siteUrl}/sitemap.xml
`);

  // 3. 404.html
  let notFoundHtml = indexHtml
    .replace(/<title>[\s\S]*?<\/title>/, `<title>الصفحة غير موجودة (404) | 1Line Solutions</title>`)
    .replace(/(<meta name="robots" content=")[^"]*(")/, '$1noindex, follow$2')
    .replace(/(<link rel="canonical" href=")[^"]*(")/, `$1${siteUrl}/404$2`)
    .replace(/(<meta property="og:url" content=")[^"]*(")/, `$1${siteUrl}/404$2`);
  fs.writeFileSync(path.join(dist, '404.html'), notFoundHtml);

  // 4. Static Public Route Shells
  const STATIC_SHELL_CONFIGS = [
    {
      path: 'trade-in',
      title: 'منصة البدل والمقايضة العقارية في سوهاج والصعيد | 1Line Solutions',
      desc: 'بدّل شقتك أو أرضك أو مقرك التجاري بعقار مناسب بفرق سعر أو رأس برأس في سوهاج، مع فحص قانوني ومطابقة عقارية موثقة.',
      breadcrumbName: 'البدل العقاري'
    },
    {
      path: 'properties',
      title: 'استكشاف العقارات بسوهاج | شقق وفيلات وأراضي | 1Line Solutions',
      desc: 'تصفح أحدث العقارات المفحوصة والمعتمدة قانونياً في سوهاج وسوهاج الجديدة مع منصة 1Line.',
      breadcrumbName: 'العقارات'
    },
    {
      path: 'about',
      title: 'عن 1Line ورؤية المؤسس د. محمود الباز | المنصة العقارية الأولى بسوهاج | 1Line Solutions',
      desc: 'تعرف على قصة 1Line، معايير الأمان الأربعة المعتمدة، وسيرة المؤسس د. محمود الباز استشاري التقييم والتطوير العقاري بسوهاج.',
      breadcrumbName: 'عن الشركة'
    },
    {
      path: 'commercial-hub',
      title: 'عيادات ومكاتب ومحلات للبيع في سوهاج — مركز الاستثمار التجاري | 1Line Solutions',
      desc: 'عقارات تجارية وطبية في سوهاج مع مؤشرات القرار: كثافة الشارع، الوصول من المراكز، الركن، وحاسبة العائد الإيجاري وفترة استرداد رأس المال.',
      breadcrumbName: 'المركز التجاري والطبي'
    },
    {
      path: 'projects',
      title: 'دليل المشروعات والكمبوندات الكبرى بسوهاج 2026 | 1Line Solutions',
      desc: 'تصفح الكمبوندات السكنية والمولات التجارية والأبراج الإدارية بسوهاج مع متابعة حية لنسب التنفيذ الإنشائي.',
      breadcrumbName: 'دليل المشروعات'
    },
    {
      path: 'market-intelligence',
      title: 'أسعار المتر في سوهاج من العروض الحالية | 1Line Solutions',
      desc: 'متوسط سعر المتر في كل منطقة بسوهاج محسوب من العقارات المعروضة حالياً على 1Line، وإيه اللي تقدر تلاقيه بميزانيتك.',
      breadcrumbName: 'أسعار المتر ومؤشرات السوق'
    },
    {
      path: 'financing',
      title: 'حاسبة التمويل والأقساط العقارية والعائد الاستثماري | 1Line Solutions',
      desc: 'احسب قسطك الشهري بدقة، خطط ميزانيتك المالية، وحلل العائد الاستثماري لصفقاتك العقارية في سوهاج مع 1Line.',
      breadcrumbName: 'التمويل وحساب العائد'
    },
    {
      path: 'privacy',
      title: 'سياسة الخصوصية وحماية البيانات | 1Line Solutions',
      desc: 'التزام شركة 1Line بحماية بياناتك الشخصية وحقوقك وفقاً لقانون حماية البيانات الشخصية المصري رقم 151 لسنة 2020.',
      breadcrumbName: 'سياسة الخصوصية'
    }
  ];

  let prerenderedStatic = 0;
  for (const item of STATIC_SHELL_CONFIGS) {
    const routeUrl = `${siteUrl}/${item.path}`;
    const breadcrumbLd = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'الرئيسية', item: `${siteUrl}/` },
        { '@type': 'ListItem', position: 2, name: item.breadcrumbName, item: routeUrl }
      ]
    }, null, 2);

    let html = indexHtml;
    html = strictReplace(html, /<title>[\s\S]*?<\/title>/, `<title>${esc(item.title)}</title>`, `${item.path} title`);
    html = strictReplace(html, /(<meta name="description" content=")[^"]*(")/, `$1${esc(item.desc)}$2`, `${item.path} description`);
    html = strictReplace(html, /(<link rel="canonical" href=")[^"]*(")/, `$1${esc(routeUrl)}$2`, `${item.path} canonical`);
    html = strictReplace(html, /(<meta property="og:url" content=")[^"]*(")/, `$1${esc(routeUrl)}$2`, `${item.path} og:url`);
    html = strictReplace(html, /(<meta property="og:title" content=")[^"]*(")/, `$1${esc(item.title)}$2`, `${item.path} og:title`);
    html = strictReplace(html, /(<meta property="og:description" content=")[^"]*(")/, `$1${esc(item.desc)}$2`, `${item.path} og:desc`);
    html = strictReplace(html, /(<meta name="twitter:title" content=")[^"]*(")/, `$1${esc(item.title)}$2`, `${item.path} twitter:title`);
    html = strictReplace(html, /(<meta name="twitter:description" content=")[^"]*(")/, `$1${esc(item.desc)}$2`, `${item.path} twitter:desc`);

    // Inject BreadcrumbList JSON-LD into the head
    html = html.replace('</head>', `    <script type="application/ld+json" id="breadcrumb-schema">\n${breadcrumbLd}\n    </script>\n  </head>`);

    const dir = path.join(dist, item.path);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'index.html'), html);
    prerenderedStatic++;
  }

  // 5. Property Listing Shells
  let prerenderedListings = 0;
  for (const p of realListings) {
    if (!/^[\w-]{1,80}$/.test(p.id)) continue;
    const html = buildPropertyShell(indexHtml, p, siteUrl);
    const dir = path.join(dist, 'properties', p.id);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'index.html'), html);
    prerenderedListings++;
  }

  console.log(`postbuild-seo: ${urls.length} URLs → sitemap.xml, robots.txt, 404.html; ${prerenderedStatic} static shells; ${prerenderedListings} listing shells (${siteUrl})`);
}

const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isDirectRun) {
  runPostbuild().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
