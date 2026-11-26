import test from 'node:test';
import assert from 'node:assert/strict';
import {
  detectAreaSupplyDeficits,
  findUnconvertedSellerLeads,
  matchSellerLeadsToSupplyDeficits,
  buildPrepopulatedPropertyFromLead
} from '../../src/utils/supplyGapMatcher.js';
import { findExistingLeadListing, findPotentialDuplicateListing } from '../../src/utils/listingDedupe.js';

const TEST_AREAS = [
  { id: 'center_akhmeem', name_ar: 'أخميم', name_en: 'Akhmim', parentId: '' },
  { id: 'sohag_east', name_ar: 'سوهاج شرق', name_en: 'East Sohag', parentId: '' }
];

test('Complete Supply Gap Auto-Matching and Conversion Lifecycle', () => {
  // Step 1: Inventory state - Akhmim has 0 properties, East Sohag has 4
  const properties = [
    { id: 'p1', areaKey: 'sohag_east', status: 'published', type: 'apartment' },
    { id: 'p2', areaKey: 'sohag_east', status: 'published', type: 'apartment' },
    { id: 'p3', areaKey: 'sohag_east', status: 'published', type: 'apartment' },
    { id: 'p4', areaKey: 'sohag_east', status: 'published', type: 'apartment' }
  ];

  const demands = [
    { id: 'd-buyer-1', area: 'center_akhmeem', status: 'active' },
    { id: 'd-buyer-2', area: 'center_akhmeem', status: 'active' },
    { id: 'd-buyer-3', area: 'center_akhmeem', status: 'active' }
  ];

  // Step 2: Unconverted seller lead in Akhmim
  const leads = [
    {
      id: 'lead-seller-akhmeem-1',
      name: 'نورهان اسماعيل',
      phone: '01011122233',
      type: 'seller',
      landingPage: '/sell',
      timestamp: '2026-11-25T10:00:00.000Z',
      details: {
        propertyType: 'apartment',
        area: 'center_akhmeem',
        location: 'شارع حلمي الشريف الرئيسي',
        askingPrice: '1,750,000',
        size: '120',
        rooms: '4',
        floor: '3',
        images: ['https://example.com/photo1.jpg', 'https://example.com/photo2.jpg'],
        finishing: 'super_lux',
        finishingLabelAr: 'سوبر لوكس'
      }
    }
  ];

  // Step 3: Run matching engine
  const initialMatch = matchSellerLeadsToSupplyDeficits(properties, leads, demands, TEST_AREAS);

  assert.equal(initialMatch.criticalDeficitCount, 1);
  const akhmeemDeficit = initialMatch.matchedDeficits.find((d) => d.areaId === 'center_akhmeem');
  assert.ok(akhmeemDeficit);
  assert.equal(akhmeemDeficit.severity, 'critical');
  assert.equal(akhmeemDeficit.matchingCount, 1);
  assert.equal(akhmeemDeficit.matchingLeads[0].leadName, 'نورهان اسماعيل');
  assert.equal(akhmeemDeficit.matchingLeads[0].askingPrice, 1750000);

  // Step 4: Simulate 1-click conversion
  const candidate = akhmeemDeficit.matchingLeads[0];
  const prepopulatedDraft = buildPrepopulatedPropertyFromLead(candidate.leadRef, TEST_AREAS);

  assert.equal(prepopulatedDraft.suggestedId, 'prop-lead-lead-seller-akhmeem-1');
  assert.equal(prepopulatedDraft.price, 1750000);
  assert.equal(prepopulatedDraft.size, 120);
  assert.equal(prepopulatedDraft.bedrooms, 4);
  assert.equal(prepopulatedDraft.images.length, 2);
  assert.ok(prepopulatedDraft.title_ar.includes('أخميم'));
  assert.ok(!prepopulatedDraft.title_ar.includes('area_'));

  // Verify deduplication check: candidate draft shouldn't conflict yet
  assert.equal(findPotentialDuplicateListing(properties, prepopulatedDraft), null);

  // Step 5: Listing is published by manager
  const publishedListing = {
    ...prepopulatedDraft,
    id: prepopulatedDraft.suggestedId,
    status: 'published',
    approval: 'approved'
  };
  properties.push(publishedListing);

  // Verify that subsequent conversion attempt of the same lead opens existing instead of duplicating!
  const existingListing = findExistingLeadListing(properties, 'lead-seller-akhmeem-1');
  assert.ok(existingListing);
  assert.equal(existingListing.id, 'prop-lead-lead-seller-akhmeem-1');

  // Step 6: Re-run matching engine after conversion
  const afterPublishMatch = matchSellerLeadsToSupplyDeficits(properties, leads, demands, TEST_AREAS);
  const updatedAkhmeem = afterPublishMatch.matchedDeficits.find((d) => d.areaId === 'center_akhmeem');
  
  // Akhmim now has 1 active listing and 0 pending unconverted seller leads!
  assert.equal(updatedAkhmeem.activeSupply, 1);
  assert.equal(updatedAkhmeem.matchingCount, 0);
});
