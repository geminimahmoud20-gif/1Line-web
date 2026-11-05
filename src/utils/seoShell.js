// =============================================================
//  Page HTML that search engines read before any script runs. The site is a React app: without
//  this, the HTML a crawler first gets for /properties/<id> is an empty <div id="root">. The build
//  (scripts/postbuild-seo.mjs) and the function for listings added after the build
//  (api/page-shell.js) put the page's real text inside #root: title, price, size, description,
//  features, links. React replaces it as soon as the app starts (createRoot), so visitors see the
//  normal page; the text is the same content the page shows, never a different version.
//  No contact data: descriptions go through sanitizeMetaText. Pure, no Node APIs.
//  Tests: tests/unit/postbuild-seo.test.mjs, tests/unit/seo-shell.test.mjs
// =============================================================

import { listingPreview } from './listingShare.js';
import { LANDING_KINDS, LANDING_AREAS, landingPath } from './seoLanding.js';

const areaOf = (p) => LANDING_AREAS.find((a) => a.id === p?.areaKey) || null;
const kindOf = (p) => LANDING_KINDS.find((k) => k.types.includes(p?.type)) || null;

/**
 * A listing's page title: its own title, plus where it is when the title doesn't say «سوهاج»
 * (people search «شقة للبيع في سوهاج الجديدة», not the owner's wording). The site page
 * (PropertyDetailPage) and the shell use the same one.
 */
export function listingSeoTitle(p) {
  const title = sanitizeMetaText(p?.title_ar || p?.title_en || 'عقار');
  if (title.includes('سوهاج')) return title;
  const area = areaOf(p);
  return `${title} — ${area ? area.ar : 'سوهاج'}`;
}

export const esc = (s) => String(s ?? '')
  .replace(/&/g, '&amp;')
  .replace(/"/g, '&quot;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;');

/** Strips phone numbers, emails and WhatsApp links (a description may carry one by mistake) */
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

/** Replaces a template tag, failing loudly when the tag is missing (never a silent no-op) */
export function strictReplace(html, pattern, replacement, label) {
  if (!pattern.test(html)) {
    throw new Error(`postbuild-seo: Mandatory template tag for [${label}] was not found in HTML template.`);
  }
  return html.replace(pattern, replacement);
}

export const fmtPrice = (n) => (Number(n) > 0 ? `${Number(n).toLocaleString('en-US')} ج.م` : '');

const clean = (s, max = 2000) => esc(sanitizeMetaText(s).slice(0, max));
const list = (items) => (items.length ? `<ul>${items.map((x) => `<li>${x}</li>`).join('')}</ul>` : '');
const nav = (crumbs) => `<nav aria-label="مسار الصفحة">${crumbs.map(([href, name]) => (href ? `<a href="${esc(href)}">${esc(name)}</a>` : `<span>${esc(name)}</span>`)).join(' › ')}</nav>`;
const SITE_LINKS = [
  ['/properties', 'كل العقارات'], ['/projects', 'المشروعات والكمبوندات'], ['/market-intelligence', 'أسعار المتر في سوهاج'],
  ['/sohag/apartments-for-sale', 'شقق للبيع في سوهاج'], ['/sohag/villas-for-sale', 'فيلات للبيع في سوهاج'],
  ['/sohag/shops-for-sale', 'محلات للبيع في سوهاج'], ['/sohag/offices-clinics-for-sale', 'مكاتب وعيادات للبيع في سوهاج'],
  ['/sell', 'اعرض عقارك للبيع'], ['/demands', 'طلبات المشترين'], ['/about', 'عن 1Line']
];
const footerNav = () => `<nav aria-label="روابط الموقع">${list(SITE_LINKS.map(([h, n]) => `<a href="${h}">${esc(n)}</a>`))}</nav>`;

/** Puts `body` inside #root: `<main class="seo-shell">…</main>` */
export const withRoot = (html, body, label) => strictReplace(html, /<div id="root"><\/div>/, `<div id="root"><main class="seo-shell" dir="rtl">${body}</main></div>`, `${label} root`);

const TYPE_AR = { apartment: 'شقة', villa: 'فيلا', house: 'منزل', commercial: 'محل تجاري', retail: 'محل تجاري', office: 'مكتب', clinic: 'عيادة', land: 'أرض', building: 'مبنى' };

/** The listing page's text: title, location, key facts, photo, description, features */
export function propertyBody(p, related = []) {
  const title = sanitizeMetaText(p.title_ar || p.title_en || 'عقار');
  const facts = [
    TYPE_AR[p.type] ? `النوع: ${TYPE_AR[p.type]}` : '',
    fmtPrice(p.price) ? `السعر: ${fmtPrice(p.price)}` : '',
    Number(p.size) > 0 ? `المساحة: ${Number(p.size)} م²` : '',
    Number(p.bedrooms) > 0 ? `الغرف: ${Number(p.bedrooms)}` : '',
    Number(p.bathrooms) > 0 ? `الحمامات: ${Number(p.bathrooms)}` : '',
    Number(p.floor) > 0 ? `الدور: ${Number(p.floor)}` : '',
    p.status === 'sold' ? 'الحالة: تم البيع' : (p.status === 'under_negotiation' ? 'الحالة: تحت التفاوض' : '')
  ].filter(Boolean).map((f) => esc(f));
  const image = Array.isArray(p.images) && /^https:\/\//.test(p.images[0] || '') ? p.images[0] : '';
  const features = (Array.isArray(p.features_ar) ? p.features_ar : []).filter((f) => typeof f === 'string' && f.trim()).slice(0, 30).map((f) => clean(f, 120));
  const location = sanitizeMetaText(p.locationName_ar || '');
  const area = areaOf(p);
  const kind = kindOf(p);
  const more = [
    Number(p.size) > 0 && Number(p.price) > 0 ? `سعر المتر: ${Math.round(Number(p.price) / Number(p.size)).toLocaleString('en-US')} ج.م` : '',
    Number(p.downPayment) > 0 ? `المقدم: ${fmtPrice(p.downPayment)}` : '',
    Number(p.installmentAmount) > 0 ? `القسط: ${fmtPrice(p.installmentAmount)}` : '',
    p.finishing_ar ? `التشطيب: ${sanitizeMetaText(p.finishing_ar)}` : '',
    p.completionStatus === 'ready' ? 'الاستلام: فوري' : (p.completionStatus === 'under_construction' ? `الاستلام: تحت الإنشاء${Number(p.deliveryYear) ? ` (${Number(p.deliveryYear)})` : ''}` : '')
  ].filter(Boolean).map((f) => esc(f));
  // Where it sits on the site: its kind's page in Sohag and in its area, and nearby listings
  const sections = [
    kind ? [landingPath(kind), `${kind.ar} في سوهاج`] : null,
    kind && area ? [landingPath(kind, area), `${kind.ar} في ${area.ar}`] : null,
    ['/market-intelligence', `أسعار المتر في ${area ? area.ar : 'سوهاج'}`]
  ].filter((x) => x && !SITE_LINKS.some(([h]) => h === x[0]));
  const nearby = related.filter((r) => r.id !== p.id).slice(0, 6);
  const placeLine = [location, area ? `${area.ar}، سوهاج` : 'سوهاج'].filter(Boolean).join(' — ');
  return nav([['/', 'الرئيسية'], ['/properties', 'العقارات'], ['', title]])
    + `<article><h1>${esc(title)}</h1><p>${esc(placeLine)}</p>${list(facts)}${list(more)}`
    + (image ? `<img src="${esc(image)}" alt="${esc(title)}" width="640" height="420" loading="lazy">` : '')
    + (p.description_ar ? `<h2>الوصف</h2><p>${clean(p.description_ar)}</p>` : '')
    + (features.length ? `<h2>المميزات</h2>${list(features)}` : '')
    + '</article>'
    + (nearby.length ? `<h2>عقارات قريبة${area ? ` في ${esc(area.ar)}` : ''}</h2>${list(nearby.map(listingLink))}` : '')
    + `<h2>تصفح عقارات سوهاج</h2>${list(sections.map(([h, n]) => `<a href="${esc(h)}">${esc(n)}</a>`))}`
    + footerNav();
}

/** Listings to link from a listing's page: the same area first, then the same kind, newest first */
export function relatedListings(p, all = []) {
  const others = newestFirst(all.filter((x) => x && x.id !== p.id && isPublicListing(x)));
  const sameArea = others.filter((x) => x.areaKey && x.areaKey === p.areaKey);
  const sameKind = others.filter((x) => !sameArea.includes(x) && kindOf(x) && kindOf(x) === kindOf(p));
  return [...sameArea, ...sameKind];
}

/** The project page's text */
export function projectBody(p) {
  const title = sanitizeMetaText(p.title_ar || p.title_en || 'مشروع');
  const facts = [
    p.developer_ar ? `المطوّر: ${sanitizeMetaText(p.developer_ar)}` : '',
    p.location_ar ? `الموقع: ${sanitizeMetaText(p.location_ar)}` : '',
    p.type_ar ? `النوع: ${sanitizeMetaText(p.type_ar)}` : '',
    fmtPrice(p.startPrice) ? `الأسعار تبدأ من: ${fmtPrice(p.startPrice)}` : '',
    Number(p.downPaymentPercent) > 0 ? `المقدم: ${Number(p.downPaymentPercent)}%` : '',
    Number(p.installmentYears) > 0 ? `التقسيط: ${Number(p.installmentYears)} سنوات` : '',
    p.deliveryDate_ar ? `الاستلام: ${sanitizeMetaText(p.deliveryDate_ar)}` : '',
    Number(p.progress) > 0 ? `نسبة التنفيذ: ${Number(p.progress)}%` : ''
  ].filter(Boolean).map((f) => esc(f));
  const image = Array.isArray(p.images) && /^https:\/\//.test(p.images[0] || '') ? p.images[0] : '';
  const features = (Array.isArray(p.features_ar) ? p.features_ar : []).filter((f) => typeof f === 'string' && f.trim()).slice(0, 30).map((f) => clean(f, 120));
  return nav([['/', 'الرئيسية'], ['/projects', 'المشروعات'], ['', title]])
    + `<article><h1>${esc(title)}</h1>${list(facts)}`
    + (image ? `<img src="${esc(image)}" alt="${esc(title)}" width="640" height="420" loading="lazy">` : '')
    + (p.description_ar ? `<h2>عن المشروع</h2><p>${clean(p.description_ar)}</p>` : '')
    + (features.length ? `<h2>المميزات</h2>${list(features)}` : '')
    + '</article>' + footerNav();
}

const listingLink = (p) => `<a href="/properties/${encodeURIComponent(p.id)}">${clean(p.title_ar || p.title_en || 'عقار', 140)}</a>${fmtPrice(p.price) ? ` — ${esc(fmtPrice(p.price))}` : ''}${Number(p.size) > 0 ? ` — ${Number(p.size)} م²` : ''}`;
const projectLink = (p) => `<a href="/projects/${encodeURIComponent(p.id)}">${clean(p.title_ar || p.title_en || 'مشروع', 140)}</a>${p.location_ar ? ` — ${clean(p.location_ar, 80)}` : ''}`;

/**
 * A section page's text: its heading and description, plus links to the listings (/properties,
 * the homepage) or projects (/projects) so crawlers find every unit from the first HTML.
 */
export function routeBody({ h1, desc, path = '', listings = [], projects = [] }) {
  const crumbs = path ? nav([['/', 'الرئيسية'], ['', h1]]) : '';
  const units = listings.slice(0, 60);
  const projs = projects.slice(0, 40);
  return crumbs + `<h1>${esc(h1)}</h1>${desc ? `<p>${esc(desc)}</p>` : ''}`
    + (units.length ? `<h2>${path ? 'العقارات المعروضة' : 'أحدث العقارات'}</h2>${list(units.map(listingLink))}` : '')
    + (projs.length ? `<h2>المشروعات</h2>${list(projs.map(projectLink))}` : '')
    + footerNav();
}

/** Newest first, the same order the site lists them */
export const newestFirst = (items) => [...items].sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));

/** Shell for a listing: head tags + JSON-LD + the page's text in #root */
export function buildPropertyShell(template, p, origin, all = []) {
  origin = String(origin || 'https://www.1lineestate.com').replace(/\/+$/, '');
  const title = `${listingSeoTitle(p)} | 1Line Solutions`;
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
  }, null, 2).replace(/</g, '\\u003c');

  const propertySchema = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'RealEstateListing',
    name: sanitizeMetaText(p.title_ar || p.title_en || 'عقار'),
    description: desc,
    url,
    image: Array.isArray(p.images) && p.images.length > 0 ? p.images : [image],
    offers: {
      '@type': 'Offer',
      price: Number(p.price) || 0,
      priceCurrency: 'EGP',
      availability: p.status === 'sold' ? 'https://schema.org/Sold' : 'https://schema.org/InStock',
      validFrom: p.createdAt || today
    }
  }, null, 2).replace(/</g, '\\u003c');

  // Link preview: the listing's own title (og:site_name already names 1Line), and price + facts
  // under it, e.g. «مقدم 200,000 ج.م + قسط 30,000 ج.م ربع سنوي — 156 م² · 3 غرف · سوهاج الجديدة»
  const preview = listingPreview(p);
  let html = headTags(template, { title, desc, url, ogTitle: preview.title, ogDesc: preview.description || summary || desc, image, type: 'article', label: 'property' });
  html = html.replace('</head>', `    <script type="application/ld+json" id="breadcrumb-schema">\n${breadcrumbsSchema}\n    </script>\n    <script type="application/ld+json" id="property-jsonld-schema">\n${propertySchema}\n    </script>\n  </head>`);
  return withRoot(html, propertyBody(p, relatedListings(p, all)), 'property');
}

/** Shell for a project page */
export function buildProjectShell(template, p, origin) {
  origin = String(origin || 'https://www.1lineestate.com').replace(/\/+$/, '');
  const name = sanitizeMetaText(p.title_ar || p.title_en || 'مشروع');
  const title = `${name} | 1Line Solutions`;
  const desc = sanitizeMetaText(p.description_ar || [p.location_ar, fmtPrice(p.startPrice)].filter(Boolean).join(' — ')).slice(0, 180);
  const image = Array.isArray(p.images) && /^https?:\/\//.test(p.images[0] || '') ? p.images[0] : `${origin}/og-image.jpg`;
  const url = `${origin}/projects/${encodeURIComponent(p.id)}`;
  const crumbs = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'الرئيسية', item: `${origin}/` },
      { '@type': 'ListItem', position: 2, name: 'المشروعات', item: `${origin}/projects` },
      { '@type': 'ListItem', position: 3, name, item: url }
    ]
  }, null, 2).replace(/</g, '\\u003c');
  let html = headTags(template, { title, desc, url, ogDesc: desc, image, type: 'article', label: 'project' });
  html = html.replace('</head>', `    <script type="application/ld+json" id="breadcrumb-schema">\n${crumbs}\n    </script>\n  </head>`);
  return withRoot(html, projectBody(p), 'project');
}

/** title / description / canonical / Open Graph / Twitter tags of the template */
export function headTags(template, { title, desc, url, ogDesc = desc, ogTitle = title, image = '', type = '', label }) {
  let html = template;
  html = strictReplace(html, /<title>[\s\S]*?<\/title>/, `<title>${esc(title)}</title>`, `${label} title`);
  html = strictReplace(html, /(<meta name="description" content=")[^"]*(")/, `$1${esc(desc)}$2`, `${label} description`);
  html = strictReplace(html, /(<link rel="canonical" href=")[^"]*(")/, `$1${esc(url)}$2`, `${label} canonical`);
  if (type) html = strictReplace(html, /(<meta property="og:type" content=")[^"]*(")/, `$1${type}$2`, `${label} og:type`);
  html = strictReplace(html, /(<meta property="og:url" content=")[^"]*(")/, `$1${esc(url)}$2`, `${label} og:url`);
  html = strictReplace(html, /(<meta property="og:title" content=")[^"]*(")/, `$1${esc(ogTitle)}$2`, `${label} og:title`);
  html = strictReplace(html, /(<meta property="og:description" content=")[^"]*(")/, `$1${esc(ogDesc)}$2`, `${label} og:desc`);
  if (image) html = strictReplace(html, /(<meta property="og:image" content=")[^"]*(")/, `$1${esc(image)}$2`, `${label} og:image`);
  html = strictReplace(html, /(<meta name="twitter:title" content=")[^"]*(")/, `$1${esc(ogTitle)}$2`, `${label} twitter:title`);
  html = strictReplace(html, /(<meta name="twitter:description" content=")[^"]*(")/, `$1${esc(ogDesc)}$2`, `${label} twitter:desc`);
  if (image) html = strictReplace(html, /(<meta name="twitter:image" content=")[^"]*(")/, `$1${esc(image)}$2`, `${label} twitter:image`);
  // The template's 1200×630 size belongs to og-image.jpg; a listing photo has its own, so let the reader measure it
  if (image && !/\/og-image\.jpg$/.test(image)) html = html.replace(/\s*<meta property="og:image:(?:width|height)" content="\d+" \/>/g, '');
  if (image) html = html.replace('</head>', `    <meta property="og:image:alt" content="${esc(ogTitle)}" />\n  </head>`);
  return html;
}

/** Listings visitors can see (same filter as the build and /api/catalog) */
export const isPublicListing = (p) => Boolean(p?.id) && !p.isDemo && !p.deleted && !p.isDeleted
  && !['trash', 'hidden', 'draft', 'sold'].includes(p.status) && !['pending', 'rejected'].includes(p.approval);

export const isPublicProject = (p) => Boolean(p?.id) && !p.isDemo && !p.isHidden && !p.isDeleted && !p.deleted
  && p.status !== 'hidden' && !['pending', 'rejected'].includes(p.approval);

/** The type of a request as people say it («شقة سكنية»), the same groups the requests page uses */
const DEMAND_TYPE_AR = {
  apartment: 'شقة سكنية', villa: 'فيلا أو بيت', house: 'فيلا أو بيت', retail: 'محل تجاري', commercial: 'محل تجاري', shop: 'محل تجاري',
  office: 'مكتب أو عيادة', administrative: 'مكتب أو عيادة', clinic: 'مكتب أو عيادة', land: 'أرض', building: 'أرض أو مبنى'
};

/**
 * Shell for one buyer request (/demands/<id>): what is wanted, where and for how much as the link
 * preview Facebook / WhatsApp show, and the request's text in #root. `d` is a public_demands
 * document (no contact data is ever stored there).
 */
export function buildDemandShell(template, d, origin) {
  origin = String(origin || 'https://www.1lineestate.com').replace(/\/+$/, '');
  const type = DEMAND_TYPE_AR[d.type] || 'عقار';
  const area = sanitizeMetaText(d.area_ar || '');
  const budget = fmtPrice(d.budget);
  const headline = `مطلوب للشراء: ${type}${area ? ` في ${area}` : ''}`;
  const text = sanitizeMetaText(d.text_ar || '');
  const desc = [budget ? `الميزانية حتى ${budget}` : '', text].filter(Boolean).join(' — ').slice(0, 180)
    || 'طلب شراء حقيقي على 1Line. عندك وحدة مناسبة؟ تواصل معانا.';
  const url = `${origin}/demands/${encodeURIComponent(d.id)}`;
  const html = headTags(template, {
    title: `${headline} | 1Line Solutions`, desc, url, ogTitle: `${headline}${budget ? ` بميزانية ${budget}` : ''}`,
    ogDesc: `${text ? `${text.slice(0, 140)} — ` : ''}عندك وحدة مناسبة أو تعرف مالك؟ اعرضها على 1Line.`, type: 'article', label: 'demand'
  });
  const body = nav([['/', 'الرئيسية'], ['/demands', 'طلبات المشترين'], ['', headline]])
    + `<article><h1>${esc(headline)}</h1>${text ? `<p>${esc(text)}</p>` : ''}`
    + list([budget ? `الميزانية: حتى ${esc(budget)}` : '', area ? `المنطقة: ${esc(area)}` : ''].filter(Boolean))
    + '<p><a href="/sell">عندك وحدة مناسبة؟ اعرضها على 1Line</a></p></article>' + footerNav();
  return withRoot(html, body, 'demand');
}
