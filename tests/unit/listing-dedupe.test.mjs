import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isActiveListing,
  findExistingLeadListing,
  findPotentialDuplicateListing,
  listingDiffPatch,
  analyzeConcurrentEdits
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
