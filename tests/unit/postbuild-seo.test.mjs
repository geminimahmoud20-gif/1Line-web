import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { buildPropertyShell, routeShellConfigs } from '../../scripts/postbuild-seo.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const templateHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8')
  .replaceAll('%VITE_SITE_URL%', 'https://1-line-qkzp9.vercel.app');

test('buildPropertyShell: generates complete metadata for listing 1 (prop-1792517248233)', () => {
  const p1 = {
    id: 'prop-1792517248233',
    title_ar: 'شقة فاخرة للبيع كورنيش النيل سوهاج',
    title_en: 'Luxury Nile Corniche Apartment Sohag',
    description_ar: 'شقة 200م تشطيب ألترا سوبر لوكس بإطلالة بانورامية مباشرة على النيل بسوهاج.',
    locationName_ar: 'كورنيش النيل، سوهاج',
    price: 4500000,
    size: 200,
    images: ['https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80'],
    ownerName: 'محمد أحمد (سري)',
    ownerPhone: '01299887766',
    clientPhone: '01012345678',
    status: 'published'
  };

  const html = buildPropertyShell(templateHtml, p1, 'https://1-line-qkzp9.vercel.app');

  // 1. Title & Description
  assert.ok(html.includes('<title>شقة فاخرة للبيع كورنيش النيل سوهاج | 1Line Solutions</title>'));
  assert.ok(html.includes('content="شقة 200م تشطيب ألترا سوبر لوكس بإطلالة بانورامية مباشرة على النيل بسوهاج."'));

  // 2. Canonical URL
  assert.ok(html.includes('<link rel="canonical" href="https://1-line-qkzp9.vercel.app/properties/prop-1792517248233"'));

  // 3. Open Graph Tags
  assert.ok(html.includes('<meta property="og:type" content="article"'));
  assert.ok(html.includes('<meta property="og:url" content="https://1-line-qkzp9.vercel.app/properties/prop-1792517248233"'));
  assert.ok(html.includes(`<meta property="og:image" content="${p1.images[0].replace(/&/g, '&amp;')}"`));

  // 4. Twitter / X Card Tags
  assert.ok(html.includes('<meta name="twitter:card" content="summary_large_image"'));
  assert.ok(html.includes('<meta name="twitter:title" content="شقة فاخرة للبيع كورنيش النيل سوهاج | 1Line Solutions"'));
  assert.ok(html.includes(`<meta name="twitter:image" content="${p1.images[0].replace(/&/g, '&amp;')}"`));

  // 5. Schema.org BreadcrumbList & RealEstateListing
  assert.ok(html.includes('id="breadcrumb-schema"'));
  assert.ok(html.includes('"@type": "BreadcrumbList"'));
  assert.ok(html.includes('"@type": "RealEstateListing"'));
  assert.ok(html.includes('https://1-line-qkzp9.vercel.app/properties/prop-1792517248233'));

  // 6. Privacy & Safety: NO PII in output
  assert.ok(!html.includes('01299887766'), 'Owner phone must not appear in metadata');
  assert.ok(!html.includes('01012345678'), 'Client phone must not appear in metadata');
  assert.ok(!html.includes('محمد أحمد (سري)'), 'Owner name must not appear in metadata');
});

test('buildPropertyShell: generates complete metadata for listing 2 (prop-imp-mutwknz3-137)', () => {
  const p2 = {
    id: 'prop-imp-mutwknz3-137',
    title_ar: 'محل تجاري للبيع في مجمع البنوك سوهاج الجديدة',
    title_en: 'Commercial Shop for Sale New Sohag Banks Complex',
    description_ar: 'محل تجاري 85م بموقع استراتيجي متميز أمام البنوك الرئيسية بسوهاج الجديدة، مع تسهيلات في السداد.',
    locationName_ar: 'سوهاج الجديدة - مجمع البنوك',
    price: 2800000,
    size: 85,
    images: ['https://images.unsplash.com/photo-1582037928769-181f2644ecb7?auto=format&fit=crop&w=1200&q=80'],
    ownerName: 'المالك: الحاج محمود',
    ownerPhone: '01123456789',
    status: 'published'
  };

  const html = buildPropertyShell(templateHtml, p2, 'https://1-line-qkzp9.vercel.app');

  assert.ok(html.includes('<title>محل تجاري للبيع في مجمع البنوك سوهاج الجديدة | 1Line Solutions</title>'));
  assert.ok(html.includes('<link rel="canonical" href="https://1-line-qkzp9.vercel.app/properties/prop-imp-mutwknz3-137"'));
  assert.ok(html.includes('<meta property="og:title" content="محل تجاري للبيع في مجمع البنوك سوهاج الجديدة | 1Line Solutions"'));
  assert.ok(html.includes('<meta name="twitter:title" content="محل تجاري للبيع في مجمع البنوك سوهاج الجديدة | 1Line Solutions"'));
  assert.ok(html.includes('id="breadcrumb-schema"'));
  assert.ok(html.includes('"@type": "RealEstateListing"'));
  assert.ok(!html.includes('01123456789'), 'Owner phone must not appear in metadata');
  assert.ok(!html.includes('الحاج محمود'), 'Owner name must not appear in metadata');
});

test('buildPropertyShell: throws an error if template misses required meta tag (cannot silently fail)', () => {
  const brokenTemplate = '<html><head><title>Test</title></head><body></body></html>';
  assert.throws(() => {
    buildPropertyShell(brokenTemplate, { id: 'test-1', title_ar: 'عقار تجريبي' }, 'https://1-line-qkzp9.vercel.app');
  }, /Mandatory template tag/);
});

test('routeShellConfigs: every sitemap route without a hand-written shell gets one from the app titles', () => {
  const routes = [['/', '1.0'], ['/sell', '0.9'], ['/valuation', '0.9'], ['/projects', '0.8'], ['/demands', '0.6'], ['/my-account', '0.1'], ['/unknown', '0.1']];
  const out = routeShellConfigs(routes, [{ path: 'projects' }]);
  assert.deepEqual(out.map((c) => c.path), ['sell', 'valuation', 'demands']);
  assert.match(out[0].title, /\| 1Line Solutions$/);
  assert.ok(out[0].desc.length > 20);
});
