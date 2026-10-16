import test from 'node:test';
import assert from 'node:assert/strict';
import { listingBadges, reviewState } from '../../src/utils/listingBadges.js';

test('availability follows the publishing status and can be hidden', () => {
  assert.equal(listingBadges({ status: 'published' }).availability.label, 'متاح');
  assert.equal(listingBadges({ status: 'under_negotiation' }).availability.label, 'قيد التفاوض');
  assert.equal(listingBadges({ status: 'sold' }).availability.label, 'تم البيع');
  assert.equal(listingBadges({}).availability.key, 'available');
  assert.equal(listingBadges({ status: 'sold', availabilityBadge: 'hide' }).availability, null);
  assert.equal(listingBadges({ status: 'hidden' }).availability, null);
  assert.equal(listingBadges({ status: 'sold' }, false).availability.label, 'Sold');
});

test('review badge: set in the CRM, hidden by default, legacy legal record counts as approved', () => {
  assert.equal(listingBadges({}).review, null);
  assert.equal(listingBadges({ reviewBadge: 'verified' }).review.label, 'مراجَع ومعتمد');
  assert.equal(listingBadges({ reviewBadge: 'in_review' }).review.label, 'قيد المراجعة');
  assert.equal(listingBadges({ reviewBadge: 'not_reviewed' }).review.label, 'لم يُراجَع بعد');
  assert.equal(reviewState({ legalStatus: { ownershipType_ar: 'عقد مسجل' } }), 'verified');
  assert.equal(listingBadges({ legalStatus: {}, reviewBadge: 'none' }).review, null);
  assert.deepEqual(listingBadges({ isDemo: true, status: 'sold', reviewBadge: 'verified' }), { availability: null, review: null });
});
