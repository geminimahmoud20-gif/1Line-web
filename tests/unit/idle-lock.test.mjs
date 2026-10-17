import test from 'node:test';
import assert from 'node:assert/strict';
import { isIdleExpired, lockLabel, LOCK_OPTIONS, DEFAULT_LOCK_MINUTES } from '../../src/utils/idleLock.js';

const MIN = 60 * 1000;

test('locks only after the limit has passed', () => {
  const t0 = 1_000_000_000_000;
  assert.equal(isIdleExpired(t0, t0 + 29 * MIN, 30), false);
  assert.equal(isIdleExpired(t0, t0 + 30 * MIN, 30), true);
  assert.equal(isIdleExpired(t0, t0 + 24 * 60 * MIN, 30), true); // reopened the next day
});

test('never locks when turned off or with no activity on record', () => {
  assert.equal(isIdleExpired(1, 10 ** 13, 0), false);
  assert.equal(isIdleExpired(0, 10 ** 13, 30), false);
});

test('options and labels', () => {
  assert.ok(LOCK_OPTIONS.includes(DEFAULT_LOCK_MINUTES));
  assert.equal(lockLabel(30), 'بعد 30 دقيقة');
  assert.equal(lockLabel(60), 'بعد ساعة');
  assert.equal(lockLabel(120), 'بعد ساعتين');
  assert.equal(lockLabel(0), 'أبداً');
});
