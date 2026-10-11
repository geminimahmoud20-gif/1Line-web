import { test } from 'node:test';
import assert from 'node:assert/strict';
import { leadScore } from '../../src/utils/crmLeadViews.js';

const NOW = Date.UTC(2026, 9, 11, 12);
const daysAgo = (d) => new Date(NOW - d * 86400000).toISOString();

test('a bare new lead scores low — no invented 85%', () => {
  const s = leadScore({ name: 'A', status: 'new', createdAt: daysAgo(40) }, NOW);
  assert.equal(s.score, 0);
});

test('facts add up, with reasons', () => {
  const s = leadScore({ status: 'site_visit', type: 'reservation_request', propertyId: 'p1', budget: '3.5 مليون', phone: '010', temperature: 'hot', lastActivityAt: daysAgo(1) }, NOW);
  assert.equal(s.score, 95);
  assert.ok(s.reasons.includes('طلب حجز مبدئي'));
});

test('lost / archived / closed', () => {
  assert.equal(leadScore({ status: 'lost', type: 'reservation_request' }, NOW).score, 0);
  assert.equal(leadScore({ status: 'new', isArchived: true }, NOW).score, 0);
  assert.equal(leadScore({ status: 'closed' }, NOW).score, 100);
});
