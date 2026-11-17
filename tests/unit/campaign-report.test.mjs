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

test('the most common reason clients of a campaign were lost is reported', () => {
  const lost = (reason) => ({ ...lead('buyers', 'lost'), lostReason: reason });
  const rows = campaignReport([lost('price'), lost('price'), lost('no_response'), lead('buyers', 'new'), lead('owners', 'new')], { now: NOW });
  const b = rows.find((r) => r.campaign === 'buyers');
  assert.deepEqual(b.topLostReason, { id: 'price', count: 2 });
  assert.equal(rows.find((r) => r.campaign === 'owners').topLostReason, null);
});

import { typeSummary } from '../../src/utils/campaignReport.js';

test('rows are added up per kind of ad, cheapest client first is for the reader to see', () => {
  const row = (campaign, leads, spend, visits = 0, closed = 0) => ({ campaign, leads, spend, visits, closed, contacted: 0, wonCommission: 0, expectedCommission: 0 });
  const s = typeSummary([row('buyers-a', 10, 1000, 3, 1), row('buyers-b', 5, 500), row('owners-x', 2, 400), row('weird', 1, 0), row('unit-v', 0, 0)]);
  assert.deepEqual(s.map((g) => g.type), ['buyers', 'owners', 'other']); // unit-v has nothing: left out
  assert.equal(s[0].leads, 15);
  assert.equal(s[0].campaigns, 2);
  assert.equal(s[0].costPerLead, 100);
  assert.equal(s[1].costPerLead, 200);
  assert.equal(s[0].label, 'مشترين (إعلان عام)');
});

test('WhatsApp and call taps from an ad are counted per campaign, even with no lead', () => {
  const now = Date.parse('2026-11-14T12:00:00Z');
  const taps = [
    { campaign: 'buyers-a', content: 'v1', at: now - 86400000 },
    { campaign: 'buyers-a', content: 'v2', at: now - 2 * 86400000 },
    { campaign: 'owners-x', content: '', at: now - 40 * 86400000 },
    { campaign: '', at: now }
  ];
  const lead = { id: 'L', status: 'new', createdAt: new Date(now - 86400000).toISOString(), marketingAttribution: { campaign: 'buyers-a', source: 'facebook' } };
  const rows = campaignReport([lead], { now, taps });
  const a = rows.find((r) => r.campaign === 'buyers-a');
  assert.equal(a.contacts, 2);
  assert.equal(a.leads, 1);
  assert.equal(rows.find((r) => r.campaign === 'owners-x').leads, 0); // a row of its own
  assert.equal(rows.find((r) => r.campaign === 'owners-x').contacts, 1);
  assert.equal(campaignTotals(rows).contacts, 3);
  // the period filter applies to taps too, and by ad they split on utm_content
  assert.equal(campaignReport([lead], { now, taps, days: 7 }).find((r) => r.campaign === 'owners-x'), undefined);
  const byAd = campaignReport([lead], { now, taps, by: 'ad' });
  assert.deepEqual(byAd.filter((r) => r.campaign === 'buyers-a').map((r) => [r.ad, r.contacts]).sort(), [['v1', 1], ['v2', 1], ['—', 0]].sort());
});

test('taps already linked to a lead, or dismissed, are not counted again next to the leads', () => {
  const now = Date.parse('2026-11-16T12:00:00Z');
  const t = (status) => ({ campaign: 'owners-x', content: 'a', source: 'facebook', at: now - 3600e3, status });
  const rows = campaignReport([], { now, taps: [t('open'), t('open'), t('linked'), t('dismissed')] });
  assert.equal(rows.find((r) => r.campaign === 'owners-x').contacts, 2);
  // a tap without a status (older data) still counts
  assert.equal(campaignReport([], { now, taps: [{ campaign: 'owners-x', at: now }] }).find((r) => r.campaign === 'owners-x').contacts, 1);
});

test('one person asking twice in a campaign is one lead, not two', () => {
  const p = (status, extra = {}) => ({ ...lead('owners', status), phone: '+201094590572', ...extra });
  const leads = [
    p('new', { id: 'a', type: 'buyer' }),
    p('site_visit', { id: 'b', type: 'seller', phone: '01094590572' }), // same person, other spelling of the number
    { ...lead('owners', 'new'), id: 'c', phone: '01012345678' }
  ];
  const r = campaignReport(leads, { now: NOW }).find((x) => x.campaign === 'owners');
  assert.equal(r.leads, 2); // two people
  assert.equal(r.requests, 3); // three requests
  assert.equal(r.visits, 1); // the person reached a visit once, not twice
  assert.equal(r.contacted, 1);
});
test('a person is lost only when all their requests are lost; unrelated leads without a phone stay separate', () => {
  const l1 = { ...lead('x', 'lost'), id: '1', phone: '01011112222', lostReason: 'price' };
  const l2 = { ...lead('x', 'new'), id: '2', phone: '01011112222' };
  assert.equal(campaignReport([l1, l2], { now: NOW }).find((r) => r.campaign === 'x').lost, 0);
  assert.equal(campaignReport([l1, { ...l2, status: 'lost' }], { now: NOW }).find((r) => r.campaign === 'x').lost, 1);
  const nophone = [{ ...lead('y', 'new'), id: 'p' }, { ...lead('y', 'new'), id: 'q' }];
  assert.equal(campaignReport(nophone, { now: NOW }).find((r) => r.campaign === 'y').leads, 2);
});
