import { test } from 'node:test';
import assert from 'node:assert/strict';
import { handleNotify, buildMessage, parseCallMeBot, makeSenders, sendAll, FRESH_MS, maskPhone, scrubDigits } from '../../api/_notify-core.js';

const NOW = Date.parse('2026-10-02T12:00:00Z');
const lead = { name: 'أحمد', type: 'buyer', assignedTo: 'Sales Team A', source: 'sell_wizard', details: { area: 'الكوثر', budget: '2,000,000' }, phone: '01011112222', email: 'a@b.c', whatsapp: '01011112222' };

const deps = (rec, { claimed = new Set(), sent = [] } = {}) => ({
  readRecord: async () => rec,
  claimOnce: async (k, id) => { const key = `${k}/${id}`; if (claimed.has(key)) return false; claimed.add(key); return true; },
  sendAll: async (text) => { sent.push(text); return 1; },
  now: () => NOW
});

test('rejects unknown collections and malformed ids', async () => {
  for (const body of [{ kind: 'users', id: 'x' }, { kind: 'leads', id: '../x' }, { kind: 'leads' }, null, { kind: 'leads', id: 'a'.repeat(129) }]) {
    assert.equal((await handleNotify(body, deps({ data: lead, createdAtMs: NOW }), 'https://s')).status, 400);
  }
});

test('alerts a fresh record exactly once', async () => {
  const state = { claimed: new Set(), sent: [] };
  const d = deps({ data: lead, createdAtMs: NOW - 60_000 }, state);
  assert.deepEqual((await handleNotify({ kind: 'leads', id: 'L1' }, d, 'https://s')).body, { sent: 1 });
  assert.deepEqual((await handleNotify({ kind: 'leads', id: 'L1' }, d, 'https://s')).body, { skipped: 'already-sent' });
  assert.equal(state.sent.length, 1);
});

test('missing records 404; old records are not alerted (no replay of past ids)', async () => {
  assert.equal((await handleNotify({ kind: 'leads', id: 'nope' }, deps(null), 'https://s')).status, 404);
  const state = { sent: [] };
  const r = await handleNotify({ kind: 'leads', id: 'old' }, deps({ data: lead, createdAtMs: NOW - FRESH_MS - 1 }, state), 'https://s');
  assert.deepEqual(r.body, { skipped: 'stale' });
  assert.equal(state.sent.length, 0);
});

test('the alert never contains the customer\'s full phone or email', () => {
  const text = buildMessage('leads', 'L1', lead, 'https://site', { phone: '+201011112222' });
  assert.ok(!text.includes('01011112222') && !text.includes('1011112222') && !text.includes('a@b.c'));
  assert.match(text, /الموبايل: ••••222/);
  assert.match(text, /أحمد/);
  assert.match(text, /الكوثر/);
  assert.match(text, /https:\/\/site\/crm/);
});

test('sender config parsing and partial failures', async () => {
  assert.deepEqual(parseCallMeBot('+201011112222:abc, bad, 201033334444:def'), [{ phone: '201011112222', apikey: 'abc' }, { phone: '201033334444', apikey: 'def' }]);
  assert.equal(makeSenders({}).length, 0);
  const calls = [];
  const fakeFetch = async (url, opts) => { calls.push({ url, opts }); return { ok: !url.includes('def') }; };
  const senders = makeSenders({ WHATSAPP_CALLMEBOT: '201011112222:abc,201033334444:def', WHATSAPP_CLOUD_TOKEN: 't', WHATSAPP_CLOUD_PHONE_ID: 'p', WHATSAPP_CLOUD_TEMPLATE: 'new_lead', WHATSAPP_CLOUD_TO: '201055556666' }, fakeFetch);
  assert.equal(senders.length, 3);
  assert.equal(await sendAll(senders, 'hi\nthere'), 2);
  const cloud = calls.find((c) => c.url.includes('graph.facebook.com'));
  assert.ok(!JSON.parse(cloud.opts.body).template.components[0].parameters[0].text.includes('\n'));
});

test('the receipt carries reference, time received, summary and photo count', async () => {
  const sent = [];
  const rec = { ...lead, type: 'seller', notes: 'عرض بيع شقة في الكوثر بمساحة 120م² | كلموني على 0101 111 2222', details: { area: 'الكوثر', images: ['a', 'b', 'c'] } };
  const d = { ...deps({ data: rec, createdAtMs: Date.parse('2026-10-15T13:05:00Z') }, { sent }), readContact: async () => ({ phone: '+201011112999' }) };
  await handleNotify({ kind: 'leads', id: 'abc123' }, d, 'https://s');
  const text = sent[0];
  assert.match(text, /رقم الطلب: abc123/);
  assert.match(text, /وقت الاستلام: .*04:05/); // 13:05 UTC = 16:05 Cairo
  assert.match(text, /الموبايل: ••••999/);
  assert.match(text, /الملخص: عرض بيع شقة في الكوثر/);
  assert.match(text, /الصور: 3/);
  assert.ok(!/0101 111 2222|1011112999/.test(text));
});

test('a failing contact read still sends the receipt; masking and scrubbing edge cases', async () => {
  const sent = [];
  const d = { ...deps({ data: lead, createdAtMs: NOW }, { sent }), readContact: async () => { throw new Error('down'); } };
  assert.deepEqual((await handleNotify({ kind: 'leads', id: 'L9' }, d, 'https://s')).body, { sent: 1 });
  assert.equal(maskPhone(''), '');
  assert.equal(maskPhone('123'), '');
  assert.equal(maskPhone('٠١٠١١١١٢٢٢٢'.replace(/[٠-٩]/g, (c) => String(c.charCodeAt(0) - 0x660))), '••••222');
  assert.equal(scrubDigits('رقمي +20 101 111 2222 شكرا'), 'رقمي ••• شكرا');
  assert.equal(scrubDigits('مساحة 120 متر وسعر 250000000'), 'مساحة 120 متر وسعر 250000000');
  assert.equal(scrubDigits('واتس 01011112222.'), 'واتس •••.');
});

test('area and property type read as Arabic names, not stored keys', () => {
  const text = buildMessage('leads', 'S1', { name: 'منى', type: 'seller', area: 'west', details: { area: 'west', propertyType: 'villa' } }, 'https://s');
  assert.match(text, /عرض بيع: بيت أو فيلا في غرب سوهاج/);
  assert.match(text, /المنطقة: غرب سوهاج/);
  assert.ok(!/\bwest\b|\bvilla\b/.test(text));
  // An area the server does not know (added in the CRM, or typed) is shown as stored
  assert.match(buildMessage('leads', 'S2', { name: 'x', type: 'buyer', area: 'حي جديد' }, 'https://s'), /المنطقة: حي جديد/);
});

test('one address is cut off after its limit; nothing is read or sent for it', async () => {
  let reads = 0;
  const d = { ...deps({ data: lead, createdAtMs: NOW }), readRecord: async () => { reads += 1; return { data: lead, createdAtMs: NOW }; }, limitIp: (ip) => ip === 'bad' };
  assert.equal((await handleNotify({ kind: 'leads', id: 'X1' }, d, 'https://s', 'bad')).status, 429);
  assert.equal(reads, 0);
  assert.equal((await handleNotify({ kind: 'leads', id: 'X2' }, d, 'https://s', 'ok')).status, 200);
});

test('a flood sends one warning instead of one message per request', async () => {
  const sent = [];
  let calls = 0;
  const limitOverall = () => { calls += 1; return calls === 1 ? false : calls === 2 ? 'first' : true; };
  const d = { ...deps({ data: lead, createdAtMs: NOW }, { sent }), limitOverall };
  const ids = ['F1', 'F2', 'F3', 'F4'];
  const out = [];
  for (const id of ids) out.push((await handleNotify({ kind: 'leads', id }, d, 'https://s')).body);
  assert.deepEqual(out.map((b) => b.sent ?? b.skipped), [1, 'flood', 'flood', 'flood']);
  assert.equal(sent.length, 2);
  assert.match(sent[1], /طلبات كتير جداً/);
});
