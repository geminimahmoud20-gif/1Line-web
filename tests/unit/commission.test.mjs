import test from 'node:test';
import assert from 'node:assert/strict';
import { leadCommission, commissionForecast, dealValue, commissionPct, DEFAULT_COMMISSION_PCT } from '../../src/utils/commission.js';

test('deal value: typed value, else asking price, else budget', () => {
  assert.equal(dealValue({ dealValue: '3,000,000', budget: 1 }), 3000000);
  assert.equal(dealValue({ details: { askingPrice: 2500000 }, budget: '1,000,000' }), 2500000);
  assert.equal(dealValue({ budget: '1,500,000' }), 1500000);
  assert.equal(dealValue({}), 0);
});

test('rate: the lead own rate when sane, else the default', () => {
  assert.equal(commissionPct({ commissionPct: 2 }), 2);
  assert.equal(commissionPct({ commissionPct: 0 }), DEFAULT_COMMISSION_PCT);
  assert.equal(commissionPct({ commissionPct: 50 }), DEFAULT_COMMISSION_PCT);
});

test('per lead: gross if it closes and weighted by stage', () => {
  assert.deepEqual(leadCommission({ budget: 2000000, status: 'negotiating' }), { value: 2000000, pct: 2.5, gross: 50000, probability: 0.5, weighted: 25000 });
  assert.equal(leadCommission({ budget: 2000000, status: 'lost' }).weighted, 0);
});

test('forecast: open pipeline, near-term part, won this month, leads without a value', () => {
  const now = Date.parse('2026-10-16T10:00:00Z');
  const leads = [
    { budget: 2000000, status: 'new' },          // 50k gross, 2.5k weighted
    { budget: 4000000, status: 'closing', commissionPct: 2 }, // 80k gross, 64k weighted
    { status: 'contacted' },                     // no value
    { budget: 1000000, status: 'closed', closedAt: '2026-10-02T09:00:00Z' }, // 25k this month
    { budget: 1000000, status: 'closed', closedAt: '2026-09-30T09:00:00Z' }, // last month
    { budget: 9000000, status: 'closing', isArchived: true }
  ];
  assert.deepEqual(commissionForecast(leads, { now }), { gross: 130000, weighted: 66500, late: 80000, wonThisMonth: 25000, wonCount: 1, missingValue: 1 });
});
