import { test } from 'node:test';
import assert from 'node:assert/strict';
import { recordTimeLabel } from '../../src/utils/relativeTime.js';

const NOW = Date.UTC(2026, 9, 10, 12, 0, 0);
test('relative labels from real dates, legacy labels kept', () => {
  assert.equal(recordTimeLabel({ createdAt: new Date(NOW - 30_000).toISOString() }, true, NOW), 'الآن');
  assert.equal(recordTimeLabel({ timestamp: new Date(NOW - 5 * 60_000).toISOString() }, true, NOW), 'منذ 5 دقائق');
  assert.equal(recordTimeLabel({ createdAt: { seconds: (NOW - 3 * 3600_000) / 1000 } }, true, NOW), 'منذ 3 ساعات');
  assert.equal(recordTimeLabel({ createdAt: NOW - 2 * 86400_000 }, false, NOW), '2 d ago');
  assert.equal(recordTimeLabel({ timestamp: 'الآن' }, true, NOW), 'الآن');
  assert.equal(recordTimeLabel({}, true, NOW), 'حديثاً');
});

test('Arabic counts agree with the number', () => {
  assert.equal(recordTimeLabel({ createdAt: NOW - 8 * 86400_000 }, true, NOW), 'منذ 8 أيام');
  assert.equal(recordTimeLabel({ createdAt: NOW - 86400_000 }, true, NOW), 'منذ يوم');
  assert.equal(recordTimeLabel({ createdAt: NOW - 2 * 3600_000 }, true, NOW), 'منذ ساعتين');
  assert.equal(recordTimeLabel({ createdAt: NOW - 15 * 86400_000 }, true, NOW), 'منذ 15 يوم');
  assert.equal(recordTimeLabel({ createdAt: NOW - 11 * 60_000 }, true, NOW), 'منذ 11 دقيقة');
});
