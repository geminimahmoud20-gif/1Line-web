import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { verifyChallenge, validSignature, phoneFromWaId, inboundMessages, newLeadFields, handleInbound, leadIdFor } from '../../api/_whatsapp-inbound-core.js';

const SECRET = 'app-secret';
const sign = (body) => `sha256=${createHmac('sha256', SECRET).update(body).digest('hex')}`;
const payload = (messages, contacts = [], phoneId = '111') => ({
  object: 'whatsapp_business_account',
  entry: [{ changes: [{ field: 'messages', value: { metadata: { phone_number_id: phoneId }, contacts, messages } }] }]
});
const msg = (from, body, extra = {}) => ({ from, id: `wamid.${from}`, timestamp: '1793600000', type: 'text', text: { body }, ...extra });

test("Meta's subscription check echoes the challenge only with the right token", () => {
  const q = (t) => new URLSearchParams({ 'hub.mode': 'subscribe', 'hub.verify_token': t, 'hub.challenge': '12345' });
  assert.equal(verifyChallenge(q('secret-token'), 'secret-token'), '12345');
  assert.equal(verifyChallenge(q('wrong'), 'secret-token'), null);
  assert.equal(verifyChallenge(q(''), ''), null);
});

test('only requests signed with the app secret are accepted', () => {
  assert.equal(validSignature('{"a":1}', sign('{"a":1}'), SECRET), true);
  assert.equal(validSignature('{"a":2}', sign('{"a":1}'), SECRET), false);
  assert.equal(validSignature('{"a":1}', undefined, SECRET), false);
  assert.equal(validSignature('{"a":1}', sign('{"a":1}'), ''), false);
});

test('WhatsApp ids become CRM phone numbers', () => {
  assert.equal(phoneFromWaId('201012345678'), '01012345678');
  assert.equal(phoneFromWaId('966501234567'), '+966501234567');
  assert.equal(phoneFromWaId('12'), '');
});

test('customer messages are read with name, text and site reference; statuses are ignored', () => {
  const p = payload([msg('201012345678', 'مهتم بالشقة\n\nرقم المرجع: W-7K3Q')], [{ wa_id: '201012345678', profile: { name: 'أحمد' } }]);
  p.entry[0].changes.push({ field: 'messages', value: { statuses: [{ id: 'x', status: 'read' }] } });
  const [m] = inboundMessages(p);
  assert.equal(m.phone, '01012345678');
  assert.equal(m.name, 'أحمد');
  assert.equal(m.ref, 'W-7K3Q');
  assert.equal(inboundMessages(p).length, 1);
  assert.equal(inboundMessages(p, { phoneNumberId: '999' }).length, 0, "another number's events are skipped");
});

test('a first message creates a client linked to the unit it came from', () => {
  const [m] = inboundMessages(payload([msg('201012345678', 'السلام عليكم رقم المرجع: W-7K3Q')]));
  const f = newLeadFields(m, { propertyId: 'prop-12', path: '/properties/prop-12', source: 'facebook' });
  assert.equal(f.name.stringValue, 'عميل واتساب');
  assert.equal(f.status.stringValue, 'new');
  assert.equal(f.source.stringValue, 'whatsapp_site');
  assert.equal(f.propertyId.stringValue, 'prop-12');
  assert.equal(f.utmSource.stringValue, 'facebook');
  assert.match(f.notes.stringValue, /وحدة #PROP-12/);
  assert.equal('phone' in f, false, 'the phone goes to lead_contacts only');
});

test('handleInbound creates new clients, updates known ones and links the site tap', async () => {
  const calls = [];
  const known = new Set(['wa-201099999999']);
  const deps = {
    appSecret: SECRET,
    readIntent: async (ref) => (ref === 'W-7K3Q' ? { propertyId: 'prop-1', path: '/properties/prop-1', status: 'open' } : null),
    createLead: async (id, fields, contact) => { calls.push(['create', id, contact.phone.stringValue]); return known.has(id) ? 'exists' : 'created'; },
    updateLead: async (id) => { calls.push(['update', id]); return true; },
    linkIntent: async (ref, id) => { calls.push(['link', ref, id]); return true; }
  };
  const body = JSON.stringify(payload([msg('201012345678', 'رقم المرجع: W-7K3Q'), msg('201099999999', 'تاني')]));
  const res = await handleInbound(body, sign(body), deps);
  assert.equal(res.status, 200);
  assert.deepEqual(calls, [
    ['create', 'wa-201012345678', '01012345678'],
    ['link', 'W-7K3Q', 'wa-201012345678'],
    ['create', 'wa-201099999999', '01099999999'],
    ['update', 'wa-201099999999']
  ]);
  assert.equal((await handleInbound(body, 'sha256=bad', deps)).status, 401);
  assert.equal(leadIdFor({ waId: '201012345678' }), 'wa-201012345678');
});
