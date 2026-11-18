import test from 'node:test';
import assert from 'node:assert/strict';
import { keyFacts } from '../../src/utils/keyFacts.js';

test('an apartment lists its filled facts in order', () => {
  const p = { type: 'apartment', size: 186, bedrooms: 3, bathrooms: 2, floor: 0, finishing_ar: 'نصف تشطيب', completionStatus: 'ready' };
  assert.deepEqual(keyFacts(p).map((f) => `${f.key}:${f.value}`), ['size:186 م²', 'rooms:3 غرف', 'baths:2 حمامين', 'floor:أرضي', 'finishing:نصف تشطيب', 'handover:فوري']);
});

test('land skips rooms and floors, and empty facts never show', () => {
  const p = { type: 'land', size: 300, bedrooms: 2, floor: 3, finishing_ar: ' ' };
  assert.deepEqual(keyFacts(p).map((f) => f.key), ['size']);
});
