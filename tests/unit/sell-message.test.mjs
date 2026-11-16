import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sellWhatsappMessage, firstName } from '../../src/utils/sellMessage.js';

test('first name', () => {
  assert.equal(firstName('  محمد محمود  '), 'محمد');
  assert.equal(firstName(''), '');
});
test('message lists what the owner filled in', () => {
  const m = sellWhatsappMessage({ name: 'محمد محمود', typeLabel: 'شقة', areaLabel: 'سوهاج الجديدة', size: '120', address: 'شارع النيل', askingPrice: '2,500,000' });
  assert.match(m, /أنا محمد محمود/);
  assert.match(m, /النوع: شقة/);
  assert.match(m, /المنطقة: سوهاج الجديدة/);
  assert.match(m, /المساحة: 120 م²/);
  assert.match(m, /العنوان: شارع النيل/);
  assert.match(m, /السعر المطلوب: 2,500,000 ج\.م/);
});
test('missing fields are left out, not shown empty', () => {
  const m = sellWhatsappMessage({ name: 'علي', typeLabel: 'أرض', size: '', address: '', askingPrice: '' });
  assert.ok(!m.includes('المساحة'));
  assert.ok(!m.includes('السعر'));
  assert.ok(!m.includes('العنوان'));
});
test('english copy', () => {
  assert.match(sellWhatsappMessage({ name: 'Ali', typeLabel: 'Apartment', isAr: false }), /Hello 1Line, I'm Ali/);
});

test('the sender says whether they own the property or broker it', () => {
  assert.match(sellWhatsappMessage({ name: 'علي', role: 'broker', typeLabel: 'شقة' }), /علي \(وسيط عقاري\)/);
  assert.match(sellWhatsappMessage({ name: 'علي', role: 'owner', typeLabel: 'شقة' }), /علي \(مالك العقار\)/);
  assert.ok(!sellWhatsappMessage({ name: 'علي', typeLabel: 'شقة' }).includes('('));
});
