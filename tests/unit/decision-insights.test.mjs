import test from 'node:test';
import assert from 'node:assert/strict';
import { buildDecisionInsights, sortInsights } from '../../src/utils/decisionInsights.js';

const AREAS = [{ id: 'sohag', name_ar: 'سوهاج' }];
const NOW = Date.parse('2026-06-15T12:00:00Z');
const daysAgo = (d) => new Date(NOW - d * 86400000).toISOString();

test('flags a critical stock deficit (no supply, live demand) and links to the stock tab', () => {
  const demands = [{ id: 'd1', status: 'open', areaKey: 'sohag' }, { id: 'd2', status: 'open', areaKey: 'sohag' }];
  const insights = buildDecisionInsights({ properties: [], demands, areas: AREAS, now: NOW });
  const found = insights.find((i) => i.id.startsWith('stock-deficit-'));
  assert.ok(found, 'expected a stock deficit insight');
  assert.equal(found.severity, 'critical');
  assert.equal(found.tab, 'stock');
});

test('flags a pipeline bottleneck when a stage holds many late clients', () => {
  const leads = Array.from({ length: 5 }, (_, i) => ({
    id: `l${i}`, status: 'new', createdAt: daysAgo(3), // new's limit is 24h, so 3 days is well late
  }));
  const insights = buildDecisionInsights({ leads, now: NOW });
  const found = insights.find((i) => i.id === 'flow-bottleneck');
  assert.ok(found, 'expected a flow bottleneck insight');
  assert.equal(found.tab, 'flow');
});

test('flags an overloaded agent and suggests the colleague with spare capacity', () => {
  const members = [
    { uid: 'u1', name: 'أحمد', role: 'sales' },
    { uid: 'u2', name: 'سارة', role: 'sales' },
  ];
  const access = { roles: [{ id: 'sales', name_ar: 'مبيعات', perms: ['ld.edit'] }] };
  const capacity = { people: { u1: { capacity: 10 }, u2: { capacity: 10 } } };
  const leads = [
    ...Array.from({ length: 14 }, (_, i) => ({ id: `over-${i}`, status: 'new', ownerUid: 'u1', createdAt: daysAgo(1) })),
    { id: 'low-1', status: 'new', ownerUid: 'u2', createdAt: daysAgo(1) },
  ];
  const insights = buildDecisionInsights({ leads, members, access, capacity, now: NOW });
  const found = insights.find((i) => i.id === 'team-rebalance-u1');
  assert.ok(found, 'expected a team rebalance insight');
  assert.match(found.detail_ar, /أحمد/);
  assert.match(found.action_ar, /سارة/);
  assert.equal(found.tab, 'org');
});

test('flags unassigned open clients', () => {
  const members = [{ uid: 'u1', name: 'أحمد', role: 'sales' }];
  const access = { roles: [{ id: 'sales', name_ar: 'مبيعات', perms: ['ld.edit'] }] };
  const leads = Array.from({ length: 4 }, (_, i) => ({ id: `u-${i}`, status: 'new', createdAt: daysAgo(1) }));
  const insights = buildDecisionInsights({ leads, members, access, now: NOW });
  const found = insights.find((i) => i.id === 'team-unassigned');
  assert.ok(found);
  assert.equal(found.tab, 'org');
});

test('flags a wide marketing spread between a strong and a weak source', () => {
  const makeLeads = (source, n, visited) => Array.from({ length: n }, (_, i) => ({
    id: `${source}-${i}`,
    source,
    status: i < visited ? 'site_visit' : 'new',
    createdAt: daysAgo(5),
    stageHistory: i < visited ? [{ s: 'site_visit', at: daysAgo(4) }] : [],
  }));
  const leads = [...makeLeads('facebook ads', 10, 8), ...makeLeads('broker', 10, 0)];
  const insights = buildDecisionInsights({ leads, now: NOW });
  const found = insights.find((i) => i.id === 'marketing-reallocate');
  assert.ok(found, 'expected a marketing reallocation insight');
  assert.equal(found.tab, 'marketing');
});

test('flags a dominant lost reason', () => {
  const leads = Array.from({ length: 5 }, (_, i) => ({
    id: `lost-${i}`, status: 'lost', lostReason: 'السعر غالي', createdAt: daysAgo(5),
  }));
  const insights = buildDecisionInsights({ leads, now: NOW });
  const found = insights.find((i) => i.id === 'risk-top-lost-reason');
  assert.ok(found);
  assert.equal(found.tab, 'risk');
});

test('flags duplicate listings pending merge', () => {
  const properties = [
    { id: 'a', title_ar: 'شقة في سوهاج', areaKey: 'sohag', size: 120, price: 1000000, type: 'apartment', status: 'published' },
    { id: 'b', title_ar: '  شقة   في سوهاج ', areaKey: 'sohag', size: 120, price: 1000000, type: 'apartment', status: 'published' },
  ];
  const insights = buildDecisionInsights({ properties, now: NOW });
  const found = insights.find((i) => i.id === 'stock-duplicates');
  assert.ok(found);
  assert.equal(found.tab, 'stock');
});

test('flags offers ending within two days', () => {
  const until = new Date(NOW).toISOString().slice(0, 10);
  const properties = [{
    id: 'p1', price: 1000000, status: 'published',
    offer: { type: 'cash_discount', price: 900000, until, basePrice: 1000000 },
  }];
  const insights = buildDecisionInsights({ properties, now: NOW });
  const found = insights.find((i) => i.id === 'marketing-offers-ending');
  assert.ok(found);
  assert.equal(found.tab, 'marketing');
});

test('an idle system (no data) produces no insights', () => {
  assert.deepEqual(buildDecisionInsights({ now: NOW }), []);
});

test('sortInsights puts critical first, then warning, then info', () => {
  const sorted = sortInsights([
    { id: 'c', severity: 'info' },
    { id: 'a', severity: 'critical' },
    { id: 'b', severity: 'warning' },
  ]);
  assert.deepEqual(sorted.map((i) => i.id), ['a', 'b', 'c']);
});
