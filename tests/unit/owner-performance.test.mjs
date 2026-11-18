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

import { ownersPeriodTable } from '../../src/utils/ownerPerformance.js';
test('ownersPeriodTable: new clients and closed per owner in a range, with the range before', () => {
  const day = (h) => new Date(NOW - h * 3600000).toISOString();
  const ls = [
    { id: '1', ownerUid: 'u1', ownerName: 'محمود', status: 'closed', createdAt: day(30), closedAt: day(5), stageHistory: [{ s: 'new', at: day(30) }, { s: 'closed', at: day(5) }] },
    { id: '2', ownerUid: 'u1', ownerName: 'محمود', status: 'new', createdAt: day(60 * 24) },
    { id: '3', ownerUid: 'u1', ownerName: 'محمود', status: 'new', createdAt: day(2) },
    { id: '4', ownerUid: 'u2', ownerName: 'سارة', status: 'new', createdAt: day(3 * 24 * 40) }
  ];
  const range = { from: '2026-11-11', to: '2026-11-18', days: 8 };
  const prev = { from: '2026-11-03', to: '2026-11-10', days: 8 };
  const rows = ownersPeriodTable(ls, [], [], range, prev, NOW);
  const m = rows.find((r) => r.name === 'محمود');
  assert.equal(m.cur.newLeads, 2);
  assert.equal(m.cur.closed, 1);
  assert.ok(!rows.some((r) => r.name === 'سارة'));
});

import { recentContacts } from '../../src/utils/ownerPerformance.js';
test('recentContacts: newest first across clients, call answers included once', () => {
  const t = (h) => new Date(NOW - h * 3600000).toISOString();
  const ls = [
    { id: 'a', name: 'أ', outcomes: [{ id: 'reached', at: t(5), n: 'محمود', note: 'عاوز ٣ غرف' }, { id: 'no_answer', at: t(30) }], callOutcomes: [{ o: 'answered', at: t(5) }] },
    { id: 'b', name: 'ب', outcomes: [{ id: 'viewing_set', at: t(1) }] },
    { id: 'c', name: 'ج', isArchived: true, outcomes: [{ id: 'reached', at: t(0.5) }] }
  ];
  const r = recentContacts(ls, 10);
  assert.deepEqual(r.map((x) => x.leadId), ['b', 'a', 'a']);
  assert.equal(r[1].label, 'تم التواصل');
  assert.equal(r[1].note, 'عاوز ٣ غرف');
  assert.equal(r[0].kind, 'positive');
});
