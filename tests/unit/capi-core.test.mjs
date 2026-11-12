import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCapiEvent, pickPixelId } from '../../api/_capi-core.js';

const NOW = Date.parse('2026-11-12T12:00:00Z');
const ctx = { ip: '41.1.2.3', ua: 'Mozilla/5.0', now: NOW, siteHosts: ['www.1lineestate.com'] };
const base = { event_name: 'Lead', event_id: 'abcdef1234567890', event_source_url: 'https://www.1lineestate.com/sell?utm_source=facebook&phone=0100', fbp: 'fb.1.1700000000000.1234567890', fbc: 'fb.1.1700000000000.AbCdEf123456' };

test('a lead becomes a website event with the visitor address, no query string and no personal data', () => {
  const e = buildCapiEvent({ ...base, custom_data: { content_category: 'sell', name: 'Ali', phone: '0100' } }, ctx);
  assert.equal(e.event_name, 'Lead');
  assert.equal(e.event_time, Math.floor(NOW / 1000));
  assert.equal(e.event_id, base.event_id);
  assert.equal(e.action_source, 'website');
  assert.equal(e.event_source_url, 'https://www.1lineestate.com/sell');
  assert.deepEqual(e.user_data, { client_user_agent: 'Mozilla/5.0', client_ip_address: '41.1.2.3', fbp: base.fbp, fbc: base.fbc });
  assert.deepEqual(e.custom_data, { content_category: 'sell' });
});

test('only Lead, Schedule and Contact are forwarded', () => {
  assert.equal(buildCapiEvent({ ...base, event_name: 'PageView' }, ctx), null);
  assert.equal(buildCapiEvent({ ...base, event_name: 'Purchase' }, ctx), null);
  assert.ok(buildCapiEvent({ ...base, event_name: 'Schedule' }, ctx));
  assert.ok(buildCapiEvent({ ...base, event_name: 'Contact', custom_data: { channel: 'phone', placement: 'unit page' } }, ctx).custom_data.channel === 'phone');
});

test('bad ids, other sites, the CRM and account pages are refused', () => {
  assert.equal(buildCapiEvent({ ...base, event_id: 'x' }, ctx), null);
  assert.equal(buildCapiEvent({ ...base, event_source_url: 'https://evil.example/sell' }, ctx), null);
  assert.equal(buildCapiEvent({ ...base, event_source_url: 'https://www.1lineestate.com/crm' }, ctx), null);
  assert.equal(buildCapiEvent({ ...base, event_source_url: 'https://www.1lineestate.com/my-account/orders' }, ctx), null);
  assert.equal(buildCapiEvent({ ...base, event_source_url: 'javascript:alert(1)' }, ctx), null);
  assert.equal(buildCapiEvent(null, ctx), null);
});

test('malformed browser cookies are dropped, not forwarded', () => {
  const e = buildCapiEvent({ ...base, fbp: 'x', fbc: '<script>' }, ctx);
  assert.equal(e.user_data.fbp, undefined);
  assert.equal(e.user_data.fbc, undefined);
});

test('the server Pixel ID wins over the one the browser sends', () => {
  assert.equal(pickPixelId('123456789012345', '999999999999999'), '123456789012345');
  assert.equal(pickPixelId('', '999999999999999'), '999999999999999');
  assert.equal(pickPixelId('', 'abc'), '');
});
