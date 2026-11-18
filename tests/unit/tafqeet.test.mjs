import { test } from 'node:test';
import assert from 'node:assert/strict';
import { numberToArabicWords, amountInArabicWords } from '../../src/utils/tafqeet.js';

test('small numbers and tens', () => {
  assert.equal(numberToArabicWords(0), 'صفر');
  assert.equal(numberToArabicWords(7), 'سبعة');
  assert.equal(numberToArabicWords(15), 'خمسة عشر');
  assert.equal(numberToArabicWords(21), 'واحد وعشرون');
  assert.equal(numberToArabicWords(250), 'مائتان وخمسون');
});

test('thousands follow the counted-noun rules', () => {
  assert.equal(numberToArabicWords(1000), 'ألف');
  assert.equal(numberToArabicWords(2000), 'ألفان');
  assert.equal(numberToArabicWords(3000), 'ثلاثة آلاف');
  assert.equal(numberToArabicWords(10000), 'عشرة آلاف');
  assert.equal(numberToArabicWords(50000), 'خمسون ألف');
  assert.equal(numberToArabicWords(75500), 'خمسة وسبعون ألف وخمسمائة');
  assert.equal(numberToArabicWords(103000), 'مائة وثلاثة آلاف');
});

test('millions and billions', () => {
  assert.equal(numberToArabicWords(3500000), 'ثلاثة ملايين وخمسمائة ألف');
  assert.equal(numberToArabicWords(1250000), 'مليون ومائتان وخمسون ألف');
  assert.equal(numberToArabicWords(2000000000), 'ملياران');
});

test('receipt phrase uses the real amount', () => {
  assert.equal(amountInArabicWords(50000), 'فقط خمسون ألف جنيه مصري لا غير');
  assert.equal(amountInArabicWords(120000), 'فقط مائة وعشرون ألف جنيه مصري لا غير');
});
