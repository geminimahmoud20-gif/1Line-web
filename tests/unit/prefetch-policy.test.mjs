import test from 'node:test';
import assert from 'node:assert/strict';
import { canPrefetch, PREFETCH_DELAY_MS } from '../../src/utils/prefetchPolicy.js';

test('warms up when the browser says nothing about the connection', () => {
  assert.equal(canPrefetch(undefined), true);
  assert.equal(canPrefetch({}), true);
});
test('skips data saver and slow connections', () => {
  assert.equal(canPrefetch({ saveData: true, effectiveType: '4g' }), false);
  for (const t of ['slow-2g', '2g', '3g', '3G']) assert.equal(canPrefetch({ effectiveType: t }), false, t);
});
test('allows 4g and waits a few seconds after load', () => {
  assert.equal(canPrefetch({ effectiveType: '4g', saveData: false }), true);
  assert.ok(PREFETCH_DELAY_MS >= 3000);
});
