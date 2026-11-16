import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sellProgress, SELL_STEP_COUNT } from '../../src/utils/sellProgress.js';

const full1 = { sellerRole: 'owner', propertyType: 'apartment', area: 'x', size: '٩٠', address: 'شارع النيل' };

test('there are 4 steps', () => assert.equal(SELL_STEP_COUNT, 4));
test('empty form is 0% of 4', () => {
  const p = sellProgress({});
  assert.equal(p.percent, 0);
  assert.equal(p.total, 4);
  assert.equal(p.next, 'role');
});
test('the owner / broker answer counts and comes first', () => {
  assert.equal(sellProgress({ sellerRole: 'broker' }).next, 'type');
  assert.equal(sellProgress({ sellerRole: 'someone else' }).next, 'role');
});
test('part of step 1 counts as a fraction of its quarter', () => {
  // role + type + area = 3 of 5 answers -> 0.6 of 25% = 15%
  assert.equal(sellProgress({ sellerRole: 'owner', propertyType: 'a', area: 'x' }).percent, 15);
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

test('the last step follows the form\'s own checks when given', () => {
  const a = { ...full1, photoSlots: { f: 'u' }, name: 'محمود', phone: '00000000000' };
  assert.equal(sellProgress(a, 3).percent, 100); // loose check: looks complete
  const strict = sellProgress(a, 3, 3, { contactOk: { name: true, phone: false } });
  assert.equal(strict.percent, 88);
  assert.equal(strict.next, 'phone');
  assert.equal(sellProgress(a, 3, 3, { contactOk: { name: true, phone: true } }).percent, 100);
});
