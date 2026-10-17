import test from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeIntent, handleIntent, intentFields } from '../../api/_contact-intent-core.js';
import { makeRef, whatsAppTarget, tagWhatsAppUrl } from '../../src/utils/contactIntent.js';

test('reference codes are short and unambiguous; the prefilled text gets one, once', () => {
  const ref = makeRef();
  assert.match(ref, /^W-[2-9A-HJ-NP-Z]{4}$/);
  assert.equal(whatsAppTarget('https://wa.me/201223222956?text=hi'), '201223222956');
  assert.equal(whatsAppTarget('https://api.whatsapp.com/send?phone=201223222956&text=x'), '201223222956');
  assert.equal(whatsAppTarget('https://wa.me/?text=share'), '');
  const tagged = tagWhatsAppUrl('https://wa.me/201223222956?text=' + encodeURIComponent('أريد الاستفسار'), 'W-7K3Q');
  assert.match(new URL(tagged).searchParams.get('text'), /أريد الاستفسار\n\nرقم المرجع: W-7K3Q$/);
  assert.equal(tagWhatsAppUrl(tagged, 'W-ZZZZ'), tagged);
  assert.equal(new URL(tagWhatsAppUrl('https://wa.me/201223222956', 'W-7K3Q')).searchParams.get('text'), 'رقم المرجع: W-7K3Q');
});

test('the server keeps only the reference, page, unit and source; no personal data gets through', () => {
  const clean = sanitizeIntent({ ref: 'W-7K3Q', path: '/properties/p1', propertyId: 'p1', source: 'facebook', device: 'mobile', phone: '0100', name: 'x', message: 'hello' });
  assert.deepEqual(clean, { ref: 'W-7K3Q', channel: 'whatsapp', path: '/properties/p1', propertyId: 'p1', source: 'facebook', placement: '', device: 'mobile' });
  assert.equal(sanitizeIntent({ ref: 'W-0O1I' }), null);
  assert.equal(sanitizeIntent({ ref: 'x' }), null);
  assert.equal(sanitizeIntent({ ref: 'W-7K3Q', path: 'javascript:alert(1)' }).path, '/');
  assert.equal(intentFields(clean, 0).status.stringValue, 'open');
});

test('handleIntent: rate limits before parsing, rejects junk, writes once', async () => {
  const writes = [];
  const deps = (over = {}) => ({ limitIp: () => false, limitOverall: () => false, write: async (i) => { writes.push(i); return true; }, ...over });
  assert.equal(await handleIntent('{"ref":"W-7K3Q"}', '1.1.1.1', deps({ limitIp: () => true })), 429);
  assert.equal(writes.length, 0);
  assert.equal(await handleIntent('not json', '1.1.1.1', deps()), 400);
  assert.equal(await handleIntent('x'.repeat(2000), '1.1.1.1', deps()), 413);
  assert.equal(await handleIntent('{"ref":"W-7K3Q","path":"/"}', '1.1.1.1', deps()), 204);
  assert.equal(writes.length, 1);
  assert.equal(await handleIntent('{"ref":"W-7K3Q"}', '1.1.1.1', deps({ write: async () => false })), 502);
});
