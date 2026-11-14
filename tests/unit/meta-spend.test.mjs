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
