import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toLatinDigits } from '../../src/utils/latinDigits.js';

test('Arabic-Indic and Persian digits become 0-9; everything else is untouched', () => {
  assert.equal(toLatinDigits('٣ غرف • ٢٬٥٠٠٬٠٠٠ ج.م'), '3 غرف • 2,500,000 ج.م');
  assert.equal(toLatinDigits('۱۲۳۴۵۶۷۸۹۰'), '1234567890');
  assert.equal(toLatinDigits('Price 21,000 EGP'), 'Price 21,000 EGP');
  assert.equal(toLatinDigits('١٫٥ مليون'), '1.5 مليون');
  assert.equal(toLatinDigits(null), '');
});
