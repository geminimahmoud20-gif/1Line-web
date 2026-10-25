import test from 'node:test';
import assert from 'node:assert/strict';
import { cleanPixelId, metaEventFor } from '../../src/utils/metaPixel.js';
import { normalizeSiteSettings } from '../../src/utils/siteSettings.js';

test('a Pixel ID is 8–20 digits, spaces dropped', () => {
  assert.equal(cleanPixelId(' 1234 5678 9012 345 '), '123456789012345');
  assert.equal(cleanPixelId('fb-123456789'), '');
  assert.equal(cleanPixelId('1234567'), '');
  assert.equal(cleanPixelId(undefined), '');
});

test('site settings keep only a valid Pixel ID', () => {
  assert.deepEqual(normalizeSiteSettings({ tracking: { metaPixelId: '123456789012345' } }).tracking, { metaPixelId: '123456789012345' });
  assert.deepEqual(normalizeSiteSettings({ tracking: { metaPixelId: '<script>' } }).tracking, {});
  assert.deepEqual(normalizeSiteSettings(null).tracking, {});
});

test('our events map to Meta standard events with no personal data', () => {
  assert.equal(metaEventFor('page_view', { path: '/' }).name, 'PageView');
  const view = metaEventFor('property_view', { propertyId: 'prop-17', type: 'apartment', area: 'new_sohag', price: 2500000 });
  assert.deepEqual(view, { name: 'ViewContent', params: { content_type: 'product', content_ids: ['prop-17'], content_category: 'apartment', area: 'new_sohag', value: 2500000, currency: 'EGP' } });
  assert.deepEqual(metaEventFor('contact_click', { channel: 'phone', placement: 'unit page', phone: '0100' }), { name: 'Contact', params: { channel: 'phone', placement: 'unitpage' } });
  assert.deepEqual(metaEventFor('lead_submitted', { form: 'sell', name: 'Ali', phone: '0100' }), { name: 'Lead', params: { content_category: 'sell' } });
  assert.equal(metaEventFor('search', { q: 'شقة' }).params.q, undefined);
  assert.equal(metaEventFor('gallery_open'), null);
});
