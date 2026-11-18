import { test } from 'node:test';
import assert from 'node:assert/strict';
import { listingSampleFlags, projectSampleFlags } from '../../src/utils/sampleDataFlags.js';

test('flags listings saved with the old form defaults', () => {
  const old = {
    images: ['https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80'],
    description_ar: 'شقة فاخرة بموقع حيوي متكامل الخدمات وإطلالة ممتازة كاملة المرافق.',
    price: 2500000, size: 150, bedrooms: 3, featured: true, badge_ar: 'عرض مميز', priorityRank: 90,
  };
  assert.equal(listingSampleFlags(old).length, 4);
  assert.deepEqual(listingSampleFlags({ ...old, isDemo: true }), []);
  assert.deepEqual(listingSampleFlags({ images: ['/u/real.jpg'], price: 2500000, size: 160, bedrooms: 3 }), []);
});

test('flags projects saved with the old defaults', () => {
  const flags = projectSampleFlags({ progress: 75, deliveryDate_ar: 'ديسمبر 2026', totalUnits: 150, availableUnits: 25, roiEstimate: 12.5 });
  assert.equal(flags.length, 3);
  assert.deepEqual(projectSampleFlags({ progress: 40, totalUnits: 80 }), []);
});

test('public copy drops the stock photo, keeps real ones, leaves samples alone', async () => {
  const { withoutStockPhotos } = await import('../../src/utils/sampleDataFlags.js');
  const stock = 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800';
  assert.deepEqual(withoutStockPhotos({ images: [stock, '/real.jpg'] }).images, ['/real.jpg']);
  const demo = { isDemo: true, images: [stock] };
  assert.equal(withoutStockPhotos(demo), demo);
  const clean = { images: ['/real.jpg'] };
  assert.equal(withoutStockPhotos(clean), clean);
});
