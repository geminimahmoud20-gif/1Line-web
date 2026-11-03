import { test } from 'node:test';
import assert from 'node:assert/strict';
import { demandCaption, demandHashtags } from '../../src/utils/demandShareCard.js';

test('the caption has no emoji and ends with the link and hashtags', () => {
  const c = demandCaption(
    { text_ar: 'مطلوب شقة بكمبوند ريتاج 2 فوق 150م فيو لاندسكيب', budget: 4000000, paymentMethod: 'cash' },
    { areaName: 'سوهاج الجديدة', typeLabel: 'شقة سكنية', url: 'https://www.1lineestate.com/demands#demand-d1', whatsapp: '0122 322 2956' }
  );
  assert.match(c, /^مطلوب للشراء: شقة سكنية في سوهاج الجديدة/);
  assert.match(c, /الميزانية: حتى 4,000,000 ج.م/);
  assert.match(c, /طريقة الدفع: كاش/);
  assert.match(c, /https:\/\/www.1lineestate.com\/demands#demand-d1/);
  assert.match(c, /#عقارات_سوهاج #سوهاج_الجديدة #مطلوب_شقة_سكنية #1Line$/);
  assert.doesNotMatch(c, /[\u{1F300}-\u{1FAFF}�]/u);
  assert.doesNotMatch(c, /\n\n\n/);
});

test('hashtags skip the generic governorate name', () => {
  assert.equal(demandHashtags({ areaName: 'محافظة سوهاج' }), '#عقارات_سوهاج #1Line');
});
