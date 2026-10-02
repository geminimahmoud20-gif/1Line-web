import { test } from 'node:test';
import assert from 'node:assert/strict';
import { handleNotify, buildMessage, parseCallMeBot, makeSenders, sendAll, FRESH_MS } from '../../api/_notify-core.js';

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

test('the alert never contains the customer\'s phone or email', () => {
  const text = buildMessage('leads', 'L1', lead, 'https://site');
  assert.ok(!text.includes('01011112222') && !text.includes('a@b.c'));
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
