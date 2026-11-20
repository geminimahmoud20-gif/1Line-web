import test from 'node:test';
import assert from 'node:assert/strict';
import { niceMax, smoothPath, toneAt, fmt } from '../../src/utils/chartMath.js';

test('the axis top is a round number at or above the data', () => {
  assert.equal(niceMax(0), 1);
  assert.equal(niceMax(3), 5);
  assert.equal(niceMax(7), 10);
  assert.equal(niceMax(12), 20);
  assert.equal(niceMax(48), 50);
  assert.equal(niceMax(101), 200);
  for (const v of [1, 2, 4, 9, 11, 33, 77, 640, 1234]) assert.ok(niceMax(v) >= v, `${v} fits under ${niceMax(v)}`);
});

test('the smooth path starts at the first point, ends at the last and has no NaN', () => {
  const d = smoothPath([[0, 10], [100, 40], [200, 20], [300, 60]]);
  assert.ok(d.startsWith('M0.0,10.0'));
  assert.ok(d.endsWith('L300.0,60.0'));
  assert.ok(!/NaN|undefined/.test(d));
  assert.equal(smoothPath([]), '');
  assert.equal(smoothPath([[5, 6]]), 'M5,6');
  assert.equal(smoothPath([[0, 1], [10, 2]]), 'M0.0,1.0 L10.0,2.0');
});

test('series colours cycle through the tone list and numbers read in plain digits', () => {
  assert.equal(toneAt(0), 'info');
  assert.equal(toneAt(5), toneAt(0));
  assert.equal(fmt(1234.56), '1,234.6');
  assert.equal(fmt(0), '0');
});
