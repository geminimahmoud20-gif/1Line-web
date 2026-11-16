import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buyerDemand, demandGapReport } from '../../src/utils/demandGap.js';

const areas = [
  { id: 'a', name_ar: 'سوهاج الجديدة' },
  { id: 'b', name_ar: 'الكورنيش' },
  { id: 'b1', name_ar: 'الكورنيش (شمال)', parentId: 'b' },
  { id: 'c', name_ar: 'جرجا' }
];
const unit = (o) => ({ status: 'published', price: 1500000, ...o });
const props = [
  unit({ id: 1, type: 'apartment', areaKey: 'a' }),
  unit({ id: 2, type: 'apartment', areaKey: 'a', price: 4000000 }),
  unit({ id: 3, type: 'commercial', areaKey: 'b', price: 9000000 })
];
const buyer = (id, kind, areaIds, extra = {}) => ({ id, type: 'buyer', status: 'new', details: { matchAnswers: { kind, areas: areaIds, payment: 'cash', budget: '1500000', ...extra } } });

test('buyers are reduced to kind column, main area and budget', () => {
  const [b] = buyerDemand([buyer(1, 'residential', ['b1'])], areas);
  assert.equal(b.group, 'apartment');
  assert.deepEqual(b.areas, ['b']);
  assert.equal(b.budget, 1500000);
});
test('closed, lost, archived, owners and account sign-ups are not demand', () => {
  const leads = [
    { ...buyer(1, 'residential', ['a']), status: 'closed' },
    { ...buyer(2, 'residential', ['a']), status: 'lost' },
    { ...buyer(3, 'residential', ['a']), isArchived: true },
    { ...buyer(4, 'residential', ['a']), type: 'seller' },
    { ...buyer(5, 'residential', ['a']), type: 'account' },
    buyer(6, 'residential', ['a'])
  ];
  assert.deepEqual(buyerDemand(leads, areas).map((x) => x.id), [6]);
});
test('a buyer on installments has no budget figure', () => {
  const [b] = buyerDemand([buyer(1, 'residential', ['a'], { payment: 'installments', down: '300000' })], areas);
  assert.equal(b.budget, 0);
});
test('"any area" buyers have no area', () => {
  const [b] = buyerDemand([buyer(1, 'villa', [], { anyArea: true })], areas);
  assert.deepEqual(b.areas, []);
});
test('older leads without answers use propertyType and area', () => {
  const [b] = buyerDemand([{ id: 9, type: 'buyer', status: 'new', area: 'c', details: { propertyType: 'commercial', budget: '5 مليون' } }], areas);
  assert.equal(b.group, 'commercial');
  assert.deepEqual(b.areas, ['c']);
  assert.equal(b.budget, 5000000);
});
test('shortfall: demand above stock in an area and kind is ranked first', () => {
  const leads = [
    ...[1, 2, 3, 4, 5].map((i) => buyer(i, 'villa', ['c'])),
    buyer(10, 'residential', ['a']),
    buyer(11, 'residential', ['a'])
  ];
  const r = demandGapReport(props, leads, areas);
  const top = r.priorities[0];
  assert.equal(top.kind, 'area');
  assert.equal(top.areaId, 'c');
  assert.equal(top.group, 'villa');
  assert.equal(top.shortfall, 5);
  // two apartment buyers vs two apartments in 'a': no shortfall there
  assert.ok(!r.priorities.some((p) => p.kind === 'area' && p.areaId === 'a' && p.group === 'apartment'));
});
test('price shortfall: buyers in a band nobody sells', () => {
  const leads = [1, 2, 3].map((i) => buyer(i, 'residential', ['a'], { budget: '4000000' }));
  const r = demandGapReport(props, leads, areas);
  const p = r.priorities.find((x) => x.kind === 'price' && x.group === 'apartment');
  assert.equal(p.index, 3);
  assert.equal(p.demand, 3);
  assert.equal(p.supply, 1);
  assert.equal(p.shortfall, 2);
});
test('kinds table and area cards', () => {
  const leads = [buyer(1, 'villa', ['c']), buyer(2, 'villa', ['c'])];
  const r = demandGapReport(props, leads, areas);
  const villa = r.kinds.find((k) => k.id === 'villa');
  assert.equal(villa.demand, 2);
  assert.equal(villa.supply, 0);
  assert.equal(villa.gap, 2);
  const c = r.areas.find((x) => x.id === 'c');
  assert.equal(c.supply, 0);
  assert.equal(c.demand, 2);
  assert.equal(c.topNeed.id, 'villa');
  assert.equal(c.missing.length, 8);
  assert.equal(r.buyers.total, 2);
});
test('no buyers: no priorities, no crash', () => {
  const r = demandGapReport(props, [], areas);
  assert.equal(r.priorities.length, 0);
  assert.equal(r.buyers.total, 0);
});
