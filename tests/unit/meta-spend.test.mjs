import test from 'node:test';
import assert from 'node:assert/strict';
import { fetchAdInsights, spendFromInsights, applyPull, GRAPH } from '../../api/_meta-spend-core.js';

const res = (status, body) => ({ ok: status >= 200 && status < 300, status, json: async () => body });

test('insights are fetched page by page with the token in a header, not in the URL', async () => {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url, auth: init.headers.authorization });
    return calls.length === 1
      ? res(200, { data: [{ campaign_name: 'A', spend: '10' }], paging: { next: `${GRAPH}/act_1/insights?after=2` } })
      : res(200, { data: [{ campaign_name: 'B', spend: '5' }] });
  };
  const rows = await fetchAdInsights({ accountId: 'act_123', token: 'T', fetchImpl });
  assert.equal(rows.length, 2);
  assert.match(calls[0].url, /\/act_123\/insights\?/);
  assert.match(calls[0].url, /level=ad/);
  assert.ok(!calls[0].url.includes('T&') && !calls[0].url.includes('access_token'));
  assert.equal(calls[0].auth, 'Bearer T');
});

test('a missing token or account, a rejected token and other errors have their own codes', async () => {
  await assert.rejects(fetchAdInsights({ accountId: '', token: 'T' }), { code: 'not-configured' });
  await assert.rejects(fetchAdInsights({ accountId: '1', token: 'T', fetchImpl: async () => res(400, { error: { code: 190, message: 'expired' } }) }), { code: 'bad-token' });
  await assert.rejects(fetchAdInsights({ accountId: '1', token: 'T', fetchImpl: async () => res(500, { error: { message: 'boom' } }) }), { code: 'meta-error' });
});

test('spend is summed per campaign and per ad under the link slugs; Arabic-only names are reported, not matched', () => {
  const pull = spendFromInsights([
    { campaign_name: 'Sohag Buyers', ad_name: 'Video 01', spend: '120.4', account_currency: 'EGP' },
    { campaign_name: 'Sohag Buyers', ad_name: 'Video 02', spend: '80.2', account_currency: 'EGP' },
    { campaign_name: 'حملة سوهاج', ad_name: 'x', spend: '50', account_currency: 'EGP' },
    { campaign_name: 'Free', spend: '0', account_currency: 'EGP' }
  ]);
  assert.deepEqual(pull.campaigns, { 'sohag-buyers': 201 });
  assert.deepEqual(pull.ads, { 'sohag-buyers::video-01': 120, 'sohag-buyers::video-02': 80 });
  assert.equal(pull.currency, 'EGP');
  assert.deepEqual(pull.skipped, ['حملة سوهاج']);
  assert.equal(pull.names['sohag-buyers'], 'Sohag Buyers');
  assert.equal(spendFromInsights([{ campaign_name: 'a', spend: '1', account_currency: 'USD' }, { campaign_name: 'b', spend: '1', account_currency: 'EGP' }]).currency, 'MIXED');
});

test('only campaigns and ads the report knows are saved; the rest are listed as unmatched', () => {
  const pull = { campaigns: { 'sohag-buyers': 201, 'other-camp': 40 }, ads: { 'sohag-buyers::video-01': 120, 'sohag-buyers::video-09': 9 }, names: { 'other-camp': 'Other Camp' } };
  const r = applyPull(pull, { campaignKeys: ['sohag-buyers'], adKeys: ['sohag-buyers::video-01'] });
  assert.deepEqual(r.amounts, { 'sohag-buyers': 201, 'sohag-buyers::video-01': 120 });
  assert.equal(r.matched, 1);
  assert.deepEqual(r.unmatched, [{ slug: 'other-camp', name: 'Other Camp', spend: 40 }]);
});

test('campaigns are kept by Meta id, so Arabic names can be paired by hand and their spend goes to the paired campaign', () => {
  const pull = spendFromInsights([
    { campaign_id: '11', campaign_name: 'اعلان برج الشرق', ad_name: 'a', spend: '100', account_currency: 'EGP' },
    { campaign_id: '11', campaign_name: 'اعلان برج الشرق', ad_name: 'b', spend: '50.4', account_currency: 'EGP' },
    { campaign_id: '22', campaign_name: 'Sohag Buyers', ad_name: 'a', spend: '30', account_currency: 'EGP' },
    { campaign_id: '33', campaign_name: 'Zero', ad_name: 'a', spend: '0', account_currency: 'EGP' }
  ]);
  assert.deepEqual(pull.metaCampaigns, [{ id: '11', name: 'اعلان برج الشرق', spend: 150 }, { id: '22', name: 'Sohag Buyers', spend: 30 }]);
  const opts = { campaignKeys: ['sohag-buyers', 'east-tower'], adKeys: [] };
  const none = applyPull(pull, opts);
  assert.deepEqual(none.amounts, { 'sohag-buyers': 30 });
  assert.deepEqual(none.unmatched, [{ id: '11', slug: '', name: 'اعلان برج الشرق', spend: 150 }]);
  const paired = applyPull(pull, { ...opts, links: { 11: 'east-tower' } });
  assert.deepEqual(paired.amounts, { 'sohag-buyers': 30, 'east-tower': 150 });
  assert.equal(paired.matched, 2);
  assert.deepEqual(paired.linked, [{ id: '11', name: 'اعلان برج الشرق', spend: 150, target: 'east-tower' }]);
  assert.deepEqual(paired.unmatched, []);
  // a pairing to a campaign the report no longer has is ignored; a campaign that matches by name is not paired twice
  assert.equal(applyPull(pull, { ...opts, links: { 11: 'gone', 22: 'east-tower' } }).unmatched.length, 1);
  assert.deepEqual(applyPull(pull, { ...opts, links: { 22: 'east-tower' } }).amounts, { 'sohag-buyers': 30 });
  // two Meta campaigns on one CRM campaign add up
  const two = applyPull({ metaCampaigns: [{ id: '1', name: 'ا', spend: 10 }, { id: '2', name: 'ب', spend: 5 }] }, { campaignKeys: ['k'], links: { 1: 'k', 2: 'k' } });
  assert.deepEqual(two.amounts, { k: 15 });
});
