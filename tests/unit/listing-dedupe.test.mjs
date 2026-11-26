import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isActiveListing,
  findExistingLeadListing,
  findPotentialDuplicateListing,
  listingDiffPatch,
  analyzeConcurrentEdits,
  isSameListingPair,
  findDuplicateListingPairs
} from '../../src/utils/listingDedupe.js';

test('findExistingLeadListing finds active listing by sourceLeadId and ignores trashed/deleted ones', () => {
  const props = [
    { id: 'p-trash', sourceLeadId: 'L1', status: 'trash', title_ar: 'محذوف' },
    { id: 'p-del', sourceLeadId: 'L1', deleted: true, title_ar: 'ملغي' },
    { id: 'p-live', sourceLeadId: 'L1', status: 'published', approval: 'approved', title_ar: 'حي' }
  ];
  assert.equal(isActiveListing(props[0]), false);
  assert.equal(isActiveListing(props[1]), false);
  assert.equal(findExistingLeadListing(props, 'L1')?.id, 'p-live');
  assert.equal(findExistingLeadListing([props[0]], 'L1'), null);
});

test('findPotentialDuplicateListing catches duplicate conversions for same seller lead or identical unit specs', () => {
  const existing = [
    {
      id: 'prop-1',
      sourceLeadId: 'lead-99',
      title_ar: 'شقة سكنية بإطلالة بانورامية',
      type: 'apartment',
      areaKey: 'akhmin',
      price: 1750000,
      size: 120,
      status: 'hidden',
      approval: 'pending'
    }
  ];

  // Same seller lead converted again with template title
  const sameLeadDup = findPotentialDuplicateListing(existing, {
    id: 'prop-2',
    sourceLeadId: 'lead-99',
    title_ar: 'عرض بيع: شقة سكنية 120م² في أخميم',
    type: 'apartment',
    areaKey: 'akhmin',
    price: 1750000,
    size: 120
  });
  assert.equal(sameLeadDup?.id, 'prop-1');

  // Broker adding a DIFFERENT unit (different size/type) is allowed
  const brokerSecondUnit = findPotentialDuplicateListing(existing, {
    id: 'prop-3',
    sourceLeadId: 'lead-99',
    title_ar: 'فيلا مستقلة 300م²',
    type: 'villa',
    areaKey: 'new_sohag',
    price: 6000000,
    size: 300
  }, { isBroker: true });
  assert.equal(brokerSecondUnit, null);
});

test('findPotentialDuplicateListing catches the same unit re-listed by someone else at a close but not identical price', () => {
  const existing = [{
    id: 'prop-1',
    title_ar: 'وصال هاوس | شقة أمام الإدارة الزراعية مباشرة على الطريق الرئيسى',
    type: 'apartment',
    areaKey: 'akhmin',
    price: 1200000,
    size: 110,
    status: 'pending'
  }];

  // No shared lead, different submitter, 4% cheaper asking price — still the same unit
  const closePrice = findPotentialDuplicateListing(existing, {
    id: 'prop-2',
    title_ar: 'وصال هاوس | شقة أمام الإدارة الزراعية مباشرة على الطريق الرئيسى',
    type: 'apartment',
    areaKey: 'akhmin',
    price: 1250000,
    size: 110
  });
  assert.equal(closePrice?.id, 'prop-1');

  // A genuinely different price (25% off) is not flagged as the same unit
  const farPrice = findPotentialDuplicateListing(existing, {
    id: 'prop-3',
    title_ar: 'وصال هاوس | شقة أمام الإدارة الزراعية مباشرة على الطريق الرئيسى',
    type: 'apartment',
    areaKey: 'akhmin',
    price: 1500000,
    size: 110
  });
  assert.equal(farPrice, null);
});

test('listingDiffPatch returns only modified fields so concurrent edits to other fields are preserved', () => {
  const original = {
    id: 'prop-1',
    title_ar: 'شقة 120م',
    price: 1750000,
    size: 120,
    images: ['https://example.com/1.jpg'],
    approval: 'pending'
  };
  const editedByUserA = {
    ...original,
    title_ar: 'شقة سكنية بإطلالة بانورامية'
  };
  const patch = listingDiffPatch(original, editedByUserA);
  assert.deepEqual(patch, { title_ar: 'شقة سكنية بإطلالة بانورامية' });

  // _baseUpdatedAt is a synthetic field the edit form stamps onto its own snapshot for
  // concurrent-edit detection only; it must never leak into the saved patch.
  const withBaseStamp = { ...original, _baseUpdatedAt: '2026-01-01T00:00:00.000Z' };
  const patchWithNoRealChange = listingDiffPatch(withBaseStamp, original);
  assert.deepEqual(patchWithNoRealChange, {});
  assert.equal('price' in patch, false);
  assert.equal('approval' in patch, false);
});

test('analyzeConcurrentEdits detects conflict only when both colleagues edited the same field differently', () => {
  const original = { title_ar: 'عنوان قديم', price: 1500000, description_ar: 'وصف قديم' };
  const serverLatest = { title_ar: 'عنوان من الموظف', price: 1750000, description_ar: 'وصف قديم' };

  // Manager only changed description_ar -> NO conflict with employee's title/price edits
  const nonConflicting = analyzeConcurrentEdits(original, serverLatest, { description_ar: 'وصف جديد' });
  assert.equal(nonConflicting.hasConflicts, false);

  // Manager also changed price to 1,800,000 -> conflict detected on price
  const conflicting = analyzeConcurrentEdits(original, serverLatest, { price: 1800000 });
  assert.equal(conflicting.hasConflicts, true);
  assert.deepEqual(conflicting.conflicts, ['price']);
});

test('isSameListingPair: two unrelated plots never match on area/size/price/type alone', () => {
  // Two genuinely different land plots that happen to share district, size, price and type
  const masa29 = { id: 'a', title_ar: 'Masa 29 land plot', areaKey: 'new_sohag', size: 276, price: 1250000, type: 'land', status: 'published' };
  const otherPlot = { id: 'b', title_ar: 'Block 31 land plot', areaKey: 'new_sohag', size: 276, price: 1250000, type: 'land', status: 'published' };
  assert.equal(isSameListingPair(masa29, otherPlot), false);
});

test('isSameListingPair: the same listing re-entered (same title and specs) is caught', () => {
  const a = { id: 'a', title_ar: 'Masa 29 land plot', areaKey: 'new_sohag', size: 276, price: 1250000, type: 'land', status: 'published' };
  const b = { id: 'b', title_ar: '  masa 29   land plot  ', areaKey: 'new_sohag', size: 276, price: 1250000, type: 'land', status: 'published' };
  assert.equal(isSameListingPair(a, b), true);
});

test('isSameListingPair: the same source lead is a match on its own, titles aside', () => {
  const a = { id: 'a', title_ar: 'شقة أ', sourceLeadId: 'L1', status: 'published' };
  const b = { id: 'b', title_ar: 'شقة ب (نفس العميل)', sourceLeadId: 'L1', status: 'published' };
  assert.equal(isSameListingPair(a, b), true);
});

test('findDuplicateListingPairs: maps only the genuinely matching pair across a catalog, ignoring trashed listings', () => {
  const masa29 = { id: 'a', title_ar: 'Masa 29 land plot', areaKey: 'new_sohag', size: 276, price: 1250000, type: 'land', status: 'published' };
  const otherPlot = { id: 'b', title_ar: 'Block 31 land plot', areaKey: 'new_sohag', size: 276, price: 1250000, type: 'land', status: 'published' };
  const dup = { id: 'c', title_ar: 'Masa 29 land plot', areaKey: 'new_sohag', size: 276, price: 1250000, type: 'land', status: 'published' };
  const trashedDup = { id: 'd', title_ar: 'Masa 29 land plot', areaKey: 'new_sohag', size: 276, price: 1250000, type: 'land', status: 'trash' };
  const map = findDuplicateListingPairs([masa29, otherPlot, dup, trashedDup]);
  assert.equal(map.has('a'), true);
  assert.equal(map.has('b'), false);
  assert.equal(map.get('a').id, 'c');
  assert.equal(map.get('c').id, 'a');
  assert.equal(map.has('d'), false);
});
