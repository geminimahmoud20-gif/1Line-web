// tests/unit/1line-os-schema.test.mjs
// Unit tests for the 1Line OS schema helpers the app uses (drafts, property codes, nominations, search requests, handoffs)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  generatePropertyCode,
  createNominationPack,
  createSearchRequestDraft,
  createHandoffTask
} from '../../src/models/schema.js';

test('schema: generatePropertyCode formats city, sector, and 3-digit sequence', () => {
  assert.equal(generatePropertyCode('SOH', 'E', 1), 'SOH-E-001');
  assert.equal(generatePropertyCode('SOH', 'NS', 14), 'SOH-NS-014');
  assert.equal(generatePropertyCode('CAI', 'NC', 105), 'CAI-NC-105');
});

test('schema: createNominationPack produces 3 distinct roles (closest, value, challenge)', () => {
  const pack = createNominationPack('p-1', { id: 'prop-1' }, { id: 'prop-2' }, { id: 'prop-3' });
  assert.equal(pack.length, 3);
  assert.equal(pack[0].role, 'closest');
  assert.equal(pack[1].role, 'value');
  assert.equal(pack[2].role, 'challenge');
});

test('schema: createSearchRequestDraft initiates a 7-day SLA countdown', () => {
  const req = createSearchRequestDraft('p-1', { area: 'الكوثر', budget: 3000000 });
  const openTime = new Date(req.openedAt).getTime();
  const deadlineTime = new Date(req.deadline).getTime();
  const diffDays = Math.round((deadlineTime - openTime) / (1000 * 60 * 60 * 24));
  assert.equal(diffDays, 7);
  assert.equal(req.status, 'open');
});

test('schema: createHandoffTask builds Playbook inter-departmental handoffs with proper SLA', () => {
  const h3 = createHandoffTask(3, 'p-1', 'Engy');
  assert.equal(h3.fromDept, 'sales');
  assert.equal(h3.toDept, 'inventory');
  assert.equal(h3.handoffNumber, 3);

  const h8 = createHandoffTask(8, 'p-1', 'Mahmoud');
  assert.equal(h8.handoffNumber, 8);
  assert.equal(h8.toDept, 'founder');
});
