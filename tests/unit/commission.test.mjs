import test from 'node:test';
import assert from 'node:assert/strict';
import { leadCommission, commissionForecast, dealValue, commissionPct, defaultPctFor, legalFee, BUYER_COMMISSION_PCT, SELLER_COMMISSION_PCT } from '../../src/utils/commission.js';

test('deal value: typed value, else asking price, else budget', () => {
  assert.equal(dealValue({ dealValue: '3,000,000', budget: 1 }), 3000000);
  assert.equal(dealValue({ details: { askingPrice: 2500000 }, budget: '1,000,000' }), 2500000);
  assert.equal(dealValue({ budget: '1,500,000' }), 1500000);
  assert.equal(dealValue({}), 0);
});

test('rate: the lead own rate when sane, else the side rate (buyer 1.5%, owner 2.5%)', () => {
  assert.equal(BUYER_COMMISSION_PCT, 1.5);
  assert.equal(SELLER_COMMISSION_PCT, 2.5);
  assert.equal(commissionPct({ commissionPct: 2 }), 2);
  assert.equal(commissionPct({ commissionPct: 0 }), 1.5);
  assert.equal(commissionPct({ commissionPct: 50, type: 'seller' }), 2.5);
  assert.equal(defaultPctFor({ type: 'seller' }), 2.5);
  assert.equal(defaultPctFor({ type: 'buyer' }), 1.5);
  assert.equal(defaultPctFor({}), 1.5); // not known yet: counted as a buyer
});

test('legal review: 500 EGP per million, from each side', () => {
  assert.equal(legalFee(1_000_000), 500);
  assert.equal(legalFee(3_500_000), 1750);
  assert.equal(legalFee(0), 0);
  assert.equal(legalFee(-5), 0);
});

test('per lead: commission + legal review if it closes, weighted by stage', () => {
  assert.deepEqual(leadCommission({ budget: 2000000, status: 'negotiating' }), { value: 2000000, pct: 1.5, commission: 30000, legal: 1000, gross: 31000, probability: 0.5, weighted: 15500 });
  assert.deepEqual(leadCommission({ type: 'seller', details: { askingPrice: 4000000 }, status: 'closing' }), { value: 4000000, pct: 2.5, commission: 100000, legal: 2000, gross: 102000, probability: 0.8, weighted: 81600 });
  assert.equal(leadCommission({ budget: 2000000, status: 'lost' }).weighted, 0);
});

test('both sides of one 2M deal: buyer 30k + owner 50k commission, 1k legal review from each', () => {
  const buyer = leadCommission({ dealValue: 2000000, status: 'closed' });
  const owner = leadCommission({ type: 'seller', dealValue: 2000000, status: 'closed' });
  assert.equal(buyer.gross + owner.gross, 82000);
});

test('forecast: open pipeline, near-term part, won this month, leads without a value', () => {
  const now = Date.parse('2026-10-16T10:00:00Z');
  const leads = [
    { budget: 2000000, status: 'new' },          // 30k + 1k legal = 31k gross, 1,550 weighted
    { budget: 4000000, status: 'closing', commissionPct: 2 }, // 80k + 2k = 82k gross, 65,600 weighted
    { status: 'contacted' },                     // no value
    { budget: 1000000, status: 'closed', closedAt: '2026-10-02T09:00:00Z' }, // 15k + 500 this month
    { budget: 1000000, status: 'closed', closedAt: '2026-09-30T09:00:00Z' }, // last month
    { budget: 9000000, status: 'closing', isArchived: true }
  ];
  assert.deepEqual(commissionForecast(leads, { now }), { gross: 113000, weighted: 67150, late: 82000, wonThisMonth: 15500, wonCount: 1, missingValue: 1, valued: 2 });
});

import { closedMs, commissionForecast as forecastOf } from '../../src/utils/commission.js';
test('a won deal counts in the month it was closed, never in the month of a later edit', () => {
  const now = Date.parse('2026-11-18T12:00:00Z');
  const old = { status: 'closed', budget: 2000000, closedAt: '2026-08-02T10:00:00Z', updatedAt: '2026-11-17T10:00:00Z' };
  const fresh = { status: 'closed', budget: 2000000, stageHistory: [{ s: 'new', at: '2026-10-01T00:00:00Z' }, { s: 'closed', at: '2026-11-05T10:00:00Z' }] };
  const undated = { status: 'closed', budget: 2000000, updatedAt: '2026-11-17T10:00:00Z' };
  assert.equal(closedMs(undated), 0);
  const f = forecastOf([old, fresh, undated], { now });
  assert.equal(f.wonCount, 1);
  assert.equal(f.wonThisMonth, 31000);
  assert.equal(forecastOf([{ status: 'new', budget: 1000000 }, { status: 'new' }], { now }).valued, 1);
});
