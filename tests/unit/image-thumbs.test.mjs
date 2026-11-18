import test from 'node:test';
import assert from 'node:assert/strict';
import { thumbPathFor, hasThumb, needsThumb, withThumbMarker, thumbUrl, isThumbPath } from '../../src/utils/imageThumbs.js';

const STORE = 'https://abc123.public.blob.vercel-storage.com';
const photo = `${STORE}/cms/images/1712-prop_9-front-wm-Xy7Rand.jpg`;

test('the small copy path is derived from the photo path, in its own folder', () => {
  assert.equal(thumbPathFor('cms/images/1712-a-wm-Xy7.jpg'), 'cms/thumbs/cms_images_1712-a-wm-Xy7.w640.jpg');
  assert.equal(thumbPathFor('/seller/1-ab.webp'), 'cms/thumbs/seller_1-ab.w640.jpg');
  assert.equal(isThumbPath('cms/thumbs/x.w640.jpg'), true);
});

test('only marked photos on our store load the small copy', () => {
  assert.equal(thumbUrl(photo), photo);
  const marked = withThumbMarker(photo);
  assert.equal(marked, `${photo}?sm=1`);
  assert.equal(hasThumb(marked), true);
  assert.equal(thumbUrl(marked), `${STORE}/cms/thumbs/cms_images_1712-prop_9-front-wm-Xy7Rand.w640.jpg`);
});

test('other photos are left as they are', () => {
  for (const u of ['https://images.unsplash.com/p?w=800', 'data:image/jpeg;base64,AAA', '/no-photo.svg', '', null]) {
    assert.equal(thumbUrl(u), u);
    assert.equal(needsThumb(u), false);
    assert.equal(withThumbMarker(u), u);
  }
});

test('a photo needs a small copy until it is marked; copies never need one', () => {
  assert.equal(needsThumb(photo), true);
  assert.equal(needsThumb(withThumbMarker(photo)), false);
  assert.equal(needsThumb(`${STORE}/cms/thumbs/a.w640.jpg`), false);
});
