import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MAX_SELLER_PHOTOS, photoSlotsFor, featuresFor, featureLabels, orderedPhotos, withoutContact, sellerAssetClass
} from '../../src/utils/sellerListing.js';
import { SELLER_UPLOAD, validSellerPath, sameSite, createRateLimiter } from '../../api/_seller-upload-core.js';
import { sanitizeObject } from '../../src/utils/securityShield.js';

test('every kind of property has at most 8 photo spots with unique ids', () => {
  for (const type of ['apartment', 'villa', 'retail', 'office', 'land']) {
    const slots = photoSlotsFor(type);
    assert.ok(slots.length > 0 && slots.length <= MAX_SELLER_PHOTOS, type);
    assert.equal(new Set(slots.map((s) => s.id)).size, slots.length, type);
    for (const s of slots) assert.ok(s.ar && s.en && s.hint_ar, `${type}/${s.id}`);
  }
});

test('shops and offices ask for 2 street, frontage, building and 2 inside photos', () => {
  for (const type of ['retail', 'office']) {
    assert.equal(sellerAssetClass(type), 'commercial');
    const ids = photoSlotsFor(type).map((s) => s.id);
    assert.deepEqual(ids.slice(0, 6), ['street_1', 'street_2', 'facade', 'building', 'interior_1', 'interior_2']);
  }
});

test('photos come out in spot order with their labels, ignoring spots of another kind', () => {
  const { images, photoLabels } = orderedPhotos('retail', {
    interior_1: 'https://x/3.jpg',
    street_1: 'https://x/1.jpg',
    facade: 'https://x/2.jpg',
    living: 'https://x/other.jpg',
    street_2: ''
  });
  assert.deepEqual(images, ['https://x/1.jpg', 'https://x/2.jpg', 'https://x/3.jpg']);
  assert.deepEqual(photoLabels, ['الشارع (اتجاه أول)', 'الواجهة', 'من الداخل']);
  assert.deepEqual(orderedPhotos('apartment', undefined), { images: [], photoLabels: [] });
});

test('feature labels follow the property kind', () => {
  assert.ok(featuresFor('retail').some((f) => f.id === 'glass_front'));
  assert.ok(!featuresFor('apartment').some((f) => f.id === 'glass_front'));
  assert.deepEqual(featureLabels('apartment', ['elevator', 'glass_front', 'parking']), ['أسانسير', 'مكان ركنة']);
});

test('request details never carry contact fields', () => {
  const out = withoutContact({ name: 'A', phone: '+201', whatsapp: '+201', email: 'a@b.co', size: '120', images: ['u'] });
  assert.deepEqual(out, { size: '120', images: ['u'] });
});

test('sanitizeObject keeps lists as lists', () => {
  const out = sanitizeObject({ images: ['https://x/1.jpg', '<b>x</b>'], photos: [{ url: 'https://x/1.jpg', label: 'الشارع' }] });
  assert.ok(Array.isArray(out.images));
  assert.deepEqual(out.images, ['https://x/1.jpg', 'x']);
  assert.ok(Array.isArray(out.photos));
  assert.equal(out.photos[0].label, 'الشارع');
});

test('seller uploads: one folder, images only, same site, capped per address', () => {
  assert.ok(validSellerPath('seller/1700000000000-ab12cd.jpg'));
  assert.ok(validSellerPath('seller/x.webp'));
  for (const bad of ['cms/images/x.jpg', 'seller/../cms/x.jpg', 'seller/x.svg', 'seller/a/b.jpg', 'seller/x.jpg.html', '', null]) {
    assert.equal(validSellerPath(bad), false, String(bad));
  }
  assert.deepEqual(SELLER_UPLOAD.types, ['image/jpeg', 'image/webp']);

  assert.ok(sameSite('https://1line.example', '1line.example'));
  assert.equal(sameSite('https://evil.example', '1line.example'), false);
  assert.equal(sameSite(null, '1line.example'), false);
  assert.equal(sameSite('not a url', '1line.example'), false);

  let now = 0;
  const limited = createRateLimiter({ max: 3, windowMs: 1000 }, () => now);
  assert.deepEqual([1, 2, 3, 4].map(() => limited('ip')), [false, false, false, true]);
  assert.equal(limited('other'), false);
  now = 1001;
  assert.equal(limited('ip'), false);
});

test('shared rate limiter resets after its window', async () => {
  const { createRateLimiter } = await import('../../api/_rate-limit.js');
  let now = 0;
  const lim = createRateLimiter({ max: 1, windowMs: 10 }, () => now);
  assert.deepEqual([lim('a'), lim('a')], [false, true]);
  now = 11;
  assert.equal(lim('a'), false);
});
