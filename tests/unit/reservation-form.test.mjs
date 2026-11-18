import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildReservationHtml } from '../../src/utils/contractPdfGenerator.js';

const NOW = new Date('2026-11-12T10:00:00Z');

test('the reservation form prints Arabic as text, with the real values', () => {
  const html = buildReservationHtml({
    buyerName: 'زينب علي',
    buyerPhone: '01012345678',
    property: { id: 'p1', title_ar: 'شقة بشرق سوهاج', price: 1250000, size: 140 },
    depositAmount: 20000,
    paymentMethod: 'تحويل بنكي رسمي',
    transactionRef: 'TX-77'
  }, { now: NOW });
  assert.match(html, /<html lang="ar" dir="rtl">/);
  for (const s of ['زينب علي', 'شقة بشرق سوهاج', '1,250,000 ج.م', '20,000 ج.م', '140 م²', 'TX-77', 'P1']) assert.ok(html.includes(s), s);
});

test('missing values print as blanks to fill in, never sample numbers or claims', () => {
  const html = buildReservationHtml({}, { now: NOW });
  for (const s of ['3,500,000', '165', '35,000', 'VERIFIED', 'REF-OL', 'سوهاج الجديدة', 'رقم العملية']) assert.ok(!html.includes(s), s);
  assert.ok(html.includes('..............................'));
});

test('typed values are escaped', () => {
  const html = buildReservationHtml({ buyerName: '<img src=x onerror=alert(1)>' }, { now: NOW });
  assert.ok(!html.includes('<img src=x'));
  assert.ok(html.includes('&lt;img'));
});
