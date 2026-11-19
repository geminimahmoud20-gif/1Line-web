import test from 'node:test';
import assert from 'node:assert/strict';
import { submitPublicLead } from '../../src/services/publicLead.js';

const res = (status, body) => ({ ok: status >= 200 && status < 300, status, json: async () => { if (body === undefined) throw new Error('not json'); return body; } });
const opts = (fetchImpl, token = 'tok') => ({ fetchImpl, getToken: async () => token });

test('a saved request returns the server id and sends the token with it', async () => {
  let sent;
  const r = await submitPublicLead({ name: 'أحمد' }, opts(async (url, init) => { sent = { url, body: JSON.parse(init.body) }; return res(200, { ok: true, id: 'abc' }); }));
  assert.deepEqual(r, { status: 'saved', id: 'abc' });
  assert.equal(sent.url, '/api/lead');
  assert.deepEqual(sent.body, { lead: { name: 'أحمد' }, token: 'tok' });
});

test('every failure is «unavailable» so the caller can save the old way', async () => {
  for (const [r, reason] of [
    [res(403, { error: 'captcha' }), 'captcha'],
    [res(429, { error: 'slow-down' }), 'slow-down'],
    [res(503, { error: 'not-configured' }), 'not-configured'],
    [res(404, undefined), 'http-404'],
    [res(200, { ok: true }), 'http-200']
  ]) {
    assert.deepEqual(await submitPublicLead({ name: 'x' }, opts(async () => r)), { status: 'unavailable', reason });
  }
  assert.deepEqual(await submitPublicLead({}, opts(async () => { throw new Error('offline'); })), { status: 'unavailable', reason: 'network' });
  assert.deepEqual(await submitPublicLead({}, { fetchImpl: null }), { status: 'unavailable', reason: 'no-fetch' });
});
