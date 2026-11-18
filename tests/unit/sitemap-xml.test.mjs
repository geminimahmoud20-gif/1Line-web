import test from 'node:test';
import assert from 'node:assert/strict';
import { sitemapUrls, renderSitemap, STATIC_ROUTES } from '../../src/utils/sitemapXml.js';

const listing = (o) => ({ id: 'p1', type: 'apartment', areaKey: 'new_sohag', price: 2000000, status: 'published', createdAt: '2026-11-01T10:00:00Z', ...o });

test('the static pages are always there; private ones never', () => {
  const urls = sitemapUrls({ today: '2026-11-13' }).map((u) => u.loc);
  for (const [loc] of STATIC_ROUTES) assert.ok(urls.includes(loc), loc);
  assert.ok(!urls.some((u) => u.startsWith('/crm') || u.startsWith('/my-account')));
});

test('a listing adds its page and the search pages for its kind and area', () => {
  const urls = sitemapUrls({ listings: [listing({})], today: '2026-11-13' }).map((u) => u.loc);
  assert.ok(urls.includes('/properties/p1'));
  assert.ok(urls.includes('/sohag/apartments-for-sale'));
  assert.ok(urls.includes('/sohag/apartments-for-sale/new-sohag'));
  assert.ok(!urls.includes('/sohag/villas-for-sale'));
});

test('lastmod follows the content: the listing\'s own date, the newest for the pages that list them', () => {
  const urls = sitemapUrls({ listings: [listing({ id: 'a', updatedAt: '2026-11-05T00:00:00Z' }), listing({ id: 'b', updatedAt: '2026-11-09T00:00:00Z' })], today: '2026-11-13' });
  const get = (loc) => urls.find((u) => u.loc === loc).lastmod;
  assert.equal(get('/properties/a'), '2026-11-05');
  assert.equal(get('/properties'), '2026-11-09');
  assert.equal(get('/'), '2026-11-09');
  assert.equal(get('/sell'), '');
});

test('projects with unsafe ids are left out; the XML is valid and escaped', () => {
  const urls = sitemapUrls({ projects: [{ id: 'proj-1', updatedAt: '2026-11-02T00:00:00Z' }, { id: 'bad id<>' }], today: '2026-11-13' });
  assert.ok(urls.some((u) => u.loc === '/projects/proj-1'));
  assert.ok(!urls.some((u) => u.loc.includes('bad')));
  const xml = renderSitemap('https://www.1lineestate.com', [{ loc: '/properties/a&b', freq: 'weekly', priority: '0.8', lastmod: '' }]);
  assert.ok(xml.startsWith('<?xml'));
  assert.ok(xml.includes('<loc>https://www.1lineestate.com/properties/a&amp;b</loc>'));
  assert.ok(xml.trim().endsWith('</urlset>'));
});
