// tests/unit/matching-engine-v2.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  calculateMatchScore,
  rankAndNominateProperties,
  formatNominationWhatsAppPitch
} from '../../src/services/matchingEngineV2.js';

test('matching-engine-v2: rejected property is strictly excluded with score 0', () => {
  const buyer = {
    id: 'lead-1',
    area: 'thakafa',
    budget: 2_000_000,
    propertyType: 'apartment',
    rejectedPropertyIds: ['prop-101']
  };

  const rejectedProp = {
    id: 'prop-101',
    areaKey: 'thakafa',
    price: 1_950_000,
    type: 'apartment',
    gate1Passed: true
  };

  const normalProp = {
    id: 'prop-102',
    areaKey: 'thakafa',
    price: 1_950_000,
    type: 'apartment',
    gate1Passed: true
  };

  const resRejected = calculateMatchScore(buyer, rejectedProp);
  assert.equal(resRejected.isExcluded, true);
  assert.equal(resRejected.score, 0);
  assert.match(resRejected.exclusionReason, /مرفوض مسبقاً/);

  const resNormal = calculateMatchScore(buyer, normalProp);
  assert.equal(resNormal.isExcluded, false);
  assert.ok(resNormal.score >= 80);
});

test('matching-engine-v2: disliked developer is strictly excluded', () => {
  const buyer = {
    id: 'lead-2',
    area: 'east',
    budget: 3_000_000,
    propertyType: 'apartment',
    dislikedDeveloperIds: ['dev-bad']
  };

  const devProp = {
    id: 'prop-201',
    developerId: 'dev-bad',
    areaKey: 'east',
    price: 2_900_000,
    type: 'apartment',
    gate1Passed: true
  };

  const res = calculateMatchScore(buyer, devProp);
  assert.equal(res.isExcluded, true);
  assert.equal(res.score, 0);
  assert.match(res.exclusionReason, /المطور العقاري مستبعد/);
});

test('matching-engine-v2: Gate 1 failure is excluded from matching', () => {
  const buyer = {
    id: 'lead-3',
    area: 'new_sohag',
    budget: 1_500_000,
    propertyType: 'apartment'
  };

  const unverifiedProp = {
    id: 'prop-301',
    areaKey: 'new_sohag',
    price: 1_400_000,
    type: 'apartment',
    gate1Passed: false
  };

  const res = calculateMatchScore(buyer, unverifiedProp);
  assert.equal(res.isExcluded, true);
  assert.equal(res.score, 0);
  assert.match(res.exclusionReason, /البوابة 1/);
});

test('matching-engine-v2: budget +10% challenge receives challenge points', () => {
  const buyer = {
    id: 'lead-4',
    area: 'thakafa',
    budget: 2_000_000,
    propertyType: 'apartment'
  };

  const exactProp = {
    id: 'prop-exact',
    areaKey: 'thakafa',
    price: 2_000_000,
    type: 'apartment',
    gate1Passed: true
  };

  const challengeProp = {
    id: 'prop-challenge',
    areaKey: 'thakafa',
    price: 2_150_000, // +7.5% (within +10% challenge window)
    type: 'apartment',
    gate1Passed: true
  };

  const resExact = calculateMatchScore(buyer, exactProp);
  const resChallenge = calculateMatchScore(buyer, challengeProp);

  assert.equal(resExact.breakdown.budget, 25);
  assert.equal(resChallenge.breakdown.budget, 20);
  assert.ok(resChallenge.reasons.some(r => r.includes('هامش التحدي')));
});

test('matching-engine-v2: rankAndNominateProperties creates 3-tier pack when >= 3 matching properties exist', () => {
  const buyer = {
    id: 'lead-5',
    personId: 'person-5',
    area: 'thakafa',
    budget: 2_500_000,
    propertyType: 'apartment'
  };

  const inventory = [
    { id: 'p-1', areaKey: 'thakafa', price: 2_450_000, size: 150, type: 'apartment', gate1Passed: true },
    { id: 'p-2', areaKey: 'thakafa', price: 2_200_000, size: 160, type: 'apartment', gate1Passed: true },
    { id: 'p-3', areaKey: 'thakafa', price: 2_600_000, size: 180, type: 'apartment', gate1Passed: true }
  ];

  const result = rankAndNominateProperties(buyer, inventory);

  assert.equal(result.canAssemble3TierPack, true);
  assert.equal(result.needsSearchRequest, false);
  assert.equal(result.nominationPack.length, 3);
  assert.equal(result.nominationPack[0].role, 'closest');
  assert.equal(result.nominationPack[1].role, 'value');
  assert.equal(result.nominationPack[2].role, 'challenge');
});

test('matching-engine-v2: rankAndNominateProperties generates SearchRequest with 7-day SLA when < 3 matching properties exist', () => {
  const buyer = {
    id: 'lead-6',
    personId: 'person-6',
    name: 'أحمد محمود',
    phone: '01012345678',
    area: 'kawthar',
    budget: 4_000_000,
    propertyType: 'villa'
  };

  // Only 1 matching property in Kawthar
  const inventory = [
    { id: 'p-single', areaKey: 'kawthar', price: 3_900_000, size: 250, type: 'villa', gate1Passed: true },
    { id: 'p-unrelated', areaKey: 'tahta', price: 800_000, size: 90, type: 'apartment', gate1Passed: true }
  ];

  const result = rankAndNominateProperties(buyer, inventory, { minScore: 60 });

  assert.equal(result.canAssemble3TierPack, false);
  assert.equal(result.needsSearchRequest, true);
  assert.ok(result.searchRequestDraft);
  assert.equal(result.searchRequestDraft.personId, 'person-6');

  // Verify 7-day SLA
  const opened = new Date(result.searchRequestDraft.openedAt).getTime();
  const deadline = new Date(result.searchRequestDraft.deadline).getTime();
  const diffDays = Math.round((deadline - opened) / (1000 * 60 * 60 * 24));
  assert.equal(diffDays, 7);
});

test('matching-engine-v2: formatNominationWhatsAppPitch produces professional 3-tier pitch', () => {
  const lead = { name: 'د. كريم الشريف' };
  const pack = [
    { propertyId: 'p-1', writtenRationale: 'الأقرب لمستشفى الجامعة' },
    { propertyId: 'p-2', writtenRationale: 'أفضل عائد استثماري وسعر للمتر' },
    { propertyId: 'p-3', writtenRationale: 'خيار التحدي مع خطة سداد مرنة' }
  ];
  const propsMap = {
    'p-1': { title_ar: 'شقة فاخرة حي الثقافة', price: 2_400_000 },
    'p-2': { title_ar: 'شقة واسعة حي شرق', price: 2_100_000 },
    'p-3': { title_ar: 'دوبلكس كورنيش النيل', price: 2_600_000 }
  };

  const text = formatNominationWhatsAppPitch(lead, pack, propsMap);
  assert.match(text, /د\. كريم الشريف/);
  assert.match(text, /الخيار الأقرب/);
  assert.match(text, /خيار القيمة/);
  assert.match(text, /خيار التحدي/);
  assert.match(text, /2,400,000 ج\.م/);
});
