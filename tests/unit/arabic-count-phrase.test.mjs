import { test } from 'node:test';
import assert from 'node:assert/strict';
import { countPhrase } from '../../src/utils/arabicCount.js';

test('counts read as they are said in Arabic', () => {
  assert.equal(countPhrase('property', 1), 'عقار واحد');
  assert.equal(countPhrase('property', 2), 'عقارين');
  assert.equal(countPhrase('property', 3), '3 عقارات');
  assert.equal(countPhrase('property', 12), '12 عقار');
  assert.equal(countPhrase('listing', 7), '7 عروض');
  assert.equal(countPhrase('area', 1), 'منطقة واحدة');
  assert.equal(countPhrase('listing', 7, false), '7 listings');
});
