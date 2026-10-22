import test from 'node:test';
import assert from 'node:assert/strict';
import { buildingFacts, hasLandShare, buildingFromSellerFeatures, hasBuildingFacts, cardFeatures } from '../../src/utils/buildingFeatures.js';

const labels = (facts) => Object.fromEntries(facts.map((f) => [f.key, f.value]));

test('recorded building facts read in Egyptian Arabic, with garden size and land-share note', () => {
  const p = { type: 'apartment', building: { elevator: 'yes', garage: 'shared', garden: 'private', gardenSize: 80, landShare: 'yes', landShareNote: '1/8' } };
  assert.deepEqual(labels(buildingFacts(p)), {
    elevator: 'فيه أسانسير',
    garage: 'جراج مشترك للعمارة',
    garden: 'حديقة خاصة · 80 م²',
    landShare: 'فيه حصة في الأرض · 1/8'
  });
});

test('facts that were never recorded are not shown; a "no" is shown but not as a plus', () => {
  const facts = buildingFacts({ type: 'apartment', building: { elevator: 'no' } });
  assert.equal(facts.length, 1);
  assert.equal(facts[0].positive, false);
  assert.deepEqual(buildingFacts({ type: 'apartment' }), []);
});

test('older listings: utilities text, legal land share and features list still count', () => {
  const p = { type: 'villa', utilities: { elevator_ar: 'مفيش', parking_ar: 'جراج خاص تحت البيت' }, legalStatus: { landShare_ar: '25 م²' }, features_ar: ['حديقة خلفية'] };
  const f = labels(buildingFacts(p));
  assert.equal(f.elevator, 'مفيش أسانسير');
  assert.equal(f.garage, 'جراج خاص تحت البيت');
  assert.equal(f.garden, 'حديقة خلفية');
  assert.equal(f.landShare, 'فيه حصة في الأرض · 25 م²');
  assert.equal(hasLandShare(p), true);
  assert.equal(hasLandShare({ type: 'apartment', features_ar: ['حصة شائعة في الأرض'] }), true);
  assert.equal(labels(buildingFacts({ type: 'apartment', legalStatus: { landShare_ar: 'حصة شائعة مسجلة' } })).landShare, 'حصة شائعة مسجلة');
  assert.equal(hasLandShare({ type: 'apartment', building: { landShare: 'no' } }), false);
});

test('a choice in the new section wins over older text', () => {
  const p = { type: 'apartment', building: { elevator: 'no' }, utilities: { elevator_ar: 'أسانسير حديث' } };
  assert.equal(labels(buildingFacts(p)).elevator, 'مفيش أسانسير');
});

test('land, farms and factories have no building facts', () => {
  for (const type of ['land', 'agri_land', 'farm', 'factory']) {
    assert.equal(hasBuildingFacts(type), false);
    assert.deepEqual(buildingFacts({ type, building: { elevator: 'yes' } }), []);
  }
  assert.equal(hasBuildingFacts('commercial'), true);
});

test('what an owner ticked on /sell becomes the draft building facts', () => {
  assert.deepEqual(buildingFromSellerFeatures(['elevator', 'garage', 'garden', 'corner']), { elevator: 'yes', garage: 'private', garden: 'private' });
  assert.deepEqual(buildingFromSellerFeatures(['parking']), {});
  assert.deepEqual(buildingFromSellerFeatures(undefined), {});
});

test('card tags list only what the unit has, in short words; street parking is not a garage', () => {
  const p = { type: 'apartment', building: { elevator: 'yes', garage: 'street', garden: 'no', landShare: 'yes' } };
  assert.deepEqual(cardFeatures(p).map((f) => f.label), ['أسانسير', 'حصة أرض']);
  assert.deepEqual(cardFeatures({ type: 'villa', features_ar: ['جراج خاص', 'حديقة'] }).map((f) => f.key), ['garage', 'garden']);
  assert.deepEqual(cardFeatures({ type: 'land', building: { elevator: 'yes' } }), []);
  assert.deepEqual(cardFeatures(p, false).map((f) => f.label), ['Elevator', 'Land share']);
});
