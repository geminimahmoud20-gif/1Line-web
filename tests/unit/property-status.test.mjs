import test from 'node:test';
import assert from 'node:assert/strict';
import { statusStamp } from '../../src/utils/propertyStatus.js';

const NOW = '2026-11-14T10:00:00.000Z';

test('becoming sold stamps the day it changed and the day it sold', () => {
  assert.deepEqual(statusStamp({ status: 'published' }, { status: 'sold' }, NOW), { statusChangedAt: NOW, soldAt: NOW });
  assert.deepEqual(statusStamp({}, { status: 'sold' }, NOW), { statusChangedAt: NOW, soldAt: NOW }); // no status yet means published
});

test('putting a sold listing back on sale clears soldAt', () => {
  assert.deepEqual(statusStamp({ status: 'sold', soldAt: '2026-10-01T00:00:00.000Z' }, { status: 'published' }, NOW), { statusChangedAt: NOW, soldAt: '' });
});

test('another change only stamps the change; no status change stamps nothing', () => {
  assert.deepEqual(statusStamp({ status: 'published' }, { status: 'hidden' }, NOW), { statusChangedAt: NOW });
  assert.deepEqual(statusStamp({ status: 'sold', soldAt: 'x' }, { status: 'sold' }, NOW), {}); // saved again, still sold: the day stays
  assert.deepEqual(statusStamp({ status: 'published' }, { price: 5 }, NOW), {});
  assert.deepEqual(statusStamp(null, null, NOW), {});
});
