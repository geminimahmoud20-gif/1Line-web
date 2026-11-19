import test from 'node:test';
import assert from 'node:assert/strict';

process.env.FIREBASE_SERVICE_ACCOUNT = JSON.stringify({ client_email: 'x@y.z', private_key: 'not-a-real-key', project_id: 'p' });
delete process.env.TURNSTILE_SECRET_KEY;
const { POST, GET } = await import('../../api/lead.js');

let n = 0;
const post = (body, { origin = 'https://www.1lineestate.com', raw } = {}) => POST(new Request('https://www.1lineestate.com/api/lead', {
  method: 'POST',
  headers: { 'content-type': 'application/json', 'x-forwarded-for': `10.0.0.${++n}`, ...(origin ? { origin } : {}) },
  body: raw ?? JSON.stringify(body)
}));

test('the health check says whether the route and Turnstile are configured', async () => {
  const data = await GET().json();
  assert.deepEqual(data, { ok: true, turnstile: false });
});

test('a post from another site, or with no Origin, is refused', async () => {
  assert.equal((await post({ lead: {} }, { origin: 'https://evil.example' })).status, 403);
  assert.equal((await post({ lead: {} }, { origin: '' })).status, 403);
});

test('a malformed body or an invalid request is a 400 the browser will not retry', async () => {
  assert.equal((await post(null, { raw: 'not json' })).status, 400);
  const bad = await post({ lead: { name: 'أحمد' } });
  assert.equal(bad.status, 400);
  assert.equal((await bad.json()).error, 'bad-phone');
});

test('one address is limited after a few requests', async () => {
  const send = () => POST(new Request('https://www.1lineestate.com/api/lead', {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: 'https://www.1lineestate.com', 'x-forwarded-for': '203.0.113.9' },
    body: JSON.stringify({ lead: { name: 'أحمد' } })
  }));
  const statuses = [];
  for (let i = 0; i < 8; i += 1) statuses.push((await send()).status);
  assert.equal(statuses[0], 400);
  assert.equal(statuses.at(-1), 429);
});
