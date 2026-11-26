import test from 'node:test';
import assert from 'node:assert/strict';
import {
  detectAreaSupplyDeficits,
  findUnconvertedSellerLeads,
  matchSellerLeadsToSupplyDeficits,
  buildPrepopulatedPropertyFromLead,
  resolveCleanAreaName
} from '../../src/utils/supplyGapMatcher.js';

const MOCK_AREAS = [
  { id: 'center_akhmeem', name_ar: 'أخميم', name_en: 'Akhmim', parentId: '' },
  { id: 'sohag_east', name_ar: 'سوهاج شرق', name_en: 'East Sohag', parentId: '' },
  { id: 'sohag_west', name_ar: 'سوهاج غرب', name_en: 'West Sohag', parentId: '' },
  { id: 'new_sohag', name_ar: 'سوهاج الجديدة', name_en: 'New Sohag', parentId: '' }
];

test('detectAreaSupplyDeficits identifies zero stock as critical and high demand as high deficit', () => {
  const properties = [
    { id: 'p1', areaKey: 'sohag_east', status: 'published', type: 'apartment' },
    { id: 'p2', areaKey: 'sohag_east', status: 'published', type: 'apartment' },
    { id: 'p3', areaKey: 'sohag_east', status: 'published', type: 'apartment' },
    { id: 'p4', areaKey: 'sohag_east', status: 'published', type: 'apartment' },
    // sohag_west has only 1 property
    { id: 'p5', areaKey: 'sohag_west', status: 'published', type: 'villa' }
    // center_akhmeem and new_sohag have 0 properties
  ];

  const demands = [
    { id: 'd1', area: 'center_akhmeem', status: 'active' },
    { id: 'd2', area: 'center_akhmeem', status: 'active' },
    { id: 'd3', area: 'sohag_west', status: 'active' },
    { id: 'd4', area: 'sohag_west', status: 'active' }
  ];

  const deficits = detectAreaSupplyDeficits(properties, demands, MOCK_AREAS);

  // Akhmim has 0 stock and 2 demands => critical
  const akhmeemDeficit = deficits.find((d) => d.areaId === 'center_akhmeem');
  assert.ok(akhmeemDeficit, 'Akhmim should be detected as deficit');
  assert.equal(akhmeemDeficit.severity, 'critical');
  assert.equal(akhmeemDeficit.activeSupply, 0);
  assert.equal(akhmeemDeficit.buyerDemandsCount, 2);

  // Sohag West has 1 stock and 2 demands => high deficit
  const westDeficit = deficits.find((d) => d.areaId === 'sohag_west');
  assert.ok(westDeficit);
  assert.equal(westDeficit.severity, 'high');
  assert.equal(westDeficit.activeSupply, 1);

  // Sohag East has 4 properties => balanced, not in deficits list
  const eastDeficit = deficits.find((d) => d.areaId === 'sohag_east');
  assert.equal(eastDeficit, undefined);
});

test('resolveCleanAreaName strips raw area_ machine IDs and returns clean Arabic name', () => {
  // Case 1: Known area ID
  assert.equal(resolveCleanAreaName('center_akhmeem', MOCK_AREAS, {}), 'أخميم');

  // Case 2: Machine ID "area_mvruggdx" but location text has Akhmim
  const cleaned = resolveCleanAreaName('area_mvruggdx', MOCK_AREAS, { location: 'شقة في أخميم شارع حلمي الشريف' });
  assert.equal(cleaned, 'أخميم');

  // Case 3: Machine ID with no text match falls back to default city name rather than machine ID
  const fallback = resolveCleanAreaName('area_abcdef123', MOCK_AREAS, {});
  assert.equal(fallback, 'سوهاج');
});

test('findUnconvertedSellerLeads excludes already converted and rejected leads, extracts valid specs', () => {
  const properties = [
    { id: 'prop-converted-1', sourceLeadId: 'lead-already-converted', status: 'published' }
  ];

  const leads = [
    {
      id: 'lead-already-converted',
      name: 'عميل تم تحويله',
      type: 'seller',
      details: { area: 'center_akhmeem', askingPrice: '2,000,000' }
    },
    {
      id: 'lead-rejected',
      name: 'عميل مرفوض',
      type: 'seller',
      status: 'lost',
      lostReason: 'property_rejected',
      details: { area: 'center_akhmeem', askingPrice: '1,500,000' }
    },
    {
      id: 'lead-candidate-1',
      name: 'نورهان اسماعيل',
      phone: '01011122233',
      type: 'seller',
      details: {
        propertyType: 'apartment',
        area: 'center_akhmeem',
        askingPrice: '1,750,000',
        size: '120',
        rooms: '4',
        floor: '3',
        images: ['https://example.com/img1.jpg', 'https://example.com/img2.jpg']
      }
    }
  ];

  const candidates = findUnconvertedSellerLeads(leads, properties, MOCK_AREAS);

  assert.equal(candidates.length, 1);
  assert.equal(candidates[0].leadId, 'lead-candidate-1');
  assert.equal(candidates[0].leadName, 'نورهان اسماعيل');
  assert.equal(candidates[0].askingPrice, 1750000);
  assert.equal(candidates[0].size, 120);
  assert.equal(candidates[0].rooms, 4);
  assert.equal(candidates[0].images.length, 2);
  assert.ok(candidates[0].readinessScore >= 80);
});

test('matchSellerLeadsToSupplyDeficits cross-matches candidate leads with shortage areas', () => {
  const properties = [
    { id: 'p1', areaKey: 'sohag_east', status: 'published', type: 'apartment' }
  ];

  const demands = [
    { id: 'd1', area: 'center_akhmeem', status: 'active' }
  ];

  const leads = [
    {
      id: 'lead-akhmeem-owner',
      name: 'مالك عقار أخميم',
      phone: '01099887766',
      type: 'seller',
      details: {
        propertyType: 'apartment',
        area: 'center_akhmeem',
        askingPrice: '1,750,000',
        size: '120'
      }
    }
  ];

  const matchResult = matchSellerLeadsToSupplyDeficits(properties, leads, demands, MOCK_AREAS);

  assert.equal(matchResult.totalDeficitAreas >= 1, true);
  const akhmeemMatch = matchResult.matchedDeficits.find((d) => d.areaId === 'center_akhmeem');
  assert.ok(akhmeemMatch);
  assert.equal(akhmeemMatch.matchingCount, 1);
  assert.equal(akhmeemMatch.matchingLeads[0].leadId, 'lead-akhmeem-owner');
  assert.equal(akhmeemMatch.matchingValue, 1750000);
});

test('buildPrepopulatedPropertyFromLead creates clean deterministic draft without machine codes in title', () => {
  const lead = {
    id: 'lead-777',
    name: 'مؤمن رمضان',
    phone: '01151015008',
    type: 'seller',
    notes: 'المالك يرغب في البيع العاجل كاش',
    details: {
      propertyType: 'apartment',
      area: 'area_mvruggdx',
      location: 'أخميم شارع حلمي الشريف',
      askingPrice: '1,750,000',
      size: '120',
      rooms: '4',
      floor: '2',
      finishing: 'super_lux',
      finishingLabelAr: 'سوبر لوكس',
      images: ['https://example.com/p1.jpg']
    }
  };

  const draft = buildPrepopulatedPropertyFromLead(lead, MOCK_AREAS);

  assert.equal(draft.suggestedId, 'prop-lead-lead-777');
  assert.equal(draft.type, 'apartment');
  assert.equal(draft.price, 1750000);
  assert.equal(draft.size, 120);
  assert.equal(draft.bedrooms, 4);
  assert.equal(draft.floor, '2');
  assert.equal(draft.contactName, 'مؤمن رمضان');
  assert.equal(draft.contactPhone, '01151015008');
  assert.equal(draft.sourceLeadId, 'lead-777');
  assert.equal(draft.status, 'hidden');

  // Verify title is cleanly formatted and contains NO machine code "area_mvruggdx"
  assert.ok(draft.title_ar.includes('أخميم'));
  assert.ok(!draft.title_ar.includes('area_mvruggdx'));
  assert.equal(draft.title_ar, 'عرض بيع: شقة سكنية 120م² في أخميم');
});
