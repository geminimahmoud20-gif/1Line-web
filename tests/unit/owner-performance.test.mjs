import test from 'node:test';
import assert from 'node:assert/strict';
import { ownerStats, ownersTable, matchesOwner, formatMins } from '../../src/utils/ownerPerformance.js';

const NOW = Date.parse('2026-11-18T12:00:00Z');
const iso = (h) => new Date(NOW - h * 3600000).toISOString();
const leads = [
  { id: 'a', ownerUid: 'u1', ownerName: 'محمود كمال', status: 'new', createdAt: iso(5) },
  { id: 'b', ownerUid: 'u1', ownerName: 'محمود كمال', status: 'contacted', createdAt: iso(48), firstContactedAt: iso(47), lastActivityAt: iso(2) },
  { id: 'c', ownerUid: 'u1', ownerName: 'محمود كمال', status: 'closed', createdAt: iso(100), firstContactedAt: iso(99) },
  { id: 'd', ownerUid: 'u1', ownerName: 'محمود كمال', status: 'lost', createdAt: iso(100) },
  { id: 'e', ownerUid: 'u2', ownerName: 'سارة', status: 'negotiating', createdAt: iso(10), firstContactedAt: iso(9.5) },
  { id: 'f', assignedTo: 'Unassigned', status: 'new', createdAt: iso(1) }
];

test('matchesOwner: all, none, one person', () => {
  assert.equal(matchesOwner(leads[0], 'all'), true);
  assert.equal(matchesOwner(leads[0], 'user:u1'), true);
  assert.equal(matchesOwner(leads[4], 'user:u1'), false);
  assert.equal(matchesOwner(leads[5], 'none'), true);
  assert.equal(matchesOwner(leads[0], 'none'), false);
});

test('ownerStats counts stages, outcomes and reply time', () => {
  const s = ownerStats(leads.slice(0, 4), NOW);
  assert.equal(s.open, 2);
  assert.equal(s.stages.new, 1);
  assert.equal(s.stages.contacted, 1);
  assert.equal(s.won, 1);
  assert.equal(s.lost, 1);
  assert.equal(s.winRate, 50);
  assert.equal(s.unanswered, 1);
  assert.equal(Math.round(s.medianReplyMins), 60);
});

test('ownersTable groups by person, busiest first, no-owner last bucket', () => {
  const t = ownersTable(leads, [], NOW);
  assert.equal(t[0].name, 'محمود كمال');
  assert.ok(t.some((r) => r.key === 'none'));
});

test('formatMins', () => {
  assert.equal(formatMins(null), '—');
  assert.equal(formatMins(30), '30 د');
  assert.equal(formatMins(180), '3 س');
});
