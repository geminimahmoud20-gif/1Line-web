import { test } from 'node:test';
import assert from 'node:assert/strict';
import { filterLeads, computeCrmAnalytics, sortLeads, duplicatesById, buildMergedLead, leadSourceKey, waitingMs, phoneKey, lostReasonCounts, parseMoney, localDayKey, isOverdue, isDueToday, isStale, isUnassigned, computeDashboardMetrics } from '../../src/utils/crmLeadViews.js';

const leads = [
  { id: 1, name: 'Ahmed', phone: '01011111111', type: 'buyer', status: 'new', assignedTo: 'Sales Team A', temperature: 'hot', details: { area: 'east' }, score: 90 },
  { id: 2, name: 'Mona', phone: '01022222222', type: 'seller', status: 'contacted', assignedTo: 'Sales Team B', temperature: 'cold', details: { area: 'kawthar' }, nextFollowUpAt: '2026-10-01T09:00:00Z' },
  { id: 3, name: 'Old', phone: '01033333333', type: 'buyer', status: 'closed', assignedTo: 'Unassigned', isArchived: true },
  { id: 4, name: 'Pool', phone: '01044444444', type: 'investor', assignedTo: 'Unassigned', tags: ['VIP'], notes: 'wants Clinic' }
];
const ids = (r) => r.map((l) => l.id);

test('archived leads only appear under "archived"', () => {
  assert.deepEqual(ids(filterLeads(leads)), [1, 2, 4]);
  assert.deepEqual(ids(filterLeads(leads, { leadFilter: 'archived' })), [3]);
});

test('stage, type, temperature and area filters', () => {
  assert.deepEqual(ids(filterLeads(leads, { leadFilter: 'new' })), [1, 4]); // no status counts as new
  assert.deepEqual(ids(filterLeads(leads, { leadFilter: 'qualified' })), [1]);
  assert.deepEqual(ids(filterLeads(leads, { leadFilter: 'due', today: '2026-10-02' })), [2]);
  assert.deepEqual(ids(filterLeads(leads, { leadFilter: 'seller' })), [2]);
  assert.deepEqual(ids(filterLeads(leads, { temperatureFilter: 'hot' })), [1]);
  assert.deepEqual(ids(filterLeads(leads, { temperatureFilter: 'unknown' })), [4]); // missing temperature is not 'hot'
  assert.deepEqual(ids(filterLeads(leads, { areaFilter: 'kawthar' })), [2]);
});

test('search matches name, phone, notes and tags, case-insensitively', () => {
  assert.deepEqual(ids(filterLeads(leads, { searchQuery: 'mona' })), [2]);
  assert.deepEqual(ids(filterLeads(leads, { searchQuery: '0104444' })), [4]);
  assert.deepEqual(ids(filterLeads(leads, { searchQuery: 'clinic' })), [4]);
  assert.deepEqual(ids(filterLeads(leads, { searchQuery: 'vip' })), [4]);
  assert.deepEqual(ids(filterLeads(leads, { searchQuery: '   ' })), [1, 2, 4]);
});

test('"my deals" keeps the agent\'s desk and the pool, except for the super admin', () => {
  assert.deepEqual(ids(filterLeads(leads, { myDealsOnly: true, activeRole: 'agent_east', agentName: 'Sales Team A' })), [1, 4]);
  assert.deepEqual(ids(filterLeads(leads, { myDealsOnly: true, activeRole: 'super_admin', agentName: 'x' })), [1, 2, 4]);
});

test('dashboard counters', () => {
  const a = computeCrmAnalytics(leads);
  assert.equal(a.buyersCount, 2);
  assert.equal(a.sellersCount, 1);
  assert.equal(a.closedCount, 1);
  assert.equal(a.conversionSuccess, '25%');
  assert.equal(computeCrmAnalytics([]).conversionSuccess, '0%');
});

const NOW = Date.parse('2026-10-08T12:00:00Z');
const H = 3600 * 1000;
const crm = [
  { id: 'a', name: 'A', phone: '+20 101 234 5678', status: 'new', createdAt: new Date(NOW - 5 * H).toISOString(), source: 'website', score: 70 },
  { id: 'b', name: 'B', whatsapp: '01012345678', status: 'contacted', createdAt: new Date(NOW - 30 * 24 * H).toISOString(), source: 'بوابة الوسطاء والشركاء', score: 95, notes: 'old note', tags: ['VIP'] },
  { id: 'c', name: 'C', phone: '01199999999', status: 'new', createdAt: { seconds: (NOW - 0.5 * H) / 1000 }, source: 'Direct Entry' },
  { id: 'd', name: 'D', phone: '01055555555', status: 'lost', lostReason: 'price', createdAt: new Date(NOW - 2 * H).toISOString(), utmSource: 'facebook' },
  { id: 'e', name: 'E', phone: '01012345678', status: 'new', isArchived: true, createdAt: new Date(NOW - H).toISOString() }
];

test('lost leads only show under "lost", and are counted by reason', () => {
  assert.deepEqual(ids(filterLeads(crm, { now: NOW })), ['a', 'b', 'c']);
  assert.deepEqual(ids(filterLeads(crm, { leadFilter: 'lost', now: NOW })), ['d']);
  assert.deepEqual(lostReasonCounts(crm), { price: 1 });
});

test('first-reply wait: only untouched new leads, archived ones ignored', () => {
  assert.equal(waitingMs(crm[0], NOW), 5 * H);
  assert.equal(waitingMs(crm[1], NOW), 0);
  assert.equal(waitingMs({ ...crm[0], firstContactedAt: 'x' }, NOW), 0);
  assert.equal(waitingMs(crm[4], NOW), 0);
  assert.deepEqual(ids(filterLeads(crm, { leadFilter: 'awaiting', now: NOW })), ['a', 'c']);
});

test('duplicates match the same number across formats, skipping archived leads', () => {
  assert.equal(phoneKey('+20 101 234 5678'), '01012345678');
  assert.equal(phoneKey('٠١٠١٢٣٤٥٦٧٨'), '01012345678');
  const d = duplicatesById(crm);
  assert.deepEqual(d.get('a'), ['b']);
  assert.deepEqual(d.get('b'), ['a']);
  assert.equal(d.has('e'), false);
  assert.deepEqual(ids(filterLeads(crm, { leadFilter: 'dupes', now: NOW })), ['a', 'b']);
});

test('merge keeps the oldest date, furthest stage, best score, all notes and tags', () => {
  const m = buildMergedLead(crm[0], [crm[1]], '2026-10-08T12:00:00.000Z');
  assert.equal(m.createdAt, crm[1].createdAt);
  assert.equal(m.status, 'contacted');
  assert.equal(m.score, 95);
  assert.deepEqual(m.tags, ['VIP']);
  assert.match(m.notes, /old note/);
  assert.equal(m.phone, '+20 101 234 5678');
  assert.equal(m.whatsapp, '01012345678');
  assert.deepEqual(m.mergedFrom, ['b']);
  assert.match(m.activityLogs[0].action, /دمج 1/);
});

test('source buckets, date range and sorting', () => {
  assert.deepEqual(crm.map(leadSourceKey), ['website', 'broker', 'manual', 'ads', 'website']);
  assert.equal(leadSourceKey({ source: 'Digital Brochure' }), 'other');
  assert.deepEqual(ids(filterLeads(crm, { sourceFilter: 'broker', now: NOW })), ['b']);
  assert.deepEqual(ids(filterLeads(crm, { dateFilter: '7d', now: NOW })), ['a', 'c']);
  assert.deepEqual(ids(sortLeads(crm.slice(0, 3), 'oldest', NOW)), ['b', 'a', 'c']);
  assert.deepEqual(ids(sortLeads(crm.slice(0, 3), 'newest', NOW)), ['c', 'a', 'b']);
  assert.deepEqual(ids(sortLeads(crm.slice(0, 3), 'score', NOW)), ['b', 'a', 'c']);
  assert.deepEqual(ids(sortLeads(crm.slice(0, 3), 'waiting', NOW)), ['a', 'c', 'b']);
});

test('money parsing: Arabic digits, separators, units and ranges', () => {
  assert.equal(parseMoney(2500000), 2500000);
  assert.equal(parseMoney('2,500,000'), 2500000);
  assert.equal(parseMoney('٢٫٥ مليون'), 2500000);
  assert.equal(parseMoney('٣٬٠٠٠٬٠٠٠'), 3000000);
  assert.equal(parseMoney('750 ألف'), 750000);
  assert.equal(parseMoney('EGP 1.2m'), 1200000);
  assert.equal(parseMoney('2-3 مليون'), 2000000);
  assert.equal(parseMoney('بدون'), 0);
  assert.equal(parseMoney(-5), 0);
});

test('follow-up days use the local calendar day, not the UTC one', () => {
  // 23:30 local on Oct 10 is still the 10th even where UTC has moved on
  const late = new Date(2026, 9, 10, 23, 30);
  assert.equal(localDayKey(late), '2026-10-10');
  const lead = { status: 'contacted', nextFollowUpAt: late.toISOString() };
  assert.equal(isDueToday(lead, '2026-10-10'), true);
  assert.equal(isOverdue(lead, '2026-10-11'), true);
  assert.equal(isOverdue({ ...lead, status: 'closed' }, '2026-10-11'), false);
});

test('overdue, unassigned and stale filters', () => {
  const now = new Date(2026, 9, 10, 12).getTime();
  const day = 864e5;
  const L = [
    { id: 1, status: 'contacted', assignedTo: 'Sales Team A', nextFollowUpAt: new Date(now - 2 * day).toISOString(), lastActivityAt: new Date(now - 3 * day).toISOString() },
    { id: 2, status: 'new', assignedTo: 'Unassigned', lastActivityAt: new Date(now - 3600e3).toISOString() },
    { id: 3, status: 'closed', assignedTo: 'Unassigned', lastActivityAt: new Date(now - 9 * day).toISOString() },
    { id: 4, status: 'negotiating', assignedTo: 'Sales Team B', nextFollowUpAt: new Date(now).toISOString(), lastActivityAt: new Date(now).toISOString() }
  ];
  assert.deepEqual(ids(filterLeads(L, { leadFilter: 'overdue', now })), [1]);
  assert.deepEqual(ids(filterLeads(L, { leadFilter: 'unassigned', now })), [2]);
  assert.deepEqual(ids(filterLeads(L, { leadFilter: 'stale', now })), [1]);
  assert.deepEqual(ids(filterLeads(L, { leadFilter: 'due', now })), [1, 4]);
  assert.equal(isUnassigned(L[2]), false);
  assert.equal(isStale(L[1], now), false);
});

test('dashboard: active pipeline excludes won, lost and archived; desk scope', () => {
  const now = Date.now();
  const L = [
    { id: 1, status: 'negotiating', budget: '٢ مليون', assignedTo: 'Sales Team A' },
    { id: 2, status: 'closed', budget: 5000000, assignedTo: 'Sales Team A' },
    { id: 3, status: 'lost', budget: 9000000, assignedTo: 'Sales Team B' },
    { id: 4, status: 'new', details: { budget: '1,500,000' }, assignedTo: 'Unassigned' },
    { id: 5, status: 'contacted', budget: 7000000, isArchived: true, assignedTo: 'Sales Team B' }
  ];
  const D = [{ budget: '3 مليون', status: 'pending' }, { budget: 4000000, status: 'archived' }];
  const all = computeDashboardMetrics(L, D, { now });
  assert.equal(all.pipelineValue, 3500000);
  assert.equal(all.openCount, 2);
  assert.equal(all.purchasingPower, 3000000);
  assert.equal(all.pendingDemandsCount, 1);
  assert.equal(all.wonCount, 1);
  assert.equal(all.lostCount, 1);
  assert.equal(all.winRate, 50);
  const desk = computeDashboardMetrics(L, D, { now, scopeDesk: 'Sales Team A' });
  assert.equal(desk.scoped, true);
  assert.equal(desk.pipelineValue, 2000000);
  assert.equal(desk.purchasingPower, 0);
  assert.equal(desk.wonCount, 1);
  assert.equal(desk.winRate, 100);
  assert.equal(desk.unassignedList.length, 1); // the shared pool stays visible
});
