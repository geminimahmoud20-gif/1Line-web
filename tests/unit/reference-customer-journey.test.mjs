// tests/unit/reference-customer-journey.test.mjs
// Unit tests for 1Line OS End-to-End Reference Customer Journey Service
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  JOURNEY_PHASES,
  step1_executeInquiryIntake,
  step2_executeQualification,
  step3_executeMatchingAndNomination,
  step4_executeSiteVisit,
  step5_executeOfferAndGate2,
  step6_executeContractAndGate3,
  step7_executeCollectionAndAfterSales,
  runReferenceCustomerJourneySimulation,
  auditLeadJourney
} from '../../src/services/referenceCustomerJourney.js';

test('reference-journey: Step 1 enforces Law 151/2020 and isolates contact data', () => {
  const invalid = step1_executeInquiryIntake({ name: 'عميل بلا موافقة', source: 'website', consent: false });
  assert.equal(invalid.success, false);
  assert.ok(invalid.errors.some(e => e.includes('151/2020')));

  const valid = step1_executeInquiryIntake({
    name: 'أحمد محمود',
    source: 'founder_content',
    consent: true,
    phone: '01012345678',
    assignedTo: 'Sales Team A'
  });
  assert.equal(valid.success, true);
  assert.equal(valid.lead.status, 'new');
  assert.equal(valid.contact.accessRoleRequired, 'ld.phone');
  assert.equal(valid.task1.handoffNumber, 1);
  assert.equal(valid.task1.slaHours, 0.25);
});

test('reference-journey: Step 2 validates 5-question profile and transitions to qualified', () => {
  const step1 = step1_executeInquiryIntake({ name: 'كريم', source: 'website', consent: true });
  const incomplete = step2_executeQualification(step1.lead, { budgetMin: 0 });
  assert.equal(incomplete.success, false);

  const complete = step2_executeQualification(step1.lead, {
    budgetMin: 2000000,
    budgetMax: 2500000,
    paymentMethod: 'cash',
    targetSectors: ['شرق'],
    purpose: 'residence',
    decisionTimeline: 'immediate'
  });
  assert.equal(complete.success, true);
  assert.equal(complete.lead.status, 'qualified');
  assert.equal(complete.task3.handoffNumber, 3);
});

test('reference-journey: Step 3 assembles 3-tier nomination pack with pitch or falls back to 7-day SearchRequest', () => {
  const step1 = step1_executeInquiryIntake({ name: 'سارة', source: 'referral', consent: true });
  const step2 = step2_executeQualification(step1.lead, {
    budgetMin: 1800000,
    budgetMax: 2200000,
    paymentMethod: 'cash',
    targetSectors: ['شرق'],
    purpose: 'residence',
    decisionTimeline: 'immediate'
  });

  // Fallback to SearchRequest with 7-day SLA
  const lowInv = step3_executeMatchingAndNomination(step2.lead, []);
  assert.equal(lowInv.success, true);
  assert.equal(lowInv.lead.status, 'matched');
  assert.equal(lowInv.lead.hasOpenSearchRequest, true);
  assert.equal(lowInv.task4.handoffNumber, 4);

  // Full 3-Tier pack
  const properties = [
    { id: 'p1', title_ar: 'وحدة 1', area: 'east', price: 2000000, size: 150, propertyType: 'apartment', purpose: 'residence', gate1Passed: true },
    { id: 'p2', title_ar: 'وحدة 2', area: 'east', price: 1950000, size: 170, propertyType: 'apartment', purpose: 'residence', gate1Passed: true },
    { id: 'p3', title_ar: 'وحدة 3', area: 'east', price: 2150000, size: 190, propertyType: 'apartment', purpose: 'residence', gate1Passed: true }
  ];
  const full = step3_executeMatchingAndNomination(step2.lead, properties);
  assert.equal(full.success, true);
  assert.equal(full.nominationPack.length, 3);
  assert.ok(full.pitchMessage.includes('باقة الترشيحات'));
});

test('reference-journey: Step 4 handles site visit report and >= 5M Founder sign-off threshold', () => {
  const step1 = step1_executeInquiryIntake({ name: 'مستثمر كبير', source: 'founder_content', consent: true });
  const step2 = step2_executeQualification(step1.lead, {
    budgetMin: 5500000,
    budgetMax: 6000000,
    paymentMethod: 'cash',
    targetSectors: ['شرق'],
    purpose: 'investment',
    decisionTimeline: 'immediate'
  });

  const blocked = step4_executeSiteVisit(step2.lead, { propertyId: 'p1', completed: true }, { isFounderApproved: false });
  assert.equal(blocked.success, false);
  assert.equal(blocked.deliverableKey, 'founder_high_value_approval');

  const approved = step4_executeSiteVisit(step2.lead, { propertyId: 'p1', completed: true }, { isFounderApproved: true });
  assert.equal(approved.success, true);
  assert.equal(approved.lead.status, 'negotiating');
  assert.equal(approved.task7.handoffNumber, 7);
});

test('reference-journey: Step 5 and 6 enforce Gate 2 and Gate 3 checklists', () => {
  const step1 = step1_executeInquiryIntake({ name: 'خالد', source: 'website', consent: true });
  const step2 = step2_executeQualification(step1.lead, {
    budgetMin: 2000000,
    budgetMax: 2500000,
    paymentMethod: 'cash',
    targetSectors: ['شرق'],
    purpose: 'residence',
    decisionTimeline: 'immediate'
  });
  const step4 = step4_executeSiteVisit(step2.lead, { propertyId: 'p1', completed: true });

  const step5 = step5_executeOfferAndGate2(
    step4.lead,
    { offeredPrice: 2200000, downPayment: 800000 },
    {
      priceAndAvailabilityReconfirmed: true,
      negativeCertificateObtained: true,
      propertyMemoReady: true,
      buyerInformedInWritingOfTitleType: true
    }
  );
  assert.equal(step5.success, true);
  assert.equal(step5.lead.status, 'closing');
  assert.equal(step5.task8.handoffNumber, 8);

  const step6 = step6_executeContractAndGate3(
    step5.lead,
    { executedPrice: 2200000 },
    {
      originalDocumentsInspectedByLawyer: true,
      contractDraftedByCompanyLawyer: true,
      paymentMethodVerified: true,
      commissionAgreementSigned: true
    }
  );
  assert.equal(step6.success, true);
  assert.equal(step6.lead.status, 'closed');
  assert.equal(step6.task9.handoffNumber, 9);
});

test('reference-journey: Step 7 awards 5k/1M incentive UPON COLLECTION ONLY', () => {
  const closedLead = { id: 'l-closed', name: 'عميل', status: 'closed', executedPrice: 2000000 };

  // Prior to collection
  const preCol = step7_executeCollectionAndAfterSales(closedLead, { executedPrice: 2000000, collectedAmount: 0 });
  assert.equal(preCol.agentIncentivePayable, 0);

  // Upon collection: 50,000 collected (2.5% of 2M)
  const postCol = step7_executeCollectionAndAfterSales(closedLead, { executedPrice: 2000000, collectedAmount: 50000 });
  assert.equal(postCol.agentIncentivePayable, 250); // (50,000 / 1,000,000) * 5,000
  assert.equal(postCol.task10.handoffNumber, 10);
  assert.equal(postCol.task10.slaHours, 720);
});

test('reference-journey: Simulation and Audit', () => {
  const sim = runReferenceCustomerJourneySimulation();
  assert.equal(sim.success, true);
  assert.equal(sim.tasks.length, 7);
  const audit = auditLeadJourney(sim.lead);
  assert.equal(audit.isCompliant, true);
  assert.equal(audit.progressPercent, 100);
});
