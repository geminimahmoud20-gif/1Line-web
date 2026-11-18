import test from 'node:test';
import assert from 'node:assert/strict';
import { parseGuide, guidePath, guideRows, rowFigure, guideCopy, guideFaq, guidePages } from '../../src/utils/seoGuides.js';
import { buildGuideShell } from '../../src/utils/seoShell.js';
import { sitemapUrls } from '../../src/utils/sitemapXml.js';
import { LANDING_AREAS } from '../../src/utils/seoLanding.js';

const ns = LANDING_AREAS.find((a) => a.id === 'new_sohag');
const mk = (id, type, areaKey, price, size, extra = {}) => ({ id, type, areaKey, price, size, status: 'published', ...extra });
const list = [
  mk('a', 'apartment', 'new_sohag', 2_000_000, 100),
  mk('b', 'apartment', 'new_sohag', 3_000_000, 100),
  mk('c', 'duplex', 'new_sohag', 4_500_000, 150),
  mk('d', 'apartment', 'east', 1_000_000, 100),
  mk('e', 'land', 'new_sohag', 900_000, 0),
  mk('f', 'apartment', 'new_sohag', 1, 1, { isDemo: true }),
  mk('g', 'commercial', 'new_sohag', 5_000_000, 50)
];

test('guide URLs parse and print back', () => {
  assert.equal(parseGuide('price-per-meter-sohag').area, null);
  assert.equal(parseGuide('price-per-meter-new-sohag').area.id, 'new_sohag');
  assert.equal(parseGuide('price-per-meter-mars'), null);
  assert.equal(parseGuide('other'), null);
  assert.equal(guidePath(ns), '/guides/price-per-meter-new-sohag');
});

test('figures come from listings with a size; a median needs three', () => {
  const rows = guideRows(list, ns);
  const apt = rows.find((r) => r.kind.slug === 'apartments-for-sale');
  assert.equal(apt.count, 3);
  assert.equal(apt.medianPpm, 30_000);
  assert.match(rowFigure(apt), /حوالي 30,000 ج\.م/);
  const shops = rows.find((r) => r.kind.slug === 'shops-for-sale');
  assert.equal(shops.medianPpm, 0);
  assert.match(rowFigure(shops), /عرض واحد فقط/);
  assert.equal(rows.find((r) => r.kind.slug === 'land-for-sale'), undefined); // no size → no price per m²
});

test('copy and FAQ quote the real figures; an empty place says so and quotes nothing', () => {
  const rows = guideRows(list, ns);
  assert.match(guideCopy(ns, rows).description, /30,000/);
  assert.ok(guideCopy(ns, rows).description.length <= 165);
  assert.match(guideFaq(ns, rows)[0].a, /30,000/);
  assert.match(guideCopy(null, []).intro, /لسه مفيش/);
});

test('only places with figures get a page, in the sitemap too', () => {
  assert.deepEqual(guidePages(list).map((g) => g.path), ['/guides/how-to-buy-apartment-sohag', '/guides/how-to-buy-land-sohag', '/guides/real-estate-financing-egypt', '/guides/price-per-meter-sohag', '/guides/price-per-meter-new-sohag', '/guides/price-per-meter-east-sohag']);
  assert.deepEqual(guidePages([]).map((g) => g.path), ['/guides/how-to-buy-apartment-sohag', '/guides/how-to-buy-land-sohag', '/guides/real-estate-financing-egypt']); // the article needs no listings
  const locs = sitemapUrls({ listings: list }).map((u) => u.loc);
  assert.ok(locs.includes('/guides/price-per-meter-new-sohag'));
  assert.ok(!sitemapUrls({ listings: [] }).some((u) => u.loc.startsWith('/guides/price')));
});

test('the shell puts the figures and FAQ in #root and the canonical in the head', () => {
  const tpl = '<html><head><title>x</title><meta name="description" content="x"><link rel="canonical" href="x"><meta property="og:url" content="x"><meta property="og:title" content="x"><meta property="og:description" content="x"><meta name="twitter:title" content="x"><meta name="twitter:description" content="x"></head><body><div id="root"></div></body></html>';
  const html = buildGuideShell(tpl, { area: ns }, list, 'https://example.com');
  assert.match(html, /canonical" href="https:\/\/example.com\/guides\/price-per-meter-new-sohag"/);
  assert.match(html, /<h1>سعر المتر في سوهاج الجديدة<\/h1>/);
  assert.match(html, /30,000/);
  assert.match(html, /FAQPage/);
});

test('the buying guide parses, has a shell with its steps, and quotes no invented figure', () => {
  const g = parseGuide('how-to-buy-apartment-sohag');
  assert.ok(g.article && g.area === null);
  const tpl = '<html><head><title>x</title><meta name="description" content="x"><link rel="canonical" href="x"><meta property="og:url" content="x"><meta property="og:title" content="x"><meta property="og:description" content="x"><meta name="twitter:title" content="x"><meta name="twitter:description" content="x"></head><body><div id="root"></div></body></html>';
  const html = buildGuideShell(tpl, g, [], 'https://example.com');
  assert.match(html, /guides\/how-to-buy-apartment-sohag/);
  assert.match(html, /مراجعة|راجع الأوراق/);
  assert.match(html, /FAQPage/);
  assert.doesNotMatch(JSON.stringify(g.article), /\d+\s*(%|٪|في المية)/);
});

import { ARTICLES } from '../../src/utils/seoGuideArticles.js';
test('articles have unique slugs and quote no percentage or fee (those change by year)', () => {
  assert.equal(new Set(ARTICLES.map((a) => a.slug)).size, ARTICLES.length);
  for (const a of ARTICLES) {
    const body = JSON.stringify([a.intro, a.sections.map((s) => [s.p, s.ul]), a.faq]);
    assert.doesNotMatch(body, /[0-9٠-٩]+\s*(%|٪|جنيه|ج\.م)/, a.slug);
    assert.ok(a.description.length <= 165, a.slug);
  }
});
