import { test } from 'node:test';
import assert from 'node:assert/strict';
import { recordTimeLabel } from '../../src/utils/relativeTime.js';

const NOW = Date.UTC(2026, 9, 10, 12, 0, 0);
test('relative labels from real dates, legacy labels kept', () => {
  assert.equal(recordTimeLabel({ createdAt: new Date(NOW - 30_000).toISOString() }, true, NOW), 'الآن');
  assert.equal(recordTimeLabel({ timestamp: new Date(NOW - 5 * 60_000).toISOString() }, true, NOW), 'منذ 5 دقيقة');
  assert.equal(recordTimeLabel({ createdAt: { seconds: (NOW - 3 * 3600_000) / 1000 } }, true, NOW), 'منذ 3 ساعة');
  assert.equal(recordTimeLabel({ createdAt: NOW - 2 * 86400_000 }, false, NOW), '2 d ago');
  assert.equal(recordTimeLabel({ timestamp: 'الآن' }, true, NOW), 'الآن');
  assert.equal(recordTimeLabel({}, true, NOW), 'حديثاً');
});
