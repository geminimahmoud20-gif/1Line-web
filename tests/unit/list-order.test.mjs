import test from 'node:test';
import assert from 'node:assert/strict';
import { moveItem } from '../../src/utils/listOrder.js';

test('moves an item forward and back, shifting the rest', () => {
  assert.deepEqual(moveItem(['a', 'b', 'c', 'd'], 0, 2), ['b', 'c', 'a', 'd']);
  assert.deepEqual(moveItem(['a', 'b', 'c', 'd'], 3, 1), ['a', 'd', 'b', 'c']);
});

test('out-of-range or no-op moves return the same list', () => {
  const list = ['a', 'b'];
  assert.equal(moveItem(list, 0, 0), list);
  assert.equal(moveItem(list, -1, 1), list);
  assert.equal(moveItem(list, 0, 5), list);
});
