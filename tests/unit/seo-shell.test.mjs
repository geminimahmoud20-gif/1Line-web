import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { buildPropertyShell, buildProjectShell, routeBody, isPublicListing, newestFirst } from '../../src/utils/seoShell.js';

const root = fileURLToPath(new URL('../../', import.meta.url));
const template = fs.readFileSync(path.join(root, 'index.html'), 'utf8').replaceAll('%VITE_SITE_URL%', 'https://www.1lineestate.com');
const rootText = (html) => html.slice(html.indexOf('<div id="root">'), html.indexOf('</main></div>'));

test('a listing page carries its text for search engines, without contact data', () => {
  const html = buildPropertyShell(template, {
    id: 'prop-9', title_ar: 'شقة 150م للبيع غرب سوهاج', type: 'apartment', price: 1500000, size: 150, bedrooms: 3, bathrooms: 2, floor: 4,
    locationName_ar: 'غرب سوهاج', description_ar: 'تشطيب سوبر لوكس، للتواصل 01012345678', features_ar: ['أسانسير', 'جراج'],
    images: ['https://example.com/a.jpg']
  }, 'https://www.1lineestate.com');
  const body = rootText(html);
  assert.match(body, /<h1>شقة 150م للبيع غرب سوهاج<\/h1>/);
  assert.match(body, /السعر: 1,500,000 ج.م/);
  assert.match(body, /المساحة: 150 م²/);
  assert.match(body, /الغرف: 3/);
  assert.match(body, /<li>أسانسير<\/li>/);
  assert.match(body, /<img src="https:\/\/example.com\/a.jpg" alt="شقة 150م/);
  assert.match(body, /href="\/properties"/);
  assert.doesNotMatch(body, /01012345678/);
  assert.match(html, /<link rel="canonical" href="https:\/\/www.1lineestate.com\/properties\/prop-9"/);
});

test('page text is escaped', () => {
  const body = rootText(buildPropertyShell(template, { id: 'x1', title_ar: '<script>alert(1)</script>', description_ar: 'a <b>b</b>' }, ''));
  assert.doesNotMatch(body, /<script>alert/);
  assert.match(body, /&lt;script&gt;/);
});

test('a project page gets its own shell', () => {
  const html = buildProjectShell(template, { id: 'mega-1', title_ar: 'كمبوند النخيل', developer_ar: 'شركة الأمل', location_ar: 'سوهاج الجديدة', startPrice: 900000, progress: 40 }, 'https://www.1lineestate.com');
  assert.match(html, /<title>كمبوند النخيل \| 1Line Solutions<\/title>/);
  assert.match(html, /<link rel="canonical" href="https:\/\/www.1lineestate.com\/projects\/mega-1"/);
  assert.match(rootText(html), /الأسعار تبدأ من: 900,000 ج.م/);
  assert.match(rootText(html), /نسبة التنفيذ: 40%/);
});

test('section pages link every listing, newest first; hidden ones are left out', () => {
  const listings = newestFirst([
    { id: 'a', title_ar: 'أقدم', createdAt: '2026-01-01' },
    { id: 'b', title_ar: 'أحدث', createdAt: '2026-10-01' },
    { id: 'c', title_ar: 'مخفي', status: 'hidden' },
    { id: 'd', title_ar: 'مستني موافقة', approval: 'pending' }
  ].filter(isPublicListing));
  const body = routeBody({ h1: 'العقارات', desc: 'كل العقارات', path: 'properties', listings });
  assert.ok(body.indexOf('/properties/b') < body.indexOf('/properties/a'));
  assert.doesNotMatch(body, /\/properties\/c|\/properties\/d/);
  assert.match(body, /<h1>العقارات<\/h1>/);
});
