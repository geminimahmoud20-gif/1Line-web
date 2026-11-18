import test from 'node:test';
import assert from 'node:assert/strict';
import { stageSinceMs, isStalled, isNewOverdue, daysLabel, shortMoney } from '../../src/utils/pipelineCards.js';

const DAY = 24 * 60 * 60 * 1000;
const now = 100 * DAY;

test('stage age uses the last stage change, else when the request came in', () => {
  assert.equal(stageSinceMs({ statusUpdatedAt: new Date(now - 3 * DAY).toISOString(), createdAt: now - 20 * DAY }), now - 3 * DAY);
  assert.equal(stageSinceMs({ createdAt: { seconds: (now - 5 * DAY) / 1000 } }), now - 5 * DAY);
});

test('a deal stalls after its stage limit; won deals never do', () => {
  assert.equal(isStalled({ status: 'negotiating', statusUpdatedAt: now - 11 * DAY }, now), true);
  assert.equal(isStalled({ status: 'negotiating', statusUpdatedAt: now - 9 * DAY }, now), false);
  assert.equal(isStalled({ status: 'closed', statusUpdatedAt: now - 90 * DAY }, now), false);
});

test('new requests without a call for a day are overdue, whichever date field they carry', () => {
  assert.equal(isNewOverdue({ status: 'new', createdAt: { seconds: (now - 2 * DAY) / 1000 } }, now), true); // imported
  assert.equal(isNewOverdue({ timestamp: new Date(now - 2 * DAY).toISOString() }, now), true);
  assert.equal(isNewOverdue({ status: 'new', createdAt: now - 3600 * 1000 }, now), false);
  assert.equal(isNewOverdue({ status: 'contacted', createdAt: now - 9 * DAY }, now), false);
});

test('labels', () => {
  assert.equal(daysLabel(3600 * 1000), 'النهارده');
  assert.equal(daysLabel(2 * DAY), 'من يومين');
  assert.equal(daysLabel(5 * DAY), 'من 5 أيام');
  assert.equal(daysLabel(17 * DAY), 'من 17 يوم');
  assert.equal(shortMoney(12_450_000), '12.5 مليون');
  assert.equal(shortMoney(850_000), '850 ألف');
});
