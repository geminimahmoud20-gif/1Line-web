import test from 'node:test';
import assert from 'node:assert/strict';

process.env.FIREBASE_SERVICE_ACCOUNT = JSON.stringify({ client_email: 'x@y.z', private_key: 'not-a-real-key', project_id: 'p' });
delete process.env.FIRESTORE_EMULATOR_HOST;
const { POST } = await import('../../api/link-open.js');

let n = 0;
const post = (body, { origin = 'https://www.1lineestate.com', ua = 'Mozilla/5.0 (iPhone)', raw } = {}) => POST(new Request('https://www.1lineestate.com/api/link-open', {
  method: 'POST',
  headers: { 'content-type': 'application/json', 'user-agent': ua, 'x-forwarded-for': `10.2.0.${++n}`, ...(origin ? { origin } : {}) },
  body: raw ?? JSON.stringify(body)
})).then((r) => r.status);

test('a post from another site, or with no Origin, is refused', async () => {
  assert.equal(await post({ lead: 'AbC123xyz', property: 'p1' }, { origin: 'https://evil.example' }), 403);
  assert.equal(await post({ lead: 'AbC123xyz', property: 'p1' }, { origin: '' }), 403);
});

test('link-preview crawlers and bots are acknowledged and ignored', async () => {
  assert.equal(await post({ lead: 'AbC123xyz', property: 'p1' }, { ua: 'WhatsApp/2.23.20 A' }), 204);
  assert.equal(await post({ lead: 'AbC123xyz', property: 'p1' }, { ua: 'facebookexternalhit/1.1' }), 204);
});

test('a body that is not two plain ids is a 400, a phone number is not a client tag, a big body is 413', async () => {
  assert.equal(await post(null, { raw: 'not json' }), 400);
  assert.equal(await post({ lead: '01012345678', property: 'p1' }), 400);
  assert.equal(await post({ lead: 'AbC123xyz', property: '../x' }), 400);
  assert.equal(await post({ lead: 'AbC123xyz', property: 'p1', pad: 'x'.repeat(600) }), 413);
});

test('one address is limited after a burst', async () => {
  const send = () => POST(new Request('https://www.1lineestate.com/api/link-open', {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: 'https://www.1lineestate.com', 'user-agent': 'Mozilla/5.0', 'x-forwarded-for': '203.0.113.77' },
    body: JSON.stringify({ lead: '01012345678', property: 'p1' })
  })).then((r) => r.status);
  const statuses = [];
  for (let i = 0; i < 34; i += 1) statuses.push(await send());
  assert.equal(statuses[0], 400);
  assert.equal(statuses.at(-1), 429);
});
