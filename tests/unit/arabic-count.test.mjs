import test from 'node:test';
import assert from 'node:assert/strict';
import { countLabel, countWord } from '../../src/utils/arabicCount.js';

test('Arabic room and bath counts agree with the number', () => {
  assert.deepEqual([1, 2, 3, 10, 11, 0].map((n) => countLabel('room', n)), ['1 غرفة', '2 غرفتين', '3 غرف', '10 غرف', '11 غرفة', '0 غرفة']);
  assert.deepEqual([1, 2, 4, 12].map((n) => countWord('bath', n)), ['حمام', 'حمامين', 'حمامات', 'حمام']);
  assert.equal(countLabel('room', 1, false), '1 room');
  assert.equal(countLabel('bath', '3', false), '3 baths');
});
