import test from 'node:test';
import assert from 'node:assert/strict';
import { campaignReport, campaignTotals } from '../../src/utils/campaignReport.js';

const NOW = Date.parse('2026-11-12T12:00:00Z');
const lead = (campaign, status, ad = '', daysAgo = 1) => ({
  status,
  createdAt: new Date(NOW - daysAgo * 86400000).toISOString(),
  marketingAttribution: { source: 'facebook', campaign, content: ad }
});

test('counts leads, contacts, visits and closings per campaign; ignores leads without a campaign', () => {
  const leads = [
    lead('buyers', 'new'), lead('buyers', 'contacted'), lead('buyers', 'site_visit'), lead('buyers', 'closed'), lead('buyers', 'lost'),
    lead('owners', 'new'), { status: 'new', createdAt: new Date(NOW).toISOString() }
  ];
  const rows = campaignReport(leads, { now: NOW });
  const b = rows.find((r) => r.campaign === 'buyers');
  assert.deepEqual([b.leads, b.contacted, b.visits, b.closed, b.lost], [5, 3, 2, 1, 1]);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].campaign, 'buyers');
});

test('period filter drops older leads', () => {
  const leads = [lead('a', 'new', '', 2), lead('a', 'new', '', 20)];
  assert.equal(campaignReport(leads, { now: NOW, days: 7 })[0].leads, 1);
  assert.equal(campaignReport(leads, { now: NOW })[0].leads, 2);
});

test('by ad splits a campaign and prices each ad from its own spend', () => {
  const leads = [lead('buyers', 'site_visit', 'v10'), lead('buyers', 'new', 'v10'), lead('buyers', 'new', 'v11')];
  const rows = campaignReport(leads, { now: NOW, by: 'ad', spend: { 'buyers::v10': 600 } });
  const v10 = rows.find((r) => r.ad === 'v10');
  assert.equal(v10.leads, 2);
  assert.equal(v10.costPerLead, 300);
  assert.equal(v10.costPerVisit, 600);
  assert.equal(rows.find((r) => r.ad === 'v11').costPerLead, 0);
});

test('totals add up and price the whole spend', () => {
  const rows = campaignReport([lead('a', 'site_visit'), lead('a', 'new'), lead('b', 'new')], { now: NOW, spend: { a: 200, b: 100 } });
  const t = campaignTotals(rows);
  assert.equal(t.leads, 3);
  assert.equal(t.spend, 300);
  assert.equal(t.costPerLead, 100);
  assert.equal(t.costPerVisit, 300);
});

test('a client lost after a visit still counts as a visit, and the days to the visit are averaged', () => {
  const day = 86400000;
  const made = (id, history, status) => ({ id, status, createdAt: new Date(NOW - 10 * day).toISOString(), marketingAttribution: { source: 'facebook', campaign: 'buyers' }, stageHistory: history.map(([s, d]) => ({ s, at: new Date(NOW - d * day).toISOString() })) });
  const leads = [
    made(1, [['new', 10], ['site_visit', 6], ['lost', 2]], 'lost'),
    made(2, [['new', 10], ['site_visit', 8]], 'site_visit'),
    made(3, [['new', 10], ['lost', 9]], 'lost')
  ];
  const row = campaignReport(leads, { now: NOW })[0];
  assert.equal(row.leads, 3);
  assert.equal(row.visits, 2);
  assert.equal(row.lost, 2);
  assert.equal(row.avgDaysToVisit, 3);
});
