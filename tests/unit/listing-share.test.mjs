import { test } from 'node:test';
import assert from 'node:assert/strict';
import { listingCaption, listingPreview, priceLine } from '../../src/utils/listingShare.js';

const roof = { id: 'prop-1793018065030', title_ar: 'شقه روف علي المحور الرئيسي بموقع استيراتيجي', type: 'apartment', price: 2520000, size: 156, bedrooms: 3, floor: 5, completionStatus: 'ready', locationName_ar: 'سوهاج الجديدة', description_ar: 'روف 156م + 50م حديقة، للتواصل 01012345678', finishing_ar: 'سوبر لوكس' };

test('the link preview is the title, then price and facts', () => {
  const p = listingPreview(roof);
  assert.equal(p.title, 'شقه روف علي المحور الرئيسي بموقع استيراتيجي');
  assert.equal(p.description, '2,520,000 ج.م — 156 م² · 3 غرف · الدور 5 · استلام فوري · سوهاج الجديدة');
});

test('a plan leads with what is paid now', () => {
  const plan = { ...roof, paymentType: 'installment', price: 0, downPayment: 200000, installmentAmount: 30000, installmentEvery: 3, installmentMonths: 60 };
  assert.equal(priceLine(plan), 'المقدم 200,000 ج.م + قسط 30,000 ج.م ربع سنوي');
  const c = listingCaption(plan, { url: 'https://www.1lineestate.com/properties/x' });
  assert.match(c, /المقدم: 200,000 ج.م\n\+ قسط 30,000 ج.م كل 3 شهور لمدة 5 سنين \(20 قسط\)\nالإجمالي: 800,000 ج.م/);
});

test('the caption: no emoji, no WhatsApp bold, no phone from the description, link and hashtags', () => {
  const c = listingCaption(roof, { url: 'https://www.1lineestate.com/properties/prop-1793018065030', phone: '0122 322 2956', areaName: 'سوهاج الجديدة' });
  assert.match(c, /^شقه روف/);
  assert.match(c, /السعر: 2,520,000 ج.م \(كاش\)/);
  assert.match(c, /التشطيب: سوبر لوكس/);
  assert.match(c, /للمعاينة والتفاصيل: 0122 322 2956/);
  assert.match(c, /#عقارات_سوهاج #سوهاج_الجديدة #شقة_للبيع #1Line$/);
  assert.doesNotMatch(c, /01012345678|\*|[\u{1F300}-\u{1FAFF}�]/u);
});

test('the Facebook post: hook, ✓ facts, a reason to comment, phone, link, hashtags', async () => {
  const { facebookCaption } = await import('../../src/utils/listingShare.js');
  const c = facebookCaption(roof, { url: 'https://www.1lineestate.com/properties/x', phone: '0122 322 2956', areaName: 'سوهاج الجديدة' });
  const lines = c.split('\n');
  assert.equal(lines[0], 'شقة للبيع في سوهاج الجديدة | 156 م² | بـ 2,520,000 ج.م');
  assert.ok(lines.includes('✓ السعر: 2,520,000 ج.م كاش'));
  assert.ok(lines.includes('✓ 3 غرف'));
  assert.ok(lines.includes('✓ استلام فوري'));
  assert.match(c, /اكتب «تفاصيل» في الكومنت/);
  assert.match(c, /#عقارات_سوهاج #سوهاج_الجديدة #شقة_للبيع #1Line #وان_لاين$/);
  assert.doesNotMatch(c, /01012345678|[\u{1F300}-\u{1FAFF}�]/u);
  const plan = facebookCaption({ ...roof, paymentType: 'resale', price: 0, downPayment: 450000, installmentAmount: 60000, installmentEvery: 6, installmentMonths: 36 }, { areaName: 'سوهاج الجديدة' });
  assert.match(plan.split('\n')[0], /بـ 450,000 ج.م كاش للمالك وقسط نصف سنوي/);
  assert.match(plan, /✓ القسط: 60,000 ج.م نصف سنوي لمدة 3 سنين/);
});
