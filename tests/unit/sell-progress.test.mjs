import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sellProgress } from '../../src/utils/sellProgress.js';

test('empty form is 0%', () => assert.equal(sellProgress({}).percent, 0));
test('counts each answered item', () => {
  const p = sellProgress({ propertyType: 'apartment', area: 'x', size: '٩٠', address: 'شارع النيل' });
  assert.equal(p.done, 4);
  assert.equal(p.percent, 57);
});
test('size under 20 and short address do not count', () => {
  assert.equal(sellProgress({ size: '5', address: 'ab' }).done, 0);
});
test('full form is 100%', () => {
  const p = sellProgress({ propertyType: 'a', area: 'x', size: '100', address: 'abc', photoSlots: { f: 'u' }, name: 'محمود', phone: '01028394756' });
  assert.equal(p.percent, 100);
});
