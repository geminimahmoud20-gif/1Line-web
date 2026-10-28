import test from 'node:test';
import assert from 'node:assert/strict';
import { heroSlides, slideIntervalMs } from '../../src/utils/videoPoster.js';

const DEFAULT = 'https://images.unsplash.com/photo-1?w=1600';

test('every video still has the same default picture: one slide, nothing to change between', () => {
  const clips = [{ id: 'a', poster: DEFAULT }, { id: 'b', poster: DEFAULT }, { id: 'c', poster: DEFAULT }];
  assert.deepEqual(heroSlides(clips, DEFAULT).map((s) => s.poster), [DEFAULT]);
});

test('one still per video, in playlist order, repeats and unusable pictures left out', () => {
  const clips = [
    { id: 'a', poster: 'https://x/a.jpg', title_ar: 'أ' },
    { id: 'b', poster: '' },
    { id: 'c', poster: 'data:image/jpeg;base64,AAA' },
    { id: 'd', poster: 'https://x/a.jpg' },
    { id: 'e', poster: 'https://x/e.jpg', title_en: 'E' },
    { id: 'f', poster: 'http://x/insecure.jpg' }
  ];
  const slides = heroSlides(clips, DEFAULT);
  assert.deepEqual(slides.map((s) => s.id), ['a', 'e']);
  assert.equal(slides[0].title_ar, 'أ');
  assert.equal(slides[1].title_en, 'E');
});

test('no videos or no pictures: the fallback poster, or nothing', () => {
  assert.deepEqual(heroSlides(undefined, DEFAULT).map((s) => s.poster), [DEFAULT]);
  assert.deepEqual(heroSlides([{ id: 'a', poster: '/hero/a.jpg' }], DEFAULT).map((s) => s.poster), ['/hero/a.jpg']);
  assert.deepEqual(heroSlides([], ''), []);
});

test('interval follows the CMS setting, never under 5 seconds', () => {
  assert.equal(slideIntervalMs(30), 30000);
  assert.equal(slideIntervalMs(2), 5000);
  assert.equal(slideIntervalMs(undefined), 10000);
});
