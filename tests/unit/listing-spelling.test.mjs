import test from 'node:test';
import assert from 'node:assert/strict';
import { fixListingSpelling, tidyListing } from '../../src/utils/listingSpelling.js';

test('the slips seen on the live listings are fixed', () => {
  assert.equal(fixListingSpelling('مكتب اداري بمشروع نايل بلازا _ موقع استيراتيجي _ كورنيش النيل'), 'مكتب إداري بمشروع نايل بلازا – موقع استراتيجي – كورنيش النيل');
  assert.equal(fixListingSpelling('فيلا _ مجاورة 7 _ خلف الرئيسي البحري استيلام فوري'), 'فيلا – مجاورة 7 – خلف الرئيسي البحري استلام فوري');
  assert.equal(fixListingSpelling('شقة استيلام فوري بموقع مميز علي المحور الرئيسي مباشرا'), 'شقة استلام فوري بموقع مميز على المحور الرئيسي مباشرةً');
  assert.equal(fixListingSpelling('شقة ناصيه  مميزه -جاردن سيتي 4'), 'شقة ناصية مميزة -جاردن سيتي 4');
  assert.equal(fixListingSpelling('وحده اداريه \\ طبيه في ازاليا مول '), 'وحدة إدارية / طبية في ازاليا مول');
  assert.equal(fixListingSpelling('شقه روف علي المحور الرئيسي بموقع استيراتيجي'), 'شقة روف على المحور الرئيسي بموقع استراتيجي');
  assert.equal(fixListingSpelling('مطلوب قطعه ارض متتوسط ب سوهاج الجديده'), 'مطلوب قطعة أرض متوسط ب سوهاج الجديدة');
});

test('only whole words: names and longer words are left alone', () => {
  assert.equal(fixListingSpelling('شقة باسم علي حسن'), 'شقة باسم علي حسن');     // the name «علي»
  assert.equal(fixListingSpelling('أرضية سيراميك'), 'أرضية سيراميك');
  assert.equal(fixListingSpelling('الاراضي الزراعية'), 'الاراضي الزراعية');     // «ارض» inside a longer word
  assert.equal(fixListingSpelling('بلوك_12'), 'بلوك_12');                       // an underscore inside a code
  assert.equal(fixListingSpelling(''), '');
  assert.equal(fixListingSpelling(undefined), undefined);
});

test('tidyListing fixes the Arabic text fields and keeps the same object when nothing changes', () => {
  const ok = { id: 'a', title_ar: 'شقة مميزة' };
  assert.equal(tidyListing(ok), ok);
  const fixed = tidyListing({ id: 'b', title_ar: 'شقه مميزه', description_ar: 'استيلام فوري', price: 1 });
  assert.deepEqual(fixed, { id: 'b', title_ar: 'شقة مميزة', description_ar: 'استلام فوري', price: 1 });
});
