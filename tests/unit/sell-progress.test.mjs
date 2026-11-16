import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sellProgress, SELL_STEP_COUNT } from '../../src/utils/sellProgress.js';

const full1 = { propertyType: 'apartment', area: 'x', size: '٩٠', address: 'شارع النيل' };

test('there are 4 steps', () => assert.equal(SELL_STEP_COUNT, 4));
test('empty form is 0% of 4', () => {
  const p = sellProgress({});
  assert.equal(p.percent, 0);
  assert.equal(p.total, 4);
  assert.equal(p.next, 'type');
});
test('half of step 1 is 12.5%, rounded', () => {
  assert.equal(sellProgress({ propertyType: 'a', area: 'x' }).percent, 13);
});
test('finishing step 1 is 1 of 4 and 25%', () => {
  const p = sellProgress(full1, 0);
  assert.equal(p.done, 1);
  assert.equal(p.percent, 25);
  assert.equal(p.next, 'continue');
});
test('size under 20 and short address do not count', () => {
  assert.equal(sellProgress({ size: '5', address: 'ab' }).done, 0);
});
test('specs count once the guest moves past them; going back keeps them', () => {
  assert.equal(sellProgress(full1, 1).done, 1);
  assert.equal(sellProgress(full1, 2).done, 2);
  assert.equal(sellProgress(full1, 0, 2).done, 2);
  assert.equal(sellProgress(full1, 1).next, 'specs');
});
test('photos step: hint asks for photos until there are some', () => {
  assert.equal(sellProgress(full1, 2).next, 'photos');
  assert.equal(sellProgress({ ...full1, photoSlots: { f: 'u' } }, 2).next, 'continue');
  assert.equal(sellProgress({ ...full1, photoSlots: { f: 'u' } }, 2).done, 3);
});
test('contact step reaches 100% with name and phone', () => {
  const a = { ...full1, photoSlots: { f: 'u' }, name: 'محمود', phone: '01028394756' };
  const p = sellProgress(a, 3);
  assert.equal(p.percent, 100);
  assert.equal(p.done, 4);
  assert.equal(p.next, 'send');
  assert.equal(sellProgress({ ...a, phone: '' }, 3).next, 'phone');
});
