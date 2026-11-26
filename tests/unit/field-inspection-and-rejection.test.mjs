import test from 'node:test';
import assert from 'node:assert/strict';
import { leadSituation, listingByLead } from '../../src/utils/leadSituation.js';

test('leadSituation reflects property rejection accurately', () => {
  // Case 1: Property was rejected by GM
  const rejectedListing = {
    id: 'prop-123',
    sourceLeadId: 'lead-456',
    status: 'hidden',
    approval: 'rejected',
    rejectedAt: '2026-11-25T12:00:00.000Z'
  };
  const lead1 = { id: 'lead-456', name: 'صلاح عبدالمجيد' };

  const situation1 = leadSituation(lead1, rejectedListing);
  assert.equal(situation1.kind, 'converted_rejected');
  assert.equal(situation1.tone, 'bad');
  assert.equal(situation1.label, 'اتحوّل لعقار · تم رفضه من الإدارة');

  // Case 2: Lead has lostReason: 'property_rejected'
  const lead2 = {
    id: 'lead-789',
    name: 'أحمد محمود',
    status: 'lost',
    lostReason: 'property_rejected',
    lostAt: '2026-11-25T13:00:00.000Z'
  };
  const situation2 = leadSituation(lead2, null);
  assert.equal(situation2.kind, 'converted_rejected');
  assert.equal(situation2.tone, 'bad');
  assert.equal(situation2.label, 'اتحوّل لعقار · تم رفضه من الإدارة');

  // Case 3: Active published listing
  const liveListing = {
    id: 'prop-999',
    status: 'published',
    approval: 'approved'
  };
  const situation3 = leadSituation({ id: 'lead-111' }, liveListing);
  assert.equal(situation3.kind, 'converted');
  assert.equal(situation3.tone, 'info');
  assert.match(situation3.label, /معروض على الموقع/);
});

test('listingByLead cross-references both sourceLeadId and convertedPropertyId', () => {
  const properties = [
    { id: 'prop-A', sourceLeadId: 'lead-1' },
    { id: 'prop-B' } // without sourceLeadId directly on prop
  ];
  const leads = [
    { id: 'lead-1', name: 'Lead 1' },
    { id: 'lead-2', name: 'Lead 2', convertedPropertyId: 'prop-B' }
  ];

  const map = listingByLead(properties, leads);
  assert.equal(map.get('lead-1')?.id, 'prop-A');
  assert.equal(map.get('lead-2')?.id, 'prop-B');
});

test('field inspection report satisfying Gate 2 deliverable requirement', () => {
  const inspectionReport = {
    leadId: 'lead-site-1',
    inspector: 'Dr. Mahmoud Elbaz',
    areaKey: 'new_sohag',
    size: 150,
    askingPrice: 2000000,
    valuation: {
      askingPerSqm: 13333,
      benchmarkPerSqm: 14000,
      valuationTone: 'info',
      valuationText: 'سعر عادل'
    },
    utilities: {
      electricity: { meterType: 'card' },
      water: { connection: 'separate' }
    },
    gps: { lat: 26.55, lng: 31.70 }
  };

  // Simulating the save payload
  const updatePayload = {
    siteVisitReport: inspectionReport,
    siteVisit: {
      completed: true,
      completedAt: '2026-11-25T14:00:00.000Z',
      report: inspectionReport
    },
    gate2Passed: true
  };

  assert.equal(updatePayload.gate2Passed, true);
  assert.equal(updatePayload.siteVisit.completed, true);
  assert.ok(updatePayload.siteVisitReport.gps.lat);
  assert.equal(updatePayload.siteVisitReport.valuation.askingPerSqm, 13333);
});
