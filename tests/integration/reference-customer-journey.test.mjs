// tests/integration/reference-customer-journey.test.mjs
// Comprehensive End-to-End Reference Customer Journey Integration Tests for 1Line OS
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

import { HIGH_VALUE_DEAL_THRESHOLD } from '../../src/services/stateMachineEngine.js';

test('1Line OS Reference Journey - Step 1: Intake enforces Law 151/2020 consent and generates Task 1 (15m SLA)', () => {
  // Negative test: Missing consent under Egyptian Law 151/2020
  const noConsentRes = step1_executeInquiryIntake({
    name: 'عميل بدون موافقة',
    source: 'website',
    consent: false,
    phone: '01099998888'
  });
  assert.equal(noConsentRes.success, false);
  assert.ok(noConsentRes.errors.some(e => e.includes('151/2020')));

  // Positive test: Valid consent and intake
  const intakeRes = step1_executeInquiryIntake({
    name: 'أحمد محمود القاضي',
    source: 'facebook_ads',
    consent: true,
    phone: '01012345678',
    whatsapp: '01012345678',
    city: 'سوهاج',
    sector: 'شرق'
  });

  assert.equal(intakeRes.success, true);
  assert.equal(intakeRes.lead.status, 'new');
  assert.equal(intakeRes.lead.consent, true);
  // Phone isolated in separate contact entity
  assert.equal(intakeRes.contact.phone, '01012345678');
  assert.equal(intakeRes.contact.accessRoleRequired, 'ld.phone');
  // Task 1 generated: Ops -> Sales with 15m SLA (0.25h)
  assert.equal(intakeRes.task1.handoffNumber, 1);
  assert.equal(intakeRes.task1.fromDept, 'ops');
  assert.equal(intakeRes.task1.toDept, 'sales');
  assert.ok(intakeRes.auditLog.includes('قانون 151/2020'));
});

test('1Line OS Reference Journey - Step 2: Qualification validates 5 questions and generates Task 3 (48h SLA)', () => {
  const step1 = step1_executeInquiryIntake({
    name: 'محمود عبد الرحيم',
    source: 'founder_content',
    consent: true,
    phone: '01122334455'
  });

  // Negative test: Incomplete buyer profile
  const incompleteRes = step2_executeQualification(step1.lead, {
    budgetMin: 0,
    budgetMax: 0
  });
  assert.equal(incompleteRes.success, false);

  // Positive test: Complete 5 questions
  const qualRes = step2_executeQualification(step1.lead, {
    budgetMin: 3000000,
    budgetMax: 3500000,
    paymentMethod: 'cash',
    targetSectors: ['شرق'],
    purpose: 'residence',
    decisionTimeline: 'immediate'
  });

  assert.equal(qualRes.success, true);
  assert.equal(qualRes.lead.status, 'qualified');
  assert.equal(qualRes.buyerProfile.budgetMax, 3500000);
  assert.equal(qualRes.task3.handoffNumber, 3);
  assert.equal(qualRes.task3.fromDept, 'sales');
  assert.equal(qualRes.task3.toDept, 'inventory');
});

test('1Line OS Reference Journey - Step 3: Matching produces 3-Tier pack or triggers 7-day SLA SearchRequest', () => {
  const step1 = step1_executeInquiryIntake({
    name: 'حسام البدري',
    source: 'referral',
    consent: true,
    phone: '01234567890'
  });
  const step2 = step2_executeQualification(step1.lead, {
    budgetMin: 2000000,
    budgetMax: 2500000,
    paymentMethod: 'cash',
    targetSectors: ['شرق'],
    purpose: 'residence',
    decisionTimeline: 'immediate'
  });

  // Subcase A: Less than 3 properties -> generates SearchRequest with 7-day SLA
  const lowInventoryRes = step3_executeMatchingAndNomination(step2.lead, [
    {
      id: 'p-single',
      title_ar: 'شقة 150م حي شرق',
      area: 'east',
      price: 2200000,
      size: 150,
      propertyType: 'apartment',
      purpose: 'residence',
      gate1Passed: true
    }
  ]);
  assert.equal(lowInventoryRes.success, true);
  assert.equal(lowInventoryRes.lead.status, 'matched');
  assert.equal(lowInventoryRes.lead.hasOpenSearchRequest, true);
  assert.ok(lowInventoryRes.searchRequest !== null);
  assert.equal(lowInventoryRes.task4.handoffNumber, 4);

  // Subcase B: >= 3 properties -> generates 3-tier pack (Closest, Value, Challenge) with pitch
  const richInventory = [
    {
      id: 'p-1',
      title_ar: 'شقة 160م حي شرق سوهاج',
      area: 'east',
      price: 2300000,
      size: 160,
      propertyType: 'apartment',
      purpose: 'residence',
      gate1Passed: true,
      developerName: 'شركة النيل للتطوير'
    },
    {
      id: 'p-2',
      title_ar: 'شقة 190م حي شرق سعر مميز',
      area: 'east',
      price: 2200000,
      size: 190,
      propertyType: 'apartment',
      purpose: 'residence',
      gate1Passed: true,
      developerName: 'شركة الصفا'
    },
    {
      id: 'p-3',
      title_ar: 'شقة 220م حي شرق تشطيب كامل',
      area: 'east',
      price: 2450000,
      size: 220,
      propertyType: 'apartment',
      purpose: 'residence',
      gate1Passed: true,
      developerName: 'شركة النيل للتطوير'
    }
  ];

  const fullMatchRes = step3_executeMatchingAndNomination(step2.lead, richInventory, {
    agentName: 'محمد طارق'
  });
  assert.equal(fullMatchRes.success, true);
  assert.equal(fullMatchRes.lead.status, 'matched');
  assert.equal(fullMatchRes.nominationPack.length, 3);
  assert.ok(fullMatchRes.pitchMessage.includes('باقة الترشيحات'));
  assert.equal(fullMatchRes.task4.handoffNumber, 4);
});

test('1Line OS Reference Journey - Step 4: Site Visit & High-Value Founder Sign-off Threshold (>= 5M EGP)', () => {
  // Case A: Normal deal (< 5M)
  const step1Normal = step1_executeInquiryIntake({ name: 'كريم', source: 'website', consent: true, phone: '01011111111' });
  const step2Normal = step2_executeQualification(step1Normal.lead, {
    budgetMin: 2000000,
    budgetMax: 3000000,
    paymentMethod: 'cash',
    targetSectors: ['شرق'],
    purpose: 'residence',
    decisionTimeline: 'immediate'
  });

  const visitNormal = step4_executeSiteVisit(step2Normal.lead, {
    propertyId: 'p-1',
    completed: true,
    clientFeedback: 'الموقع ممتاز'
  });
  assert.equal(visitNormal.success, true);
  assert.equal(visitNormal.lead.status, 'negotiating');
  assert.equal(visitNormal.task7.handoffNumber, 7);

  // Case B: High-Value deal (>= 5M) WITHOUT Founder sign-off is BLOCKED
  const step1High = step1_executeInquiryIntake({ name: 'د. خالد (مستثمر)', source: 'founder_content', consent: true, phone: '01022222222' });
  const step2High = step2_executeQualification(step1High.lead, {
    budgetMin: 6000000,
    budgetMax: 7000000, // >= 5M Threshold
    paymentMethod: 'cash',
    targetSectors: ['شرق'],
    purpose: 'investment',
    decisionTimeline: 'immediate'
  });

  const visitHighBlocked = step4_executeSiteVisit(step2High.lead, {
    propertyId: 'p-high-val',
    completed: true,
    clientFeedback: 'مهتم بشراء كامل الدور'
  }, { isFounderApproved: false, userRole: 'sales_agent' });

  assert.equal(visitHighBlocked.success, false);
  assert.equal(visitHighBlocked.deliverableKey, 'founder_high_value_approval');

  // Case C: High-Value deal WITH Founder sign-off SUCCEEDS
  const visitHighApproved = step4_executeSiteVisit(step2High.lead, {
    propertyId: 'p-high-val',
    completed: true,
    clientFeedback: 'معتمد من د. محمود الباز'
  }, { isFounderApproved: true });

  assert.equal(visitHighApproved.success, true);
  assert.equal(visitHighApproved.lead.status, 'negotiating');
  assert.equal(visitHighApproved.lead.isFounderApproved, true);
});

test('1Line OS Reference Journey - Step 5: Written Offer and Gate 2 technical checklist generate Task 8 (48h SLA)', () => {
  const step1 = step1_executeInquiryIntake({ name: 'طارق', source: 'website', consent: true, phone: '01033333333' });
  const step2 = step2_executeQualification(step1.lead, {
    budgetMin: 2000000,
    budgetMax: 2500000,
    paymentMethod: 'cash',
    targetSectors: ['شرق'],
    purpose: 'residence',
    decisionTimeline: 'immediate'
  });
  const step4 = step4_executeSiteVisit(step2.lead, {
    propertyId: 'p-1',
    completed: true,
    clientFeedback: 'جاهز لتقديم عرض'
  });

  // Negative: Gate 2 check fails if items are missing
  const failGate2 = step5_executeOfferAndGate2(
    step4.lead,
    { offeredPrice: 2400000, downPayment: 1000000 },
    { priceAndAvailabilityReconfirmed: true, negativeCertificateObtained: false }
  );
  assert.equal(failGate2.success, false);

  // Positive: Gate 2 passed and written offer submitted
  const passGate2 = step5_executeOfferAndGate2(
    step4.lead,
    { offeredPrice: 2400000, downPayment: 1000000, installmentYears: 0 },
    {
      priceAndAvailabilityReconfirmed: true,
      negativeCertificateObtained: true,
      propertyMemoReady: true,
      buyerInformedInWritingOfTitleType: true
    }
  );
  assert.equal(passGate2.success, true);
  assert.equal(passGate2.lead.status, 'closing');
  assert.equal(passGate2.lead.gate2Passed, true);
  assert.equal(passGate2.task8.handoffNumber, 8);
  assert.equal(passGate2.task8.toDept, 'founder');
});

test('1Line OS Reference Journey - Step 6: Contract execution and Gate 3 lawyer sign-off generate Task 9 (12h SLA)', () => {
  const step1 = step1_executeInquiryIntake({ name: 'سيد فهمي', source: 'signage', consent: true, phone: '01044444444' });
  const step2 = step2_executeQualification(step1.lead, {
    budgetMin: 3000000,
    budgetMax: 3200000,
    paymentMethod: 'cash',
    targetSectors: ['شرق'],
    purpose: 'residence',
    decisionTimeline: 'immediate'
  });
  const step4 = step4_executeSiteVisit(step2.lead, { propertyId: 'p-1', completed: true });
  const step5 = step5_executeOfferAndGate2(
    step4.lead,
    { offeredPrice: 3100000, downPayment: 1500000 },
    {
      priceAndAvailabilityReconfirmed: true,
      negativeCertificateObtained: true,
      propertyMemoReady: true,
      buyerInformedInWritingOfTitleType: true
    }
  );

  // Negative: Gate 3 incomplete
  const failGate3 = step6_executeContractAndGate3(
    step5.lead,
    { executedPrice: 3100000 },
    { originalDocumentsInspectedByLawyer: false }
  );
  assert.equal(failGate3.success, false);

  // Positive: Gate 3 complete
  const passGate3 = step6_executeContractAndGate3(
    step5.lead,
    { executedPrice: 3100000, contractDate: '2026-10-15', lawyerName: 'أ. سامح' },
    {
      originalDocumentsInspectedByLawyer: true,
      contractDraftedByCompanyLawyer: true,
      paymentMethodVerified: true,
      commissionAgreementSigned: true
    }
  );
  assert.equal(passGate3.success, true);
  assert.equal(passGate3.lead.status, 'closed');
  assert.equal(passGate3.lead.executedPrice, 3100000);
  assert.equal(passGate3.task9.handoffNumber, 9);
  assert.equal(passGate3.task9.toDept, 'ops');
});

test('1Line OS Reference Journey - Step 7: Commission Invoice & Strict 5k/1M Incentive UPON COLLECTION ONLY', () => {
  const closedLead = {
    id: 'lead-closed-test',
    name: 'عميل صفقة مغلقة',
    status: 'closed',
    executedPrice: 4000000 // 4 Million EGP
  };

  // Case A: Uncollected (collectedAmount = 0) -> Incentive MUST BE ZERO
  const uncollected = step7_executeCollectionAndAfterSales(closedLead, {
    executedPrice: 4000000,
    buyerCommissionRate: 0.025,
    collectedAmount: 0
  });
  assert.equal(uncollected.success, true);
  assert.equal(uncollected.finances.totalCommission, 100000); // 2.5% of 4M = 100,000
  assert.equal(uncollected.agentIncentivePayable, 0, 'Sales incentive must be strictly 0 if uncollected');
  assert.equal(uncollected.collectionRecord.isFullyCollected, false);

  // Case B: Partial Collection (50,000 EGP collected)
  const partialCol = step7_executeCollectionAndAfterSales(closedLead, {
    executedPrice: 4000000,
    buyerCommissionRate: 0.025,
    collectedAmount: 50000,
    receiptNumber: 'REC-PARTIAL-01'
  });
  assert.equal(partialCol.agentIncentivePayable, Math.round((50000 / 1000000) * 5000)); // 250 EGP
  assert.equal(partialCol.invoice.status, 'partially_paid');

  // Case C: Full Collection (100,000 EGP collected)
  const fullCol = step7_executeCollectionAndAfterSales(closedLead, {
    executedPrice: 4000000,
    buyerCommissionRate: 0.025,
    collectedAmount: 100000,
    receiptNumber: 'REC-FULL-01'
  });
  assert.equal(fullCol.agentIncentivePayable, 500); // (100k / 1M) * 5000 = 500 EGP
  assert.equal(fullCol.collectionRecord.isFullyCollected, true);
  assert.equal(fullCol.task10.handoffNumber, 10);
  assert.equal(fullCol.task10.toDept, 'client');
  assert.equal(fullCol.lead.lifecycleStatus, 'after_sales');
});

test('1Line OS Reference Journey - Complete End-to-End Simulation Runner and Audit Trail', () => {
  const simulationResult = runReferenceCustomerJourneySimulation({
    clientName: 'د. محمود الباز (تجربة مرجعية)',
    source: 'founder_content',
    budgetMin: 3500000,
    budgetMax: 4000000,
    offeredPrice: 3800000,
    executedPrice: 3800000,
    collectedAmount: 95000 // 2.5% of 3.8M = 95,000 EGP
  });

  assert.equal(simulationResult.success, true);
  assert.equal(simulationResult.tasks.length, 7, 'All 7 departmental handoff tasks must be generated');
  assert.equal(simulationResult.logs.length, 7, 'Audit logs must capture all 7 stages');
  assert.equal(simulationResult.summary.executedPrice, 3800000);
  assert.equal(simulationResult.summary.totalCommission, 95000);
  assert.equal(simulationResult.summary.collectedAmount, 95000);
  assert.equal(simulationResult.summary.agentIncentive, Math.round((95000 / 1000000) * 5000)); // 475 EGP

  // Journey Audit Helper
  const audit = auditLeadJourney(simulationResult.lead);
  assert.equal(audit.currentStage, 'closed');
  assert.equal(audit.gatesStatus.consentLaw151, true);
  assert.equal(audit.gatesStatus.buyerProfileComplete, true);
  assert.equal(audit.gatesStatus.gate2ChecklistPassed, true);
  assert.equal(audit.gatesStatus.gate3ChecklistPassed, true);
  assert.equal(audit.gatesStatus.commissionCollected, true);
  assert.equal(audit.progressPercent, 100);
  assert.equal(audit.isCompliant, true);
});
