import test from 'node:test';
import assert from 'node:assert/strict';
import { watermarkLayout, isWatermarked, watermarkedName } from '../../src/utils/watermark.js';

test('corner emblem scales with the photo, stays inside it, and the centre mark is faint', () => {
  const big = watermarkLayout(1600, 1200);
  assert.equal(big.corner.size, 150); // capped
  assert.ok(big.corner.x + big.corner.size < 1600 && big.corner.y + big.corner.size < 1200);
  assert.ok(big.center.opacity < 0.1 && big.corner.opacity > 0.5);
  const small = watermarkLayout(300, 200);
  assert.equal(small.corner.size, 44); // floor keeps it readable
  assert.ok(small.corner.x > 0 && small.corner.y > 0);
});

test('watermarked files are recognised by their "-wm" name', () => {
  assert.equal(watermarkedName('flat-1.jpg'), 'flat-1-wm.jpg');
  assert.equal(watermarkedName('seller/1700-ab12.jpg'), 'seller/1700-ab12-wm.jpg');
  assert.equal(watermarkedName('x-wm.jpg'), 'x-wm.jpg');
  assert.equal(isWatermarked('https://abc.public.blob.vercel-storage.com/cms/images/1700-p1-flat-wm-Xy12ab.jpg'), true);
  assert.equal(isWatermarked('https://abc.public.blob.vercel-storage.com/seller/1700-ab12-wm.jpg?download=1'), true);
  assert.equal(isWatermarked('https://images.example.com/swamp.jpg'), false);
  assert.equal(isWatermarked(''), false);
});
