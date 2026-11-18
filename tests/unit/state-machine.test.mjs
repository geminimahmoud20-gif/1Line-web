// tests/unit/state-machine.test.mjs
// Unit tests for 1Line OS State Machine and Stage Gate Deliverables
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  validateStageTransition,
  STAGE_DEFINITIONS,
  HIGH_VALUE_DEAL_THRESHOLD
} from '../../src/services/stateMachineEngine.js';

test('state-machine: moving to "qualified" blocks if 5 qualification questions are missing', () => {
  const bareLead = { id: 'l-1', status: 'new', name: 'عميل' };
  const res = validateStageTransition(bareLead, 'qualified');
  assert.equal(res.allowed, false);
  assert.equal(res.deliverableKey, 'buyer_profile');
  assert.ok(res.missingDeliverable.includes('ملف المشتري المؤهل غير مكتمل'));
});

test('state-machine: moving to "qualified" succeeds when buyer profile is complete', () => {
  const qualifiedLead = {
    id: 'l-1',
    status: 'new',
    name: 'عميل',
    buyerProfile: {
      budgetMin: 2000000,
      budgetMax: 2500000,
      paymentMethod: 'cash',
      targetSectors: ['شرق'],
      purpose: 'residence'
    }
  };
  const res = validateStageTransition(qualifiedLead, 'qualified');
  assert.equal(res.allowed, true);
  assert.equal(res.reason, null);
  assert.ok(res.nextTask !== null, 'should generate handoff task #3 (Sales -> Inventory)');
});

test('state-machine: moving to "matched" requires 3 nominations OR an open SearchRequest', () => {
  const leadNoMatches = { id: 'l-2', status: 'qualified', nominations: [] };
  const res1 = validateStageTransition(leadNoMatches, 'matched');
  assert.equal(res1.allowed, false);
  assert.equal(res1.deliverableKey, 'nominations_or_search_request');

  // Case A: 3 Nominations present
  const leadWith3Noms = {
    id: 'l-2',
    status: 'qualified',
    nominations: [{ id: 'n1' }, { id: 'n2' }, { id: 'n3' }]
  };
  const res2 = validateStageTransition(leadWith3Noms, 'matched');
  assert.equal(res2.allowed, true);

  // Case B: No 3 noms, but open SearchRequest exists
  const leadWithSearchReq = {
    id: 'l-2',
    status: 'qualified',
    nominations: [{ id: 'n1' }],
    hasOpenSearchRequest: true
  };
  const res3 = validateStageTransition(leadWithSearchReq, 'matched');
  assert.equal(res3.allowed, true);
});

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
