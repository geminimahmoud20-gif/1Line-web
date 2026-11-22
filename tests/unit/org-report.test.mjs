import { test } from 'node:test';
import assert from 'node:assert/strict';
import { orgReport, dutiesOf, tierOf, loadLevel, DEFAULT_CAPACITY } from '../../src/utils/orgReport.js';

const access = {
  roles: [
    { id: 'super_admin', name_ar: 'المدير العام', perms: ['*'] },
    { id: 'sales_manager', name_ar: 'مدير المبيعات', perms: ['ld.all', 'ld.manage', 'ld.edit', 'inv.edit', 'deal.edit', 'export'] },
    { id: 'sales_agent', name_ar: 'مستشار مبيعات', perms: ['ld.edit', 'ld.phone', 'deal.edit'] },
    { id: 'finance', name_ar: 'المالية', perms: ['ld.all', 'fin', 'export'] },
  ],
  teams: [{ id: 'A', name_ar: 'فريق شرق' }, { id: 'B', name_ar: 'فريق الجديدة' }],
};
const members = [
  { uid: 'boss', name: 'Boss', role: 'super_admin' },
  { uid: 'm1', name: 'Manager', role: 'sales_manager', desk: 'A' },
  { uid: 'a1', name: 'Ali', role: 'sales_agent', desk: 'A' },
  { uid: 'b1', name: 'Mona', role: 'sales_agent', desk: 'B' },
  { uid: 'f1', name: 'Fin', role: 'finance' },
];
const NOW = Date.parse('2026-11-22T12:00:00Z');
const ago = (h) => new Date(NOW - h * 3600000).toISOString();

test('tiers and duties come from the permissions, without repeating what a broader one covers', () => {
  assert.equal(tierOf(['*']), 'top');
  assert.equal(tierOf(['ld.manage', 'ld.edit']), 'manager');
  assert.equal(tierOf(['ld.edit']), 'sales');
  assert.equal(tierOf(['fin']), 'support');
  const d = dutiesOf(['inv.edit', 'inv.listings', 'deal.edit', 'fin', 'fin.view']);
  assert.ok(d.some((x) => x.includes('العقارات والمشروعات')));
  assert.ok(!d.some((x) => x === 'يضيف العقارات ويحدّثها'), 'inv.listings is covered by inv.edit');
  assert.ok(!d.some((x) => x.includes('من غير تعديل')), 'fin.view is covered by fin');
  assert.deepEqual(loadLevel(120), 'over'); assert.equal(loadLevel(85), 'high'); assert.equal(loadLevel(50), 'ok'); assert.equal(loadLevel(10), 'low');
});

test('structure, load against capacity, the unassigned pool and team totals', () => {
  const leads = [
    ...Array.from({ length: 30 }, (_, i) => ({ id: `a${i}`, ownerUid: 'a1', status: 'contacted', lastActivityAt: ago(i < 5 ? 72 : 1) })),
    ...Array.from({ length: 6 }, (_, i) => ({ id: `b${i}`, ownerUid: 'b1', status: 'new', type: i < 2 ? 'seller' : 'buyer', lastActivityAt: ago(1) })),
    { id: 'x', ownerUid: 'a1', status: 'closed' },
    { id: 'u1', status: 'new' }, { id: 'u2', status: 'new', type: 'seller' },
  ];
  const r = orgReport(leads, members, access, { team: {}, people: { a1: { capacity: 25 } } }, { now: NOW });
  assert.deepEqual(r.top.map((p) => p.uid), ['boss']);
  assert.deepEqual(r.support.map((p) => p.uid), ['f1']);
  const ali = r.people.find((p) => p.uid === 'a1');
  assert.equal(ali.open, 30, 'closed clients are not load');
  assert.equal(ali.capacity, 25); assert.equal(ali.pct, 120); assert.equal(ali.level, 'over'); assert.equal(ali.idle, 5);
  const mona = r.people.find((p) => p.uid === 'b1');
  assert.equal(mona.capacity, DEFAULT_CAPACITY); assert.equal(mona.pct, 15); assert.equal(mona.level, 'low');
  assert.equal(mona.sellers, 2); assert.equal(mona.buyers, 4);
  assert.equal(r.people[0].uid, 'a1', 'fullest first');
  const teamA = r.teams.find((t) => t.id === 'A');
  assert.deepEqual(teamA.managers.map((p) => p.uid), ['m1']);
  assert.deepEqual(teamA.people.map((p) => p.uid), ['a1']);
  assert.equal(teamA.capacity, 25, 'a team is as big as its salespeople');
  assert.equal(teamA.open, 30, 'and its load is theirs, the manager’s own clients aside');
  assert.deepEqual(r.unassigned, { open: 2, sellers: 1, buyers: 1 });
  assert.equal(r.totals.open, 38, 'salespeople 30 + 6, plus 2 unassigned');
  assert.equal(r.totals.capacity, 65);
});
