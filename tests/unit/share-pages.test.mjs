import test from 'node:test';
import assert from 'node:assert/strict';
import { SHARE_PAGES, sharePagesFor, sharePageMessage } from '../../src/utils/sharePages.js';

test('every page has a path, a label and a message', () => {
  for (const p of SHARE_PAGES) {
    assert.match(p.path, /^\/[a-z-]+$/);
    assert.ok(p.ar && p.msg);
  }
});

test('owners see the owner pages first, buyers last', () => {
  assert.equal(sharePagesFor(true)[0].for, 'seller');
  assert.notEqual(sharePagesFor(false)[0].for, 'seller');
  assert.equal(sharePagesFor(true).length, SHARE_PAGES.length);
});

test('the message greets the client and links the page with the CRM tag', () => {
  const page = SHARE_PAGES.find((p) => p.path === '/match');
  const msg = sharePageMessage(page, { name: 'محمود عبد الناصر', siteUrl: 'https://www.1lineestate.com/' });
  assert.match(msg, /^أهلاً أستاذ محمود، /);
  assert.match(msg, /https:\/\/www\.1lineestate\.com\/match\?utm_source=crm_whatsapp&utm_medium=staff_share$/);
  assert.match(sharePageMessage(page, { siteUrl: 'https://x.com' }), /^أهلاً بحضرتك، /);
});
