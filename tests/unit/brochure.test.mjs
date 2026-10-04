import { test } from 'node:test';
import assert from 'node:assert/strict';
import { brochureData, brochureCode } from '../../src/utils/brochure/brochureData.js';

const NOW = new Date('2026-10-10T12:00:00').getTime();

test('brochure: cash unit shows only recorded facts, no installment plan', () => {
  const d = brochureData({ id: 'abc123xyz', unitCode: 'SH-101', title_ar: 'شقة 150 م', type: 'apartment', price: 2500000, size: 150, bedrooms: 3 }, { now: NOW, siteUrl: 'https://x.test/' });
  assert.equal(d.code, 'SH-101');
  assert.deepEqual(d.price, { now: '2,500,000 ج.م' });
  assert.equal(d.plan, null);
  assert.deepEqual(d.specs.map(([k]) => k), ['النوع', 'المساحة', 'غرف النوم']); // no made-up finishing or status
  assert.equal(d.legal.length, 0);
  assert.equal(d.url, 'https://x.test/properties/abc123xyz');
});

test('brochure: running offer shows the discounted cash price', () => {
  const d = brochureData({
    id: 'p1', price: 3450000, status: 'published',
    offer: { type: 'cash_discount', price: 3000000, from: '2026-10-05', until: '2026-10-15' }
  }, { now: NOW });
  assert.equal(d.price.now, '3,000,000 ج.م');
  assert.equal(d.price.was, '3,450,000 ج.م');
  assert.equal(d.price.discount, '450,000 ج.م');
  assert.equal(d.price.until, '15/10/2026');
});

test('brochure: plan only when the listing has one; legal rows from the record', () => {
  const d = brochureData({ id: 'p2', price: 1, installmentYears: 2, monthlyInstallment: 20000, downPayment: 300000, legalStatus: { ownershipType_ar: 'مسجل', reviewedBy: 'أ. سامي' } }, { now: NOW });
  assert.deepEqual(d.plan, { down: '300,000 ج.م', monthly: '20,000 ج.م', years: 'سنتين' });
  assert.deepEqual(d.legal, [['سند الملكية والشهر العقاري', 'مسجل'], ['راجعه', 'أ. سامي']]);
  assert.equal(brochureCode({ id: 'abcdefghijkl' }), 'ABCDEFGH');
});
