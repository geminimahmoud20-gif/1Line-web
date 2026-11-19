import test from 'node:test';
import assert from 'node:assert/strict';
import { nextImageAttempt, imageFailureReport, RETRY_DELAY_MS } from '../../src/utils/imageRetry.js';

const full = 'https://a.public.blob.vercel-storage.com/seller/x.jpg?sm=1';
const small = 'https://a.public.blob.vercel-storage.com/cms/thumbs/seller_x.w640.jpg';

test('small copy fails → the full photo at once, then once more after a pause, then give up', () => {
  assert.deepEqual(nextImageAttempt(0, full, small), { src: full, delay: 0 });
  assert.deepEqual(nextImageAttempt(1, full, small), { src: full, delay: RETRY_DELAY_MS });
  assert.equal(nextImageAttempt(2, full, small), null);
});
test('a photo with no small copy gets one delayed retry, then gives up', () => {
  assert.deepEqual(nextImageAttempt(0, 'https://x.com/a.jpg', 'https://x.com/a.jpg'), { src: 'https://x.com/a.jpg', delay: RETRY_DELAY_MS });
  assert.equal(nextImageAttempt(1, 'https://x.com/a.jpg', 'https://x.com/a.jpg'), null);
});
test('nothing to retry without an address', () => {
  assert.equal(nextImageAttempt(0, '', ''), null);
});
test('failure report: host and path only, never the query; none for data URLs', () => {
  const r = imageFailureReport('https://a.public.blob.vercel-storage.com/seller/x.jpg?sm=1&token=secret');
  assert.equal(r.source, 'https://a.public.blob.vercel-storage.com/seller/x.jpg');
  assert.ok(r.message.includes('a.public.blob.vercel-storage.com'));
  assert.equal(imageFailureReport('data:image/svg+xml,abc'), null);
  assert.equal(imageFailureReport(undefined), null);
});
