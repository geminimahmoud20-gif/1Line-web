// Offline lead queue. Run: npm run test:unit
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k)
};
const { enqueuePendingLead, readPendingLeads, writePendingLeads, pendingLeadCount } = await import('../../src/utils/leadQueue.js');

beforeEach(() => store.clear());

test('queues a lead once per id', () => {
  assert.equal(enqueuePendingLead({ id: 'lead-1', phone: '010' }), true);
  assert.equal(enqueuePendingLead({ id: 'lead-1', phone: '010' }), false);
  assert.equal(readPendingLeads().length, 1);
});

test('folds the legacy second queue into the main one', () => {
  store.set('oneline_offline_lead_queue', JSON.stringify([{ id: 'old-1', phone: '011' }]));
  assert.equal(pendingLeadCount(), 1);
  const list = readPendingLeads();
  assert.deepEqual(list.map((l) => l.id), ['old-1']);
  assert.equal(store.has('oneline_offline_lead_queue'), false);
});

test('corrupt storage reads as an empty queue; writing [] clears the key', () => {
  store.set('oneline_pending_leads_queue', '{not json');
  assert.deepEqual(readPendingLeads(), []);
  enqueuePendingLead({ id: 'x' });
  writePendingLeads([]);
  assert.equal(store.has('oneline_pending_leads_queue'), false);
});
