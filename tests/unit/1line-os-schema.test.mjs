// tests/unit/1line-os-schema.test.mjs
// Unit tests for 1Line OS Schema, Models, and Financial Incentive Logic
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  validatePerson,
  createPersonDraft,
  validateBuyerProfile,
  createBuyerProfileDraft,
  generatePropertyCode,
  validateGate1Checklist,
  validateGate2Checklist,
  validateGate3Checklist,
  calculateComparativeValuation,
  evaluateDeveloperScorecard,
  createNominationPack,
  createSearchRequestDraft,
  createHandoffTask,
  calculateDealFinances,
  calculateAgentIncentiveOnCollection
} from '../../src/models/schema.js';

test('schema: validatePerson enforces name, valid source, and Egyptian Law 151/2020 consent', () => {
  const invalidNoConsent = { name: 'أحمد محمود', source: 'website', consent: false };
  const res1 = validatePerson(invalidNoConsent);
  assert.equal(res1.valid, false);
  assert.ok(res1.errors.some(e => e.includes('Egyptian Law 151/2020')));

  const invalidNoSource = { name: 'أحمد محمود', source: 'unknown_source', consent: true };
  const res2 = validatePerson(invalidNoSource);
  assert.equal(res2.valid, false);
  assert.ok(res2.errors.some(e => e.includes('Source is required')));

  const valid = createPersonDraft({ name: 'د. محمود', source: 'founder_content', consent: true });
  const res3 = validatePerson(valid);
  assert.equal(res3.valid, true);
  assert.equal(res3.errors.length, 0);
});

test('schema: validateBuyerProfile checks 5 essential qualification questions', () => {
  const incomplete = { budgetMin: 0, budgetMax: 0 };
  const res1 = validateBuyerProfile(incomplete);
  assert.equal(res1.valid, false);

  const complete = createBuyerProfileDraft({
    budgetMin: 2000000,
    budgetMax: 2500000,
    paymentMethod: 'cash',
    targetSectors: ['شرق'],
    purpose: 'residence',
    decisionTimeline: 'immediate'
  });
  const res2 = validateBuyerProfile(complete);
  assert.equal(res2.valid, true);
});

test('schema: generatePropertyCode formats city, sector, and 3-digit sequence', () => {
  assert.equal(generatePropertyCode('SOH', 'E', 1), 'SOH-E-001');
  assert.equal(generatePropertyCode('SOH', 'NS', 14), 'SOH-NS-014');
  assert.equal(generatePropertyCode('CAI', 'NC', 105), 'CAI-NC-105');
});

test('schema: Gate 1, 2, and 3 checklists enforce Playbook verification standards', () => {
  // Gate 1
  const gate1Pass = {
    sellerIdentityMatchesDeed: true,
    contractChainContinuous: true,
    areaSurveyMatches: true,
    deedType: 'registered'
  };
  assert.equal(validateGate1Checklist(gate1Pass).valid, true);

  const gate1Fail = {
    sellerIdentityMatchesDeed: true,
    contractChainContinuous: false, // broken chain
    areaSurveyMatches: true,
    deedType: 'invalid_type'
  };
  assert.equal(validateGate1Checklist(gate1Fail).valid, false);

  // Gate 2
  const gate2Pass = {
    priceAndAvailabilityReconfirmed: true,
    negativeCertificateObtained: true,
    propertyMemoReady: true,
    buyerInformedInWritingOfTitleType: true
  };
  assert.equal(validateGate2Checklist(gate2Pass).valid, true);

  // Gate 3
  const gate3Pass = {
    originalDocumentsInspectedByLawyer: true,
    contractDraftedByCompanyLawyer: true,
    paymentMethodVerified: true,
    commissionAgreementSigned: true,
    executedPrice: 2400000
  };
  assert.equal(validateGate3Checklist(gate3Pass).valid, true);
});

test('schema: calculateComparativeValuation requires 3-5 comps and produces ±5% spread', () => {
  const tooFew = [{ price: 2000000, area: 100 }];
  assert.equal(calculateComparativeValuation(tooFew).valid, false);

  const comps = [
    { price: 2000000, area: 100 }, // 20k/m
    { price: 2200000, area: 100 }, // 22k/m
    { price: 2100000, area: 100 }  // 21k/m
  ];
  const res = calculateComparativeValuation(comps);
  assert.equal(res.valid, true);
  assert.equal(res.avgPricePerMeter, 21000);
  assert.equal(res.minValuationPerMeter, 19950); // -5%
  assert.equal(res.maxValuationPerMeter, 22050); // +5%
});

test('schema: evaluateDeveloperScorecard handles exclusion and weighted score', () => {
  // Excluded case (unlicensed)
  const excluded = evaluateDeveloperScorecard(
    { deliveryTrackRecord: 5, constructionVsSchedule: 5, sohagClientFit: 5, commissionRegularity: 5, reputation: 5 },
    { licensed: false, deliveredAtLeastOnePriorProject: true, writtenCommissionAgreement: true, noMaterialPriceEscalationClause: true, noCashbackGimmicks: true }
  );
  assert.equal(excluded.status, 'rejected');

  // Approved trial case (score >= 3.5)
  const approved = evaluateDeveloperScorecard(
    { deliveryTrackRecord: 4, constructionVsSchedule: 4, sohagClientFit: 4, commissionRegularity: 4, reputation: 4 },
    { licensed: true, deliveredAtLeastOnePriorProject: true, writtenCommissionAgreement: true, noMaterialPriceEscalationClause: true, noCashbackGimmicks: true }
  );
  assert.equal(approved.status, 'trial_6m');
  assert.equal(approved.isApproved, true);
  assert.equal(approved.totalScore, 4.0);
});

test('schema: createNominationPack produces 3 distinct roles (closest, value, challenge)', () => {
  const pack = createNominationPack('p-1', { id: 'prop-1' }, { id: 'prop-2' }, { id: 'prop-3' });
  assert.equal(pack.length, 3);
  assert.equal(pack[0].role, 'closest');
  assert.equal(pack[1].role, 'value');
  assert.equal(pack[2].role, 'challenge');
});

test('schema: createSearchRequestDraft initiates a 7-day SLA countdown', () => {
  const req = createSearchRequestDraft('p-1', { area: 'الكوثر', budget: 3000000 });
  const openTime = new Date(req.openedAt).getTime();
  const deadlineTime = new Date(req.deadline).getTime();
  const diffDays = Math.round((deadlineTime - openTime) / (1000 * 60 * 60 * 24));
  assert.equal(diffDays, 7);
  assert.equal(req.status, 'open');
});

test('schema: createHandoffTask builds Playbook inter-departmental handoffs with proper SLA', () => {
  const h3 = createHandoffTask(3, 'p-1', 'Engy'); // Sales -> Inventory (48h)
  assert.equal(h3.fromDept, 'sales');
  assert.equal(h3.toDept, 'inventory');
  assert.equal(h3.handoffNumber, 3);

  const h8 = createHandoffTask(8, 'p-1', 'Mahmoud'); // Inventory -> Founder + Lawyer (Gate 3 - 48h)
  assert.equal(h8.handoffNumber, 8);
  assert.equal(h8.toDept, 'founder');
});

test('schema: calculateAgentIncentiveOnCollection awards 5,000 EGP per 1M collected strictly upon collection', () => {
  // If deal signed at 8M but collected is 0 -> incentive is 0!
  assert.equal(calculateAgentIncentiveOnCollection(0), 0);

  // If 2.5M collected -> (2.5M / 1M) * 5,000 = 12,500 EGP
  assert.equal(calculateAgentIncentiveOnCollection(2_500_000), 12_500);

  // If 8M Cairo unit collected in full -> 40,000 EGP
  assert.equal(calculateAgentIncentiveOnCollection(8_000_000), 40_000);
});
