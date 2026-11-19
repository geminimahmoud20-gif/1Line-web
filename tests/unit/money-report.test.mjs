import test from 'node:test';
import assert from 'node:assert/strict';
import { moneyReport, funnelSteps, MIN_SAMPLE } from '../../src/utils/moneyReport.js';

const NOW = Date.parse('2026-11-19T12:00:00Z');
const hist = (...s) => s.map((x, i) => ({ s: x, at: `2026-11-${String(10 + i).padStart(2, '0')}T10:00:00Z` }));
let n = 0;
const lead = (over = {}) => ({ id: `l${++n}`, phone: `010${String(10000000 + n)}`, status: 'new', createdAt: '2026-11-01T10:00:00Z', utmCampaign: 'sohag-nov', utmSource: 'facebook', ...over });
const won = (over = {}) => lead({ status: 'closed', stageHistory: hist('new', 'contacted', 'site_visit', 'closed'), dealValue: 3000000, closedAt: '2026-11-15T10:00:00Z', ...over });

test('the funnel shows how many reach each step and which step loses the largest share', () => {
  const leads = [
    ...Array.from({ length: 10 }, () => lead()),
    ...Array.from({ length: 6 }, () => lead({ status: 'contacted', stageHistory: hist('new', 'contacted') })),
    ...Array.from({ length: 4 }, () => lead({ status: 'site_visit', stageHistory: hist('new', 'contacted', 'site_visit') }))
  ];
  const f = funnelSteps(leads);
  assert.equal(f.total, 20);
  assert.deepEqual(f.steps.slice(0, 3).map((s) => s.reached), [20, 10, 4]);
  assert.equal(f.steps[1].ofPrevious, 50);
  // contacted → viewing keeps 4 of 10 (40%), the lowest rate among the steps with enough clients behind them
  assert.deepEqual(f.weakest, { from: 'contacted', to: 'site_visit', rate: 40, lost: 6, of: 10 });
});

test('too few clients means no verdict on the weakest step', () => {
  const f = funnelSteps(Array.from({ length: MIN_SAMPLE - 1 }, () => lead()));
  assert.equal(f.weakest, null);
});

test('archived clients are not part of the funnel', () => {
  assert.equal(funnelSteps([lead(), lead({ isArchived: true })]).total, 1);
});

test('ads economics: what a lead, a viewing and a deal cost, the commission won, and the profit', () => {
  const leads = [
    won(), won({ dealValue: 2000000 }),
    lead({ status: 'site_visit', stageHistory: hist('new', 'contacted', 'site_visit') }),
    lead(), lead()
  ];
  const r = moneyReport(leads, { spend: { 'sohag-nov': 50000 }, now: NOW });
  assert.equal(r.ads.hasSpend, true);
  assert.equal(r.ads.leads, 5);
  assert.equal(r.ads.visits, 3);
  assert.equal(r.ads.closed, 2);
  assert.equal(r.ads.costPerLead, 10000);
  assert.equal(r.ads.costPerDeal, 25000);
  // 2.5% of 3,000,000 + 2.5% of 2,000,000 = 125,000 won; minus 50,000 of ads
  assert.equal(r.ads.wonCommission, 125000);
  assert.equal(r.ads.profit, 75000);
  assert.equal(r.ads.returnPerEgp, 2.5);
  assert.equal(r.campaigns.best[0].campaign, 'sohag-nov');
});

test('with no spend entered there are no costs and no profit, only counts', () => {
  const r = moneyReport([won(), lead()], { now: NOW });
  assert.equal(r.ads.hasSpend, false);
  assert.deepEqual([r.ads.costPerLead, r.ads.costPerDeal, r.ads.profit], [0, 0, 0]);
  assert.equal(r.ads.closed, 1);
  assert.equal(r.campaigns.withoutSpend, 1);
});

test('a campaign that spent money and brought nobody to a viewing is flagged', () => {
  const leads = [lead({ utmCampaign: 'dead-ad' }), lead({ utmCampaign: 'dead-ad' }), lead({ utmCampaign: 'dead-ad' }), won()];
  const r = moneyReport(leads, { spend: { 'dead-ad': 20000, 'sohag-nov': 10000 }, now: NOW });
  assert.deepEqual(r.campaigns.bleeding.map((c) => c.campaign), ['dead-ad']);
  assert.equal(r.campaigns.bleeding[0].spend, 20000);
});

test('the forecast: open pipeline weighted by stage, this month\'s wins, and deals with no value', () => {
  const leads = [
    won({ closedAt: '2026-11-10T10:00:00Z' }),
    lead({ status: 'negotiating', dealValue: 4000000 }),
    lead({ status: 'site_visit' })
  ];
  const r = moneyReport(leads, { now: NOW });
  assert.equal(r.forecast.wonThisMonth, 75000);
  assert.equal(r.forecast.gross, 100000);
  assert.equal(r.forecast.weighted, 50000);
  assert.equal(r.forecast.missingValue, 1);
});
