import test from 'node:test';
import assert from 'node:assert/strict';
import { adsTotals, adsFindings, campaignHealth, campaignRates } from '../../src/utils/adsInsights.js';
import { performanceFromInsights } from '../../api/_meta-spend-core.js';

const c = (o) => ({ id: o.name, name: o.name, spend: 0, impressions: 0, reach: 0, frequency: 0, linkClicks: 0, leads: 0, messages: 0, results: 0, ...o });

test('insights rows become campaigns with leads and messages counted once', () => {
  const r = performanceFromInsights([
    { campaign_id: '1', campaign_name: 'A', spend: '120.6', impressions: '9000', reach: '5000', frequency: '1.84', inline_link_clicks: '90', account_currency: 'EGP',
      actions: [{ action_type: 'lead', value: '4' }, { action_type: 'onsite_conversion.lead_grouped', value: '4' }, { action_type: 'onsite_conversion.messaging_conversation_started_7d', value: '3' }] },
    { campaign_id: '2', campaign_name: 'B', spend: '40', actions: [{ action_type: 'onsite_conversion.lead_grouped', value: '2' }], account_currency: 'EGP' },
    { campaign_id: '3', campaign_name: 'Free', spend: '0' }
  ]);
  assert.equal(r.currency, 'EGP');
  assert.deepEqual(r.campaigns.map((x) => [x.name, x.spend, x.leads, x.messages, x.results, x.frequency]), [['A', 121, 4, 3, 7, 1.8], ['B', 40, 2, 0, 2, 0]]);
});

test('totals and rates', () => {
  const t = adsTotals([c({ name: 'A', spend: 1000, impressions: 20000, linkClicks: 200, results: 10, leads: 10 }), c({ name: 'B', spend: 500, impressions: 10000, linkClicks: 50, results: 0 })]);
  assert.equal(t.spend, 1500);
  assert.equal(t.results, 10);
  assert.equal(Math.round(t.cpr), 150);
  assert.equal(campaignRates({ spend: 100, impressions: 10000, linkClicks: 100, results: 4 }).ctr, 1);
});

test('findings: money with no result, the cheapest result, weak ads and tired audiences', () => {
  const list = [
    c({ name: 'Good', spend: 1000, impressions: 40000, linkClicks: 800, results: 20, leads: 20 }),
    c({ name: 'Pricey', spend: 1500, impressions: 30000, linkClicks: 600, results: 6, leads: 6 }),
    c({ name: 'Dead', spend: 900, impressions: 5000, linkClicks: 10, results: 0, frequency: 4 }),
    c({ name: 'Tiny', spend: 20 })
  ];
  const f = adsFindings(list);
  const text = f.map((x) => x.text).join('\n').replace(/[\u2066-\u2069]/g, '');
  assert.match(text, /راحت على 1 حملة من غير ولا نتيجة، أكبرها «Dead»/);
  assert.match(text, /أرخص نتيجة من «Good»: 50 ج\.م/);
  assert.match(text, /«Pricey» بتكلّف 250 ج\.م للنتيجة/);
  assert.match(text, /الإعلان مش بيشد الناس.*«Dead»/);
  assert.match(text, /«Dead» ظهرت لنفس الناس 4 مرة/);
  assert.ok(!text.includes('Tiny'));
  assert.equal(f[0].tone, 'warn');
  const t = adsTotals(list);
  assert.equal(campaignHealth(list[0], t), 'good');
  assert.equal(campaignHealth(list[2], t), 'bad');
  assert.equal(campaignHealth(list[3], t), 'ok');
});

test('no results at all is called out, and nothing to say without spend', () => {
  const f = adsFindings([c({ name: 'A', spend: 600, impressions: 20000, linkClicks: 300 })]);
  assert.match(f[0].text, /ما سجلتش ولا نتيجة/);
  assert.deepEqual(adsFindings([]), []);
  assert.deepEqual(adsFindings([c({ name: 'A' })]), []);
});
