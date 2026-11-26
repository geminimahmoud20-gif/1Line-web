// tests/unit/state-machine.test.mjs
// Unit tests for 1Line OS State Machine and Stage Gate Deliverables
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  validateStageTransition,
  STAGE_DEFINITIONS,
  HIGH_VALUE_DEAL_THRESHOLD
} from '../../src/services/stateMachineEngine.js';

test('state-machine: moving to "negotiating" requires completed site visit report', () => {
  const leadNoVisit = { id: 'l-3', status: 'site_visit' };
  const res1 = validateStageTransition(leadNoVisit, 'negotiating');
  assert.equal(res1.allowed, false);
  assert.equal(res1.deliverableKey, 'site_visit_report');

  const leadWithVisit = {
    id: 'l-3',
    status: 'site_visit',
    siteVisitReport: { date: '2026-10-10', clientFeedback: 'مهتم بالوحدة', propertyId: 'p-1' }
  };
  const res2 = validateStageTransition(leadWithVisit, 'negotiating');
  assert.equal(res2.allowed, true);
});

test('state-machine: high-value deals (>= 5M) mandate Founder escalation and sign-off', () => {
  const highValueLead = {
    id: 'l-4',
    status: 'site_visit',
    expectedValue: 8_000_000, // 8 Million Cairo Unit
    siteVisitReport: { completed: true }
  };

  // Without Founder approval -> BLOCKED
  const res1 = validateStageTransition(highValueLead, 'negotiating', { userRole: 'sales_agent' });
  assert.equal(res1.allowed, false);
  assert.equal(res1.deliverableKey, 'founder_high_value_approval');

  // With Founder approval -> ALLOWED
  const res2 = validateStageTransition(highValueLead, 'negotiating', { isFounderApproved: true });
  assert.equal(res2.allowed, true);

  // If Founder themselves moves it -> ALLOWED
  const res3 = validateStageTransition(highValueLead, 'negotiating', { userRole: 'super_admin' });
  assert.equal(res3.allowed, true);
});

test('state-machine: moving to "closing" mandates Gate 2 checklist and written offer', () => {
  const lead = { id: 'l-5', status: 'negotiating' };
  const res1 = validateStageTransition(lead, 'closing');
  assert.equal(res1.allowed, false);
  assert.equal(res1.deliverableKey, 'gate2_and_written_offer');

  const readyLead = {
    id: 'l-5',
    status: 'negotiating',
    gate2Passed: true,
    writtenOffer: { amount: 2400000, date: '2026-10-12' }
  };
  const res2 = validateStageTransition(readyLead, 'closing');
  assert.equal(res2.allowed, true);
});

test('state-machine: moving to "closed" mandates Gate 3 signed checklist and executed price', () => {
  const lead = { id: 'l-6', status: 'closing' };
  const res1 = validateStageTransition(lead, 'closed');
  assert.equal(res1.allowed, false);
  assert.equal(res1.deliverableKey, 'gate3_and_executed_price');

  const wonLead = {
    id: 'l-6',
    status: 'closing',
    gate3Passed: true,
    executedPrice: 2400000
  };
  const res2 = validateStageTransition(wonLead, 'closed');
  assert.equal(res2.allowed, true);
});

test('state-machine: moving to "lost" mandates a valid lostReason', () => {
  const lead = { id: 'l-7', status: 'negotiating' };
  const res1 = validateStageTransition(lead, 'lost');
  assert.equal(res1.allowed, false);
  assert.equal(res1.deliverableKey, 'lost_reason');

  const res2 = validateStageTransition(lead, 'lost', { lostReason: 'price' });
  assert.equal(res2.allowed, true);
});

test('state-machine: seller pipeline validates property facts and allows qualification without buyer profile', () => {
  const bareSellerLead = {
    id: 's-1',
    status: 'new',
    type: 'seller',
    name: 'مالك عقار'
  };
  const res1 = validateStageTransition(bareSellerLead, 'qualified');
  assert.equal(res1.allowed, false);
  assert.equal(res1.deliverableKey, 'seller_property_profile');
  assert.ok(res1.missingDeliverable.includes('ملف عقار المالك غير مكتمل'));

  const validSellerLead = {
    id: 's-2',
    status: 'new',
    type: 'seller',
    name: 'عبد الحكيم عامر',
    propertyType: 'apartment',
    area: 'city',
    details: {
      askingPrice: 3500000,
      size: 160
    }
  };
  const res2 = validateStageTransition(validSellerLead, 'qualified');
  assert.equal(res2.allowed, true);
  assert.equal(res2.reason, null);
  assert.ok(res2.nextTask !== null, 'should generate handoff task for inventory');
});

test('state-machine: seller high-value deals (>= 5M) mandate Founder escalation and sign-off', () => {
  const highValueSeller = {
    id: 's-3',
    status: 'site_visit',
    type: 'seller',
    details: {
      askingPrice: 8_000_000,
      propertyType: 'villa'
    }
  };
  const res1 = validateStageTransition(highValueSeller, 'negotiating', { userRole: 'sales_agent' });
  assert.equal(res1.allowed, false);
  assert.equal(res1.deliverableKey, 'founder_high_value_approval');

  const res2 = validateStageTransition(highValueSeller, 'negotiating', { isFounderApproved: true });
  assert.equal(res2.allowed, true);
});


test('state-machine: a valuation/seller_instant lead (no askingPrice yet) is validated as a seller, not a buyer', () => {
  // Same classification crmLeadViews.isSellerLead already uses everywhere else in the CRM (Kanban, filters,
  // badges) — stateMachineEngine used to keep its own narrower copy that missed these two types.
  const freshValuationLead = {
    id: 'v-1',
    status: 'new',
    type: 'valuation',
    details: { propertyType: 'villa', area: 'new_cairo' }
  };
  // Missing seller property facts (no price/size yet) -> blocked as a seller, not silently allowed as a buyer
  const res1 = validateStageTransition(freshValuationLead, 'qualified');
  assert.equal(res1.allowed, false);
  assert.equal(res1.deliverableKey, 'seller_property_profile');

  const sellerInstantLead = {
    id: 'v-2',
    status: 'new',
    type: 'seller_instant',
    details: { propertyType: 'apartment', area: 'akhmin', askingPrice: 1_200_000, size: 110 }
  };
  const res2 = validateStageTransition(sellerInstantLead, 'qualified');
  assert.equal(res2.allowed, true);
});

test('state-machine: a broker lead follows the seller pipeline even with no other seller signal', () => {
  const freshBrokerLead = { id: 'b-1', status: 'new', type: 'broker' };
  // Blocked on the seller property-profile deliverable, not routed through buyer qualification
  const res = validateStageTransition(freshBrokerLead, 'qualified');
  assert.equal(res.allowed, false);
  assert.equal(res.deliverableKey, 'seller_property_profile');
});
