import { test } from 'node:test';
import assert from 'node:assert/strict';
import { marketingMonthly, lastMonths, monthKey } from '../../src/utils/marketingMonthly.js';

const NOW = new Date(2026, 10, 22, 12).getTime(); // 22 Nov 2026, local
const at = (y, m, d) => new Date(y, m, d, 12).toISOString();

test('the last months, newest first', () => {
  assert.deepEqual(lastMonths(3, NOW), ['2026-11', '2026-10', '2026-09']);
  assert.equal(monthKey(new Date(2026, 0, 5).getTime()), '2026-01');
});

test('a month: spend from Meta + other channels, the cohort followed through the funnel, costs over ad clients', () => {
  const leads = [
    { id: 1, createdAt: at(2026, 10, 2), source: 'facebook ads', status: 'closed' },                      // ad buyer, deal
    { id: 2, createdAt: at(2026, 10, 3), source: 'facebook ads', status: 'site_visit' },                  // ad buyer, visit
    { id: 3, createdAt: at(2026, 10, 4), source: 'facebook ads', status: 'new', type: 'seller' },          // ad owner
    { id: 4, createdAt: at(2026, 10, 5), source: 'website', status: 'contacted' },                        // organic, qualified
    { id: 5, createdAt: at(2026, 10, 6), source: 'facebook ads', status: 'lost', stageHistory: [{ s: 'new', at: at(2026, 10, 6) }, { s: 'contacted', at: at(2026, 10, 7) }] }, // qualified then lost
    { id: 6, createdAt: at(2026, 9, 6), source: 'website', status: 'new' },                               // October
    { id: 7, createdAt: at(2026, 10, 6), source: 'facebook ads', isArchived: true },                      // archived: out
  ];
  const { rows, totals } = marketingMonthly(leads, { '2026-11': { meta: 4000, other: 1000 } }, { months: 2, now: NOW });
  const nov = rows[0];
  assert.equal(nov.month, '2026-11');
  assert.equal(nov.spend, 5000);
  assert.equal(nov.leads, 5);
  assert.equal(nov.ads, 4);
  assert.equal(nov.adOwners, 1); assert.equal(nov.adBuyers, 3);
  assert.equal(nov.qualified, 4, 'closed, visit, organic qualified and the one qualified before being lost');
  assert.equal(nov.adQualified, 3);
  assert.equal(nov.adVisits, 2);
  assert.equal(nov.adDeals, 1);
  assert.equal(nov.costPerLead, 1250);
  assert.equal(nov.costPerQualified, 1667);
  assert.equal(nov.costPerDeal, 5000);
  assert.equal(nov.qualifiedPct, 80);
  assert.equal(rows[1].leads, 1);
  assert.equal(rows[1].costPerLead, 0, 'no spend entered: no cost');
  assert.equal(totals.leads, 6);
  assert.equal(totals.spend, 5000);
});
