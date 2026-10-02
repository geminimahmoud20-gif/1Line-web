import { test } from 'node:test';
import assert from 'node:assert/strict';
import { filterLeads, computeCrmAnalytics } from '../../src/utils/crmLeadViews.js';

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
  assert.deepEqual(ids(filterLeads(leads, { temperatureFilter: 'hot' })), [1, 4]); // missing temperature = hot
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
