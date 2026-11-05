import test from 'node:test';
import assert from 'node:assert/strict';
import { brokerUnits, brokerDemands, unitStage, unitDemandFit, demandsForUnit, unitsForDemand } from '../../src/utils/brokerFile.js';

const areas = [{ id: 'new', name_ar: 'سوهاج الجديدة' }, { id: 'east', name_ar: 'شرق' }];
const broker = { id: 'L1', type: 'broker', phone: '01001234567', details: { listingIds: ['p2'] } };
const unit = (extra = {}) => ({ id: 'p1', type: 'apartment', title_ar: 'شقة', status: 'published', price: 1_500_000, size: 120, areaKey: 'new', ...extra });

test('a broker file finds the units and requests that are theirs', () => {
  const props = [unit({ sourceLeadId: 'L1' }), unit({ id: 'p2' }), unit({ id: 'p3' }), unit({ id: 'p4', sourceLeadId: 'L1', isDemo: true })];
  assert.deepEqual(brokerUnits(broker, props).map((p) => p.id), ['p1', 'p2']);
  const demands = [{ id: 'd1', phone: '+20 100 123 4567' }, { id: 'd2', phone: '01119999999' }, { id: 'd3', sourceLeadId: 'L1' }];
  assert.deepEqual(brokerDemands(broker, demands).map((d) => d.id), ['d1', 'd3']);
});

test('unit stages read as words', () => {
  assert.equal(unitStage(unit()).ar, 'منشورة على الموقع');
  assert.equal(unitStage(unit({ approval: 'pending' })).id, 'pending');
  assert.equal(unitStage(unit({ status: 'sold' })).id, 'sold');
});

test('fit: same kind, area and budget scores high; another kind is 0', () => {
  const d = { id: 'd1', type: 'apartment', area: 'new', budget: 1_600_000 };
  assert.ok(unitDemandFit(unit(), d, areas).score >= 90);
  assert.equal(unitDemandFit(unit(), { ...d, type: 'land' }, areas).score, 0);
  assert.ok(unitDemandFit(unit({ areaKey: 'east', price: 2_500_000 }), d, areas).score < 60);
});

test('a unit lists the open requests it fits; a request lists the live units that fit it', () => {
  const demands = [
    { id: 'good', type: 'apartment', area: 'new', budget: 1_600_000 },
    { id: 'closed', type: 'apartment', area: 'new', budget: 1_600_000, status: 'archived' },
    { id: 'land', type: 'land', area: 'new', budget: 1_600_000 }
  ];
  assert.deepEqual(demandsForUnit(unit(), demands, areas).map((x) => x.demand.id), ['good']);
  const props = [unit(), unit({ id: 'hidden', status: 'hidden' }), unit({ id: 'far', areaKey: 'east', price: 5_000_000 })];
  assert.deepEqual(unitsForDemand(demands[0], props, areas).map((x) => x.unit.id), ['p1']);
});

test('reasons describe the request, not «you»', () => {
  const r = unitDemandFit(unit({ price: 3_000_000 }), { type: 'apartment', area: 'east', budget: 1_000_000 }, areas);
  assert.ok(r.misses.some((t) => t.includes('ميزانية الطلب')));
  assert.ok(r.misses.some((t) => t.includes('المطلوبة')));
});
